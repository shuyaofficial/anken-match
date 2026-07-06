import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodeBase64Url, fetchGmailMessage, searchGmailMessages, GmailError } from './gmail'

/** バイト列を base64url 文字列にする（Gmail API の raw/data 形式を模す） */
function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return Buffer.from(binary, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** RFC822文字列を base64url 化する（messages.get?format=raw の raw フィールド相当） */
function rawEmailToBase64Url(rfc822: string): string {
  return toBase64Url(new TextEncoder().encode(rfc822))
}

/** fetch のモックを差し込む。ok/status/jsonを制御する。 */
function stubFetchOnce(payload: unknown, init?: { ok?: boolean; status?: number }): void {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: () => Promise.resolve(payload),
  })
  vi.stubGlobal('fetch', fetchMock)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('decodeBase64Url', () => {
  it('パディング無しのbase64urlをデコードできる', () => {
    // "Man" -> base64 "TWFu"（パディング不要）
    const decoded = decodeBase64Url('TWFu')
    expect(new TextDecoder().decode(decoded)).toBe('Man')
  })

  it('パディングが必要な長さでも正しくデコードする', () => {
    // "M" -> "TQ==", "Ma" -> "TWE="（本来2/1個の=が付く）を、=無しでも復元する
    expect(new TextDecoder().decode(decodeBase64Url('TQ'))).toBe('M')
    expect(new TextDecoder().decode(decodeBase64Url('TWE'))).toBe('Ma')
  })

  it('URL安全文字(-_)を含むbase64urlをデコードする', () => {
    // 0xFB 0xFF 0xBF は標準base64で "+/+/" 相当、base64urlでは "-_-_"
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf])
    const encoded = toBase64Url(bytes)
    expect(encoded).toContain('-')
    expect(encoded).toContain('_')
    expect(Array.from(decodeBase64Url(encoded))).toEqual([0xfb, 0xff, 0xbf])
  })

  it('日本語UTF-8バイト列を往復できる', () => {
    const original = 'こんにちは、案件のご案内です。'
    const bytes = new TextEncoder().encode(original)
    const encoded = toBase64Url(bytes)
    const decoded = new TextDecoder().decode(decodeBase64Url(encoded))
    expect(decoded).toBe(original)
  })
})

describe('fetchGmailMessage', () => {
  it('UTF-8素のRFC822メッセージをIncomingMail(source: gmail)に変換する', async () => {
    const rfc822 = [
      'From: 山田太郎 <yamada@example.com>',
      'To: me@example.com',
      'Subject: AWSインフラエンジニア募集のご案内',
      'Date: Mon, 15 Jun 2026 10:30:00 +0900',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'お世話になっております。',
      '下記案件のご紹介です。',
      '',
    ].join('\r\n')
    stubFetchOnce({ raw: rawEmailToBase64Url(rfc822) })

    const result = await fetchGmailMessage('token-xyz', 'msg-1')

    expect(result.source).toBe('gmail')
    expect(result.subject).toBe('AWSインフラエンジニア募集のご案内')
    expect(result.from).toBe('山田太郎 <yamada@example.com>')
    expect(result.bodyText).toContain('お世話になっております。')
    expect(result.bodyText).toContain('下記案件のご紹介です。')
    expect(result.receivedAt).toBe(new Date('Mon, 15 Jun 2026 10:30:00 +0900').toISOString())
  })

  it('base64エンコード本文のメッセージをデコードして取り込む', async () => {
    const bodyText = 'こんにちは、案件のご案内です。\n\nAWSの経験者を募集しています。'
    const base64Body = Buffer.from(bodyText, 'utf-8').toString('base64')
    const rfc822 = [
      'From: 佐藤花子 <sato@example.com>',
      'To: me@example.com',
      'Subject: 案件のご案内',
      'Date: Tue, 16 Jun 2026 09:00:00 +0900',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Body,
      '',
    ].join('\r\n')
    stubFetchOnce({ raw: rawEmailToBase64Url(rfc822) })

    const result = await fetchGmailMessage('token-xyz', 'msg-2')

    expect(result.source).toBe('gmail')
    expect(result.bodyText).toContain('こんにちは、案件のご案内です。')
    expect(result.bodyText).toContain('AWSの経験者を募集しています。')
  })

  it('件名がISO-2022-JPのMIME encoded-wordでもデコードされる', async () => {
    // ISO-2022-JP encoded-word（"案件募集"相当のJIS X 0208バイト列）
    const encodedSubject = '=?ISO-2022-JP?B?GyRCMEZBOEJnPzghKhsoQg==?='
    const rfc822 = [
      'From: recruiter@example.com',
      'To: me@example.com',
      `Subject: ${encodedSubject}`,
      'Date: Wed, 17 Jun 2026 12:00:00 +0900',
      'Content-Type: text/plain; charset=iso-2022-jp',
      '',
      '案件詳細は添付の通りです。',
      '',
    ].join('\r\n')
    stubFetchOnce({ raw: rawEmailToBase64Url(rfc822) })

    const result = await fetchGmailMessage('token-xyz', 'msg-3')

    expect(result.source).toBe('gmail')
    expect(result.subject).toBeDefined()
    expect(result.subject).not.toContain('=?ISO-2022-JP')
    expect(result.from).toBe('recruiter@example.com')
  })

  it('raw が欠けている場合は GmailError を投げる', async () => {
    stubFetchOnce({})
    await expect(fetchGmailMessage('token-xyz', 'msg-x')).rejects.toBeInstanceOf(GmailError)
  })

  it('401応答では再認証を促す日本語メッセージを返す（トークンは含まない）', async () => {
    stubFetchOnce({}, { ok: false, status: 401 })
    await expect(fetchGmailMessage('secret-token', 'msg-x')).rejects.toThrow(GmailError)
    await expect(fetchGmailMessage('secret-token', 'msg-x')).rejects.toThrow('認証が切れました')
    await expect(fetchGmailMessage('secret-token', 'msg-x')).rejects.not.toThrow('secret-token')
  })
})

describe('searchGmailMessages', () => {
  it('レスポンスからメッセージIDの配列を抽出する', async () => {
    stubFetchOnce({ messages: [{ id: 'a1' }, { id: 'b2' }, { id: 'c3' }] })

    const ids = await searchGmailMessages('token-xyz', 'newer_than:30d', 25)

    expect(ids).toEqual(['a1', 'b2', 'c3'])
  })

  it('maxResults を超える件数は切り詰める', async () => {
    stubFetchOnce({ messages: [{ id: 'a1' }, { id: 'b2' }, { id: 'c3' }] })

    const ids = await searchGmailMessages('token-xyz', 'q', 2)

    expect(ids).toEqual(['a1', 'b2'])
  })

  it('messages が無い（0件）場合は空配列を返す', async () => {
    stubFetchOnce({})

    const ids = await searchGmailMessages('token-xyz', 'q', 25)

    expect(ids).toEqual([])
  })

  it('403応答では API有効化/権限を促す日本語メッセージを返す', async () => {
    stubFetchOnce({}, { ok: false, status: 403 })
    await expect(searchGmailMessages('token-xyz', 'q', 25)).rejects.toThrow('アクセスが拒否')
  })

  it('429応答では待機を促す日本語メッセージを返す', async () => {
    stubFetchOnce({}, { ok: false, status: 429 })
    await expect(searchGmailMessages('token-xyz', 'q', 25)).rejects.toThrow('しばらく待って')
  })
})
