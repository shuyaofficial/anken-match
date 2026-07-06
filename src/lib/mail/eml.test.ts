import { describe, expect, it } from 'vitest'
import { parseEmlFile } from './eml'

/** テスト用: 文字列(eml全文)をArrayBufferに変換する */
function toArrayBuffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

describe('parseEmlFile', () => {
  it('UTF-8素のemlから件名・送信者・本文・受信日時を取り出す', async () => {
    const eml = [
      'From: 山田太郎 <yamada@example.com>',
      'To: recipient@example.com',
      'Subject: AWSインフラエンジニア募集のご案内',
      'Date: Mon, 15 Jun 2026 10:30:00 +0900',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'お世話になっております。',
      '下記案件のご紹介です。',
      '',
    ].join('\r\n')

    const result = await parseEmlFile(toArrayBuffer(eml), 'mail1.eml')

    expect(result.source).toBe('file')
    expect(result.subject).toBe('AWSインフラエンジニア募集のご案内')
    expect(result.from).toBe('山田太郎 <yamada@example.com>')
    expect(result.bodyText).toContain('お世話になっております。')
    expect(result.bodyText).toContain('下記案件のご紹介です。')
    expect(result.receivedAt).toBe(new Date('Mon, 15 Jun 2026 10:30:00 +0900').toISOString())
  })

  it('base64エンコードされた本文をデコードして取り出す', async () => {
    const bodyText = 'こんにちは、案件のご案内です。\n\nAWSの経験者を募集しています。'
    const base64Body = Buffer.from(bodyText, 'utf-8').toString('base64')
    const eml = [
      'From: 佐藤花子 <sato@example.com>',
      'To: recipient@example.com',
      'Subject: 案件のご案内',
      'Date: Tue, 16 Jun 2026 09:00:00 +0900',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Body,
      '',
    ].join('\r\n')

    const result = await parseEmlFile(toArrayBuffer(eml), 'mail2.eml')

    expect(result.bodyText).toContain('こんにちは、案件のご案内です。')
    expect(result.bodyText).toContain('AWSの経験者を募集しています。')
  })

  it('件名がMIME encoded-word（Base64）のemlを正しくデコードする', async () => {
    const subjectRaw = '【SES】AWSインフラエンジニア募集'
    const encodedSubject = `=?UTF-8?B?${Buffer.from(subjectRaw, 'utf-8').toString('base64')}?=`
    const eml = [
      'From: recruiter@example.com',
      'To: recipient@example.com',
      `Subject: ${encodedSubject}`,
      'Date: Wed, 17 Jun 2026 12:00:00 +0900',
      'Content-Type: text/plain; charset=utf-8',
      '',
      '案件詳細は添付の通りです。',
      '',
    ].join('\r\n')

    const result = await parseEmlFile(toArrayBuffer(eml), 'mail3.eml')

    expect(result.subject).toBe(subjectRaw)
    expect(result.from).toBe('recruiter@example.com')
  })

  it('件名がMIME encoded-word（Quoted-Printable）のemlを正しくデコードする', async () => {
    const eml = [
      'From: recruiter@example.com',
      'To: recipient@example.com',
      'Subject: =?ISO-2022-JP?Q?=1B$B0FA83+H/E7NN=1B(B?=',
      'Date: Thu, 18 Jun 2026 12:00:00 +0900',
      'Content-Type: text/plain; charset=iso-2022-jp',
      '',
      '案件のご案内です。',
      '',
    ].join('\r\n')

    const result = await parseEmlFile(toArrayBuffer(eml), 'mail4.eml')

    expect(result.subject).toBeDefined()
    expect(result.subject).not.toContain('=?ISO-2022-JP')
  })

  it('subjectが空の場合はファイル名から拡張子を除いたものを使う', async () => {
    const eml = [
      'From: recruiter@example.com',
      'To: recipient@example.com',
      'Date: Fri, 19 Jun 2026 12:00:00 +0900',
      'Content-Type: text/plain; charset=utf-8',
      '',
      '本文のみのメールです。',
      '',
    ].join('\r\n')

    const result = await parseEmlFile(toArrayBuffer(eml), '無題案件.eml')

    expect(result.subject).toBe('無題案件')
  })

  it('textパートが無くhtmlのみの場合はタグを除去してテキスト化する', async () => {
    const eml = [
      'From: recruiter@example.com',
      'To: recipient@example.com',
      'Subject: HTML案件メール',
      'Date: Sat, 20 Jun 2026 12:00:00 +0900',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<html><body><p>案件のご紹介です。</p><p>AWS経験者募集。</p></body></html>',
      '',
    ].join('\r\n')

    const result = await parseEmlFile(toArrayBuffer(eml), 'mail5.eml')

    expect(result.bodyText).not.toContain('<p>')
    expect(result.bodyText).toContain('案件のご紹介です。')
    expect(result.bodyText).toContain('AWS経験者募集。')
  })
})
