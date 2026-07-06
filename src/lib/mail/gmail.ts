// Gmail API 連携（BYOK・ブラウザ完結）。
// - 認可: Google Identity Services (GIS) の token client。scope は gmail.readonly のみ。
// - アクセストークンはメモリ上でのみ扱う（呼び出し側が state に持つ想定・永続化禁止）。
// - メール取得は messages.get?format=raw の RFC822 生メッセージを postal-mime に渡し、
//   .eml と同じ変換経路（eml.ts の toIncomingMail）に乗せる。文字コード処理は自作しない。
// - トークン・APIキーはログ／例外メッセージに含めない。

import PostalMime from 'postal-mime'
import type { IncomingMail } from './index'
import { toIncomingMail } from './eml'

const GIS_SRC = 'https://accounts.google.com/gsi/client'
const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'

/** Gmail連携で発生したエラー（利用者向け日本語メッセージを持つ） */
export class GmailError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'GmailError'
  }
}

// --- GIS token client の最小 ambient 型（@types 追加を避けるため自前定義） ---

interface GisTokenResponse {
  access_token?: string
  error?: string
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

interface GisTokenClientConfig {
  client_id: string
  scope: string
  callback: (response: GisTokenResponse) => void
  error_callback?: (error: { type?: string; message?: string }) => void
}

interface GoogleAccountsOAuth2 {
  initTokenClient: (config: GisTokenClientConfig) => GisTokenClient
}

interface GoogleNamespace {
  accounts: { oauth2: GoogleAccountsOAuth2 }
}

declare global {
  interface Window {
    google?: GoogleNamespace
  }
}

// --- GISスクリプトの動的ロード（1回のみ） ---

let gisScriptPromise: Promise<void> | null = null

/** GISスクリプトを一度だけ動的ロードする。失敗時は GmailError。 */
export function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (gisScriptPromise) return gisScriptPromise

  gisScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new GmailError('Google認証スクリプトの読み込みに失敗しました。')),
      )
      return
    }
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      gisScriptPromise = null
      reject(new GmailError('Google認証スクリプトの読み込みに失敗しました。'))
    }
    document.head.appendChild(script)
  })
  return gisScriptPromise
}

/**
 * token client でアクセストークンを取得する。
 * ユーザー操作起点（クリック等）から呼ぶ前提。取得したトークンはメモリでのみ扱うこと。
 */
export async function requestGmailToken(clientId: string): Promise<string> {
  await loadGisScript()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) {
    throw new GmailError('Google認証を初期化できませんでした。')
  }

  return new Promise<string>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: GMAIL_SCOPE,
      callback: (response) => {
        if (response.access_token) {
          resolve(response.access_token)
          return
        }
        reject(new GmailError('Gmailへのアクセスが許可されませんでした。'))
      },
      error_callback: () => {
        reject(new GmailError('認証がキャンセルされました。もう一度お試しください。'))
      },
    })
    client.requestAccessToken()
  })
}

// --- Gmail REST API ---

/** HTTPステータスに応じた利用者向け日本語メッセージ（トークンは含めない）。 */
function messageForStatus(status: number): string {
  if (status === 401) return 'Gmailの認証が切れました。もう一度接続してください。'
  if (status === 403) return 'Gmail APIへのアクセスが拒否されました。API有効化と権限を確認してください。'
  if (status === 429) return 'Gmailへのリクエストが多すぎます。しばらく待ってから再試行してください。'
  return `Gmailの取得に失敗しました（${String(status)}）。`
}

async function gmailFetch(url: string, token: string): Promise<Response> {
  let response: Response
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new GmailError('Gmailに接続できませんでした。ネットワーク接続を確認してください。')
  }
  if (!response.ok) {
    throw new GmailError(messageForStatus(response.status))
  }
  return response
}

interface MessageListItem {
  id: string
}

interface MessageListResponse {
  messages?: MessageListItem[]
  nextPageToken?: string
}

/**
 * users.messages.list で検索条件に合うメッセージIDを最大 maxResults 件まで取得する。
 * ページングは maxResults に達するまで nextPageToken をたどる。
 */
export async function searchGmailMessages(
  token: string,
  query: string,
  maxResults: number,
): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined

  do {
    const remaining = maxResults - ids.length
    const params = new URLSearchParams({
      q: query,
      maxResults: String(Math.min(remaining, 100)),
    })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await gmailFetch(`${GMAIL_API_BASE}?${params.toString()}`, token)
    const data = (await response.json()) as MessageListResponse
    for (const message of data.messages ?? []) {
      ids.push(message.id)
    }
    pageToken = data.nextPageToken
  } while (pageToken && ids.length < maxResults)

  return ids.slice(0, maxResults)
}

/**
 * base64url 文字列を Uint8Array にデコードする（純関数・テスト対象）。
 * URL安全文字（-_）を標準base64（+/）に戻し、パディングを補ってから atob する。
 */
export function decodeBase64Url(data: string): Uint8Array {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

interface RawMessageResponse {
  raw?: string
}

/**
 * users.messages.get?format=raw で RFC822 生メッセージを取得し、
 * base64url→Uint8Array→postal-mime を経て IncomingMail（source: 'gmail'）に変換する。
 * 文字コード判定・MIMEデコードは postal-mime に委譲する（.eml と同じ経路）。
 */
export async function fetchGmailMessage(token: string, id: string): Promise<IncomingMail> {
  const params = new URLSearchParams({ format: 'raw' })
  const response = await gmailFetch(
    `${GMAIL_API_BASE}/${encodeURIComponent(id)}?${params.toString()}`,
    token,
  )
  const data = (await response.json()) as RawMessageResponse
  if (!data.raw) {
    throw new GmailError('Gmailメッセージの本文を取得できませんでした。')
  }
  const bytes = decodeBase64Url(data.raw)
  const email = await PostalMime.parse(bytes)
  // 重複取込（同一メールの再取得）はこのPhaseでは未対応。将来はGmail messageId等で重複排除する。
  return toIncomingMail(email, 'gmail')
}
