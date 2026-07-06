// 案件詳細・左カラム。抽出結果の構造化ビューと、未抽出時の抽出実行UIを担う。

import { useState } from 'react'
import { toUserErrorMessage } from '../../lib/anthropic'
import { extractProject, ExtractionError } from '../../lib/extraction'
import { loadSettings } from '../../lib/settings'
import type { ExtractedProject, Project, RemoteStyle } from '../../lib/types'

const REMOTE_LABEL: Record<RemoteStyle, string> = {
  full: 'フルリモート',
  hybrid: 'ハイブリッド',
  onsite: '常駐',
  unknown: '不明',
}

type Props = {
  project: Project
  onExtracted: (project: Project) => void
  onOpenSettings: () => void
}

/** 抽出済みprojectをイミュータブルに更新する */
function withExtracted(project: Project, extracted: ExtractedProject, now: Date): Project {
  return {
    ...project,
    extracted,
    status: project.status === 'new' ? 'matched' : project.status,
    updatedAt: now.toISOString(),
  }
}

function DefinitionRow({ label, value }: { label: string; value?: string }) {
  if (value === undefined || value === '') return null
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  )
}

function ExtractedSummary({ extracted }: { extracted: ExtractedProject }) {
  const required = extracted.skills.filter((s) => s.kind === 'required')
  const preferred = extracted.skills.filter((s) => s.kind === 'preferred')

  return (
    <div className="extracted-summary">
      <h3 className="extracted-title">{extracted.title}</h3>
      {extracted.summary !== '' && <p className="extracted-summary-text">{extracted.summary}</p>}

      {extracted.skills.length > 0 && (
        <div className="skill-tag-row">
          {required.map((skill) => (
            <span key={skill.name} className="skill-tag required">
              {skill.name}
            </span>
          ))}
          {preferred.map((skill) => (
            <span key={skill.name} className="skill-tag">
              {skill.name}
            </span>
          ))}
        </div>
      )}

      <dl className="definition-list">
        <DefinitionRow label="ポジション" value={extracted.role} />
        <DefinitionRow label="単価" value={extracted.price} />
        <DefinitionRow label="期間" value={extracted.period} />
        <DefinitionRow label="勤務地" value={extracted.location} />
        <DefinitionRow
          label="リモート"
          value={extracted.remote ? REMOTE_LABEL[extracted.remote] : undefined}
        />
        <DefinitionRow label="商流" value={extracted.commercialFlow} />
        <DefinitionRow label="開始時期" value={extracted.startDate} />
        <DefinitionRow label="特記事項" value={extracted.notes} />
      </dl>
    </div>
  )
}

export default function ExtractedView({ project, onExtracted, onOpenSettings }: Props) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState('')

  const settings = loadSettings()
  const hasApiKey = settings.anthropicApiKey !== ''

  async function handleExtract(): Promise<void> {
    if (settings.anthropicApiKey === '') {
      setError('APIキー未設定です。')
      return
    }
    setIsExtracting(true)
    setError('')
    try {
      const extracted = await extractProject(project.rawText, {
        apiKey: settings.anthropicApiKey,
        model: settings.model,
      })
      onExtracted(withExtracted(project, extracted, new Date()))
    } catch (err) {
      const message = err instanceof ExtractionError ? err.message : toUserErrorMessage(err)
      setError(message)
    } finally {
      setIsExtracting(false)
    }
  }

  return (
    <div className="extracted-view">
      {project.extracted && <ExtractedSummary extracted={project.extracted} />}

      {!hasApiKey && (
        <div className="card">
          <p style={{ marginTop: 0 }}>抽出にはAnthropic APIキーの設定が必要です。</p>
          <button type="button" className="btn" onClick={onOpenSettings}>
            設定へ移動
          </button>
        </div>
      )}

      {hasApiKey && isExtracting && (
        <div className="card extraction-skeleton" aria-live="polite">
          <p style={{ margin: 0 }}>メールからスキル・単価・条件を抽出しています…</p>
        </div>
      )}

      {hasApiKey && !isExtracting && (
        <button type="button" className="btn" onClick={() => void handleExtract()}>
          {project.extracted ? '再抽出する' : '抽出する'}
        </button>
      )}

      {error !== '' && <p className="error-note">{error}</p>}
    </div>
  )
}
