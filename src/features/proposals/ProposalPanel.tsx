// 案件詳細・右カラム下部。選定候補者への提案文（要約＋クライアント返信ドラフト）を生成・編集・保存する。
// マッチ結果は親（ProjectDetail）から受け取る単一ソース。Projectの永続化も親の責務。

import { useEffect, useState } from 'react'
import { toUserErrorMessage } from '../../lib/anthropic'
import { getAllEmployees } from '../../lib/db'
import { generateProposal, ProposalError } from '../../lib/proposals'
import { loadSettings } from '../../lib/settings'
import type { Employee, MatchResult, Project } from '../../lib/types'
import { findResultFor, topCandidates, withProposal } from './proposalHelpers'
import './proposals.css'

type Props = {
  project: Project
  /** 親が配布するマッチ結果。null はまだマッチ未実行 */
  results: MatchResult[] | null
  onOpenSettings: () => void
  onProjectUpdated?: (project: Project) => void
}

type GenerationState =
  | { phase: 'idle' }
  | { phase: 'missing-key' }
  | { phase: 'running'; employeeName: string }
  | { phase: 'error'; message: string }

type DraftState = { summaryText: string; replyDraft: string } | null

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="proposal-copy-row">
      <button type="button" className="btn-quiet" onClick={() => void handleCopy()}>
        {label}
      </button>
      {copied && <span className="note">コピーしました</span>}
    </div>
  )
}

function CandidateSelect({
  candidates,
  employeeById,
  selectedId,
  onChange,
}: {
  candidates: MatchResult[]
  employeeById: Map<string, Employee>
  selectedId: string
  onChange: (employeeId: string) => void
}) {
  return (
    <label className="proposal-candidate-select">
      候補者
      <select value={selectedId} onChange={(e) => onChange(e.target.value)}>
        {candidates.map((result, index) => {
          const employee = employeeById.get(result.employeeId)
          if (employee === undefined) return null
          return (
            <option key={result.employeeId} value={result.employeeId}>
              {index + 1}位・{employee.name}（{result.score}点）
            </option>
          )
        })}
      </select>
    </label>
  )
}

export default function ProposalPanel({ project, results, onOpenSettings, onProjectUpdated }: Props) {
  // project.proposal はマウント時の初期値のみに使う（親は project.id ごとに key を付けて再マウントする）
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    () => project.proposal?.employeeId ?? '',
  )
  const [draft, setDraft] = useState<DraftState>(() =>
    project.proposal !== undefined
      ? { summaryText: project.proposal.summaryText, replyDraft: project.proposal.replyDraft }
      : null,
  )
  const [generationState, setGenerationState] = useState<GenerationState>({ phase: 'idle' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAllEmployees().then((all) => {
      if (!cancelled) setEmployees(all)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const candidates = topCandidates(results)
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const activeEmployeeId = selectedEmployeeId || candidates[0]?.employeeId || ''

  if (results === null || candidates.length === 0) {
    return <p className="hint">先にマッチングを実行してください。</p>
  }

  async function handleGenerate(): Promise<void> {
    const settings = loadSettings()
    if (settings.anthropicApiKey === '') {
      setGenerationState({ phase: 'missing-key' })
      return
    }
    const result = findResultFor(candidates, activeEmployeeId)
    const employee = employeeById.get(activeEmployeeId)
    if (result === undefined || employee === undefined) return

    setGenerationState({ phase: 'running', employeeName: employee.name })
    setSaved(false)
    try {
      const generated = await generateProposal(project, employee, result, {
        apiKey: settings.anthropicApiKey,
        model: settings.model,
      })
      setDraft(generated)
      setGenerationState({ phase: 'idle' })
    } catch (error) {
      const message = error instanceof ProposalError ? error.message : toUserErrorMessage(error)
      setGenerationState({ phase: 'error', message })
    }
  }

  function handleSave(): void {
    if (draft === null) return
    const updated = withProposal(
      project,
      { employeeId: activeEmployeeId, summaryText: draft.summaryText, replyDraft: draft.replyDraft },
      new Date(),
    )
    onProjectUpdated?.(updated)
    setSaved(true)
  }

  const isRunning = generationState.phase === 'running'

  return (
    <div className="proposal-panel">
      <CandidateSelect
        candidates={candidates}
        employeeById={employeeById}
        selectedId={activeEmployeeId}
        onChange={(id) => {
          setSelectedEmployeeId(id)
          setSaved(false)
        }}
      />

      <button type="button" className="btn" onClick={() => void handleGenerate()} disabled={isRunning}>
        {draft === null ? '提案文を生成' : '再生成する'}
      </button>

      {generationState.phase === 'running' && (
        <p className="hint">{generationState.employeeName}さんの提案文を作成しています…</p>
      )}
      {generationState.phase === 'error' && (
        <p className="error-note">{generationState.message}</p>
      )}
      {generationState.phase === 'missing-key' && (
        <div className="missing-key-notice">
          <p className="note">APIキーが未設定です。設定画面でAnthropic APIキーを登録してください。</p>
          <button type="button" className="btn-quiet" onClick={onOpenSettings}>
            設定画面を開く
          </button>
        </div>
      )}

      {draft !== null && (
        <div className="proposal-draft">
          <label className="proposal-field">
            提案用要約
            <textarea
              value={draft.summaryText}
              onChange={(e) => setDraft({ ...draft, summaryText: e.target.value })}
              rows={5}
            />
          </label>
          <CopyButton text={draft.summaryText} label="要約をコピー" />

          <label className="proposal-field">
            返信ドラフト
            <textarea
              value={draft.replyDraft}
              onChange={(e) => setDraft({ ...draft, replyDraft: e.target.value })}
              rows={10}
            />
          </label>
          <CopyButton text={draft.replyDraft} label="返信ドラフトをコピー" />

          <p className="note">AIが生成した下書きです。送信前に必ず内容を確認してください。</p>

          <div className="proposal-save-row">
            <button type="button" className="btn" onClick={handleSave}>
              この内容で保存
            </button>
            {saved && <span className="note">保存しました</span>}
          </div>
        </div>
      )}
    </div>
  )
}
