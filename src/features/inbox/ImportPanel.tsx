// 案件メールの取込UI。貼り付け／.eml・.txtファイルのD&D・選択の3経路を提供する。

import { useRef, useState } from 'react'
import { parseEmlFile } from '../../lib/mail/eml'
import { fromPastedText, fromTextFile, type IncomingMail } from '../../lib/mail'
import { fetchGmailMessage, requestGmailToken, searchGmailMessages } from '../../lib/mail/gmail'
import { toUserErrorMessage } from '../../lib/anthropic'

type Props = {
  onImport: (mails: IncomingMail[]) => void
  /** Gmail連携用 OAuth Client ID（未設定なら連携UIは非活性・設定への導線を出す） */
  gmailClientId?: string
  /** 設定画面を開く（Client ID未設定時の導線） */
  onOpenSettings?: () => void
}

const DEFAULT_GMAIL_QUERY = 'newer_than:30d'
const DEFAULT_GMAIL_MAX = 25
const GMAIL_MAX_LIMIT = 50

/** ファイル1件をIncomingMailに変換する。.eml/.txt以外は無視する */
async function fileToIncomingMail(file: File): Promise<IncomingMail | undefined> {
  if (file.name.toLowerCase().endsWith('.eml')) {
    const buffer = await file.arrayBuffer()
    return parseEmlFile(buffer, file.name)
  }
  if (file.name.toLowerCase().endsWith('.txt')) {
    const text = await file.text()
    return fromTextFile(file.name, text)
  }
  return undefined
}

