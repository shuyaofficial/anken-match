import { useRef, useState } from 'react'
import type { Employee } from '../../lib/types'
import {
  exportEmployeesToJson,
  importEmployeesFromCsv,
  importEmployeesFromJson,
  type ImportResult,
} from './importEmployees'

type Props = {
  employees: Employee[]
  onImport: (employees: Employee[]) => void
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** JSON/CSVインポートとJSONエクスポートをまとめたパネル。 */
export default function ImportExportPanel({ employees, onImport }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (file === undefined) return

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = file.name.toLowerCase().endsWith('.csv')
        ? importEmployeesFromCsv(text)
        : importEmployeesFromJson(text)
      setResult(parsed)
      if (parsed.employees.length > 0) {
        onImport(parsed.employees)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleExport(): void {
    downloadFile('employees.json', exportEmployeesToJson(employees), 'application/json')
  }

  return (
    <div className="import-export-panel">
      <div className="form-actions">
        <button type="button" className="btn-quiet" onClick={() => fileInputRef.current?.click()}>
          JSON/CSVをインポート
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
        <button type="button" className="btn-quiet" onClick={handleExport}>
          JSONをエクスポート
        </button>
      </div>

      {result && (
        <div className="import-result note">
          <p>
            取込 {result.employees.length}件成功
            {result.errors.length > 0 && ` / ${result.errors.length}件エラー`}
          </p>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((err) => (
                <li key={`${err.index}-${err.reason}`} className="error-note">
                  {err.index}行目: {err.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <details>
        <summary>フォーマットの説明</summary>
        <div className="format-help">
          <p>
            <strong>JSON</strong>: Employee[] 形式の配列。<code>id</code>・<code>createdAt</code>
            ・<code>updatedAt</code> は省略可（自動補完されます）。
          </p>
          <p>
            <strong>CSV</strong>: ヘッダは
            <code>name,roles,skills,availability,location,summary</code> の順。
          </p>
          <ul>
            <li>
              <code>roles</code>: <code>;</code> 区切り（例: <code>ネットワークエンジニア;PM</code>）
            </li>
            <li>
              <code>skills</code>: <code>スキル名:年数:レベル</code> を <code>;</code> 区切り（例:{' '}
              <code>AWS:5:advanced;Linux:3:intermediate</code>）。レベルは beginner / intermediate /
              advanced / expert
            </li>
            <li>
              <code>availability</code>: <code>available</code> または <code>assigned</code>
            </li>
          </ul>
        </div>
      </details>
    </div>
  )
}
