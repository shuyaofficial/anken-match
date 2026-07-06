import { DEFAULT_MODEL, type AppSettings } from './types'

// 設定は localStorage のみに保存する（この端末のブラウザから外に出ない）。
// APIキーは BYOK 方式: 静的ホスティングのためサーバー保管という選択肢がなく、
// 端末ローカル保存とのトレードオフを設定画面に明記している。

const KEY_API_KEY = 'ankenMatch.anthropicApiKey'
const KEY_MODEL = 'ankenMatch.model'
const KEY_GMAIL_CLIENT_ID = 'ankenMatch.gmailClientId'

function readString(key: string): string {
  return localStorage.getItem(key) ?? ''
}

function writeString(key: string, value: string): void {
  if (value) {
    localStorage.setItem(key, value)
  } else {
    localStorage.removeItem(key)
  }
}

/** 現在保存されている設定を読み込む。未保存項目は空文字/既定値。 */
export function loadSettings(): AppSettings {
  return {
    anthropicApiKey: readString(KEY_API_KEY),
    model: readString(KEY_MODEL) || DEFAULT_MODEL,
    gmailClientId: readString(KEY_GMAIL_CLIENT_ID),
  }
}

/** 設定一式を localStorage に保存する（常に新しい設定オブジェクトを受け取る）。 */
export function saveSettings(settings: AppSettings): void {
  writeString(KEY_API_KEY, settings.anthropicApiKey)
  writeString(KEY_MODEL, settings.model || DEFAULT_MODEL)
  writeString(KEY_GMAIL_CLIENT_ID, settings.gmailClientId)
}
