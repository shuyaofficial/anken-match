import { useState } from 'react'
import { loadSettings, saveSettings } from '../../lib/settings'
import { DEFAULT_MODEL } from '../../lib/types'

interface ModelOption {
  id: string
  label: string
}

const MODEL_OPTIONS: ModelOption[] = [
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5（標準・バランス型）' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5（高速・低コスト）' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8（最高品質・高コスト）' },
]

const NOTICE_TIMEOUT_MS = 2500

export default function SettingsView() {
  const initial = loadSettings()
  const [apiKeyInput, setApiKeyInput] = useState(initial.anthropicApiKey)
  const [model, setModelState] = useState(initial.model || DEFAULT_MODEL)
  const [gmailClientIdInput, setGmailClientIdInput] = useState(initial.gmailClientId)
  const [notice, setNotice] = useState('')

  function handleSave(): void {
    saveSettings({
      anthropicApiKey: apiKeyInput.trim(),
      model,
      gmailClientId: gmailClientIdInput.trim(),
    })
    setNotice('保存しました。')
    window.setTimeout(() => setNotice(''), NOTICE_TIMEOUT_MS)
  }

  return (
    <div>
      <section className="section">
        <h2>Anthropic APIキー</h2>
        <div className="card">
          <p className="note" style={{ marginTop: 0 }}>
            案件抽出・マッチングにはあなた自身のAnthropic APIキーが必要です（
            <a href="https://platform.claude.com/" target="_blank" rel="noopener noreferrer">
              platform.claude.com
            </a>
            で発行）。キーは<strong>この端末のブラウザ内にのみ保存されます</strong>。
          </p>
          <input
            type="password"
            value={apiKeyInput}
            placeholder="sk-ant-..."
            autoComplete="off"
            onChange={(e) => setApiKeyInput(e.target.value)}
            style={{ width: '100%', maxWidth: '480px' }}
          />
        </div>
      </section>

      <section className="section">
        <h2>モデル</h2>
        <div className="card">
          <select value={model} onChange={(e) => setModelState(e.target.value)}>
            {MODEL_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="note">
            普段はSonnet、コストを抑えたいときはHaiku、難しい案件の判断にはOpusがおすすめです。
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Gmail連携</h2>
        <div className="card">
          <p className="note" style={{ marginTop: 0 }}>
            案件メールの自動取込にはGmail OAuthのClient IDが必要です（未設定の場合は連携機能が非活性になります）。
          </p>
          <input
            type="text"
            value={gmailClientIdInput}
            placeholder="xxxxxxxx.apps.googleusercontent.com"
            autoComplete="off"
            onChange={(e) => setGmailClientIdInput(e.target.value)}
            style={{ width: '100%', maxWidth: '480px' }}
          />
          <details style={{ marginTop: 'var(--space-sm)' }}>
            <summary className="note" style={{ cursor: 'pointer' }}>
              Client IDの取得手順（Google Cloud Console）
            </summary>
            <ol className="note" style={{ marginTop: 'var(--space-xs)', paddingLeft: '1.25rem' }}>
              <li>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Cloud Console
                </a>
                でプロジェクトを作成し、Gmail API を有効化します。
              </li>
              <li>
                「OAuth 同意画面」を設定し、テストユーザーに自分のGmailアドレスを追加します。
              </li>
              <li>
                「認証情報」→「OAuth クライアント ID を作成」→ アプリの種類は
                <strong>ウェブアプリケーション</strong>を選びます。
              </li>
              <li>
                「承認済みの JavaScript 生成元」にこのアプリのURL（例:
                <code>{typeof window !== 'undefined' ? window.location.origin : ''}</code>
                ）を追加します。
              </li>
              <li>
                発行された末尾 <code>.apps.googleusercontent.com</code> のClient IDを上の欄に貼り付けます。
              </li>
            </ol>
            <p className="note" style={{ marginTop: 'var(--space-xs)' }}>
              注意: GitHub Pages（username.github.io）で公開する場合、同じアカウント配下の他のPagesサイトとオリジンを共有します。Client
              IDの利用範囲に注意してください。
            </p>
          </details>
        </div>
      </section>

      <div
        style={{
          marginTop: 'var(--space-lg)',
          display: 'flex',
          gap: 'var(--space-sm)',
          alignItems: 'center',
        }}
      >
        <button type="button" className="btn" onClick={handleSave}>
          設定を保存
        </button>
        {notice && <span className="note">{notice}</span>}
      </div>
    </div>
  )
}