export default function ImportPanel({ onImport, gmailClientId, onOpenSettings }: Props) {
  const [pastedText, setPastedText] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [gmailQuery, setGmailQuery] = useState(DEFAULT_GMAIL_QUERY)
  const [gmailMax, setGmailMax] = useState(DEFAULT_GMAIL_MAX)
  const [gmailStatus, setGmailStatus] = useState('')
  const [gmailError, setGmailError] = useState('')
  const [isGmailBusy, setIsGmailBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasGmailClientId = (gmailClientId ?? '').trim() !== ''

  async function handleGmailImport(): Promise<void> {
    const clientId = (gmailClientId ?? '').trim()
    if (clientId === '') return
    setGmailError('')
    setGmailStatus('')
    setIsGmailBusy(true)
    try {
      const token = await requestGmailToken(clientId)
      const ids = await searchGmailMessages(token, gmailQuery.trim(), gmailMax)
      if (ids.length === 0) {
        setGmailStatus('条件に一致するメールは見つかりませんでした。')
        return
      }
      setGmailStatus(`Gmailから${String(ids.length)}件を取得しています…`)
      // 重複取込（同一メールの再取得）はこのPhaseでは未対応。将来はGmail messageIdで重複排除する。
      const settled = await Promise.allSettled(ids.map((id) => fetchGmailMessage(token, id)))
      const mails = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []))
      const failedCount = settled.length - mails.length

      if (mails.length === 0) {
        setGmailStatus('')
        setGmailError('Gmailメッセージの取得にすべて失敗しました。')
        return
      }

      onImport(mails)
      const suffix = failedCount > 0 ? `（${String(failedCount)}件の取得に失敗しました）` : ''
      setGmailStatus(`Gmailから${String(mails.length)}件を取り込みました。${suffix}`)
    } catch (err) {
      setGmailStatus('')
      setGmailError(toUserErrorMessage(err))
    } finally {
      setIsGmailBusy(false)
    }
  }

  function handlePasteSubmit(): void {
    const trimmed = pastedText.trim()
    if (trimmed === '') {
      setError('本文が空です。案件メールの文面を貼り付けてください。')
      return
    }
    setError('')
    onImport([fromPastedText(trimmed)])
    setPastedText('')
  }

  async function handleFiles(fileList: FileList | File[]): Promise<void> {
    const files = [...fileList]
    if (files.length === 0) return
    setIsProcessing(true)
    setError('')
    try {
      const results = await Promise.all(files.map(fileToIncomingMail))
      const mails = results.filter((m): m is IncomingMail => m !== undefined)
      if (mails.length === 0) {
        setError('.eml または .txt ファイルを選択してください。')
        return
      }
      onImport(mails)
    } catch (err) {
      setError(toUserErrorMessage(err))
    } finally {
      setIsProcessing(false)
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>): void {
    event.preventDefault()
    setIsDragOver(false)
    void handleFiles(event.dataTransfer.files)
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>): void {
    if (event.target.files === null) return
    void handleFiles(event.target.files)
    event.target.value = ''
  }

  return (
    <div className="import-panel">
      <div className="import-panel-paste">
        <label htmlFor="paste-textarea" className="import-panel-label">
          案件メールの本文を貼り付け
        </label>
        <textarea
          id="paste-textarea"
          rows={6}
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="件名や本文をそのまま貼り付けてください"
          style={{ width: '100%' }}
        />
        <button
          type="button"
          className="btn"
          onClick={handlePasteSubmit}
          disabled={pastedText.trim() === ''}
        >
          取り込む
        </button>
      </div>

      <div
        className={`import-panel-dropzone${isDragOver ? ' import-panel-dropzone--over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <p className="note" style={{ margin: 0 }}>
          .eml / .txt ファイルをここにドラッグ＆ドロップ、または
        </p>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          ファイルを選択
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".eml,.txt"
          multiple
          hidden
          onChange={handleFileInputChange}
        />
      </div>

      {isProcessing && <p className="note">ファイルを読み込んでいます…</p>}
      {error && <p className="error-note">{error}</p>}

      <div className="import-panel-gmail">
        <p className="import-panel-label" style={{ margin: 0 }}>
          Gmailから取り込む
        </p>
        <p className="note" style={{ marginTop: 'var(--space-xs)' }}>
          取り込んだメール本文は、抽出実行時にAnthropic
          APIへ送信されます。件名や差出人で絞り込むことを推奨します。
        </p>
        {!hasGmailClientId ? (
          <div>
            <p className="note" style={{ marginTop: 'var(--space-xs)' }}>
              Gmail連携には設定画面でOAuth Client IDの登録が必要です。
            </p>
            {onOpenSettings && (
              <button type="button" className="btn-quiet" onClick={onOpenSettings}>
                設定を開く
              </button>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="gmail-query" className="note" style={{ display: 'block' }}>
              検索クエリ
            </label>
            <input
              id="gmail-query"
              type="text"
              value={gmailQuery}
              onChange={(e) => setGmailQuery(e.target.value)}
              placeholder="from:sales@example.com 案件"
              disabled={isGmailBusy}
              style={{ width: '100%', maxWidth: '480px' }}
            />
            <label htmlFor="gmail-max" className="note" style={{ display: 'block' }}>
              取得件数の上限（最大{GMAIL_MAX_LIMIT}件）
            </label>
            <input
              id="gmail-max"
              type="number"
              min={1}
              max={GMAIL_MAX_LIMIT}
              value={gmailMax}
              onChange={(e) => {
                const next = Number(e.target.value)
                if (Number.isNaN(next)) return
                setGmailMax(Math.min(Math.max(1, next), GMAIL_MAX_LIMIT))
              }}
              disabled={isGmailBusy}
              aria-describedby="gmail-max-hint"
              style={{ width: '6rem' }}
            />
            <p id="gmail-max-hint" className="note">
              1〜50の範囲で指定します。
            </p>
            <div style={{ marginTop: 'var(--space-sm)' }}>
              <button
                type="button"
                className="btn"
                onClick={() => void handleGmailImport()}
                disabled={isGmailBusy}
              >
                Gmailに接続して取り込む
              </button>
            </div>
          </div>
        )}
        {gmailStatus && <p className="note">{gmailStatus}</p>}
        {gmailError && <p className="error-note">{gmailError}</p>}
      </div>
    </div>
  )
}
