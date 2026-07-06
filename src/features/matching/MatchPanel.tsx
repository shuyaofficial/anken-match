// 候補者ランキングパネル。
// 決定的ランキングは描画中に純粋導出し（useEffectで派生状態を作らない）、
// 結果の永続化と兄弟パネルへの配布は親（ProjectDetail）が単一所有で行う。

import { useEffect, useMemo, useRef, useState } from 'react'
import { toUserErrorMessage } from '../../lib/anthropic'
import { getAllEmployees } from '../../lib/db'
import { MatchingError, rankEmployees, rerankTopCandidates } from '../../lib/matching'
import { loadSettings } from '../../lib/settings'
import type { Employee, MatchResult, Project } from '../../lib/types'
import CandidateCard from './CandidateCard'
import './matching.css'

// - project: 表示中の案件（extracted が無い場合は抽出を促す）
// - onOpenSettings: APIキー未設定時などに設定画面へ誘導する
// - onResultsChange: マッチ結果が確定・更新されるたびに親へ通知する（永続化は親の責務）
type Props = {
  project: Project
  onOpenSettings: () => void
  onResultsChange?: (results: MatchResult[]) => void
}

type RerankState =
  | { phase: 'idle' }
  | { phase: 'running' }
  | { phase: 'missing-key' }
  | { phase: 'error'; message: string }

export default function MatchPanel({ project, onOpenSettings, onResultsChange }: Props) {
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [reranked, setReranked] = useState<MatchResult[] | null>(null)
  const [includeAssigned, setIncludeAssigned] = useState(false)
  const [rerankState, setRerankState] = useState<RerankState>({ phase: 'idle' })

  const extracted = project.extracted

  useEffect(() => {
    let cancelled = false
    getAllEmployees().then((all) => {
      if (!cancelled) setEmployees(all)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const baseResults = useMemo(() => {
    if (extracted === undefined || employees === null) return []
    return rankEmployees(extracted, employees, { projectId: project.id, includeAssigned })
  }, [extracted, employees, includeAssigned, project.id])

  // 入力（抽出結果・社員・トグル）が変わったらLLM再ランクは無効化して決定的順位に戻す
  useEffect(() => {
    setReranked(null)
  }, [baseResults])

  const results = reranked ?? baseResults

  // コールバックはrefで常に最新を参照する（依存配列からの除外や抑止コメントを不要にするため）
  const onResultsChangeRef = useRef(onResultsChange)
  onResultsChangeRef.current = onResultsChange
  useEffect(() => {
    if (results.length === 0) return
    onResultsChangeRef.current?.(results)
  }, [results])

  if (extracted === undefined) {
    return <p className="hint">先に抽出を実行してください。</p>
  }

  if (employees === null) {
    return <p className="hint">人材データを読み込んでいます…</p>
  }

  if (employees.length === 0) {
    return <p className="hint">人材が未登録です。人材タブから登録してください。</p>
  }

  async function handleRerank(): Promise<void> {
    const settings = loadSettings()
    if (settings.anthropicApiKey === '') {
      setRerankState({ phase: 'missing-key' })
      return
    }
    if (extracted === undefined || employees === null) return

    setRerankState({ phase: 'running' })
    try {
      const next = await rerankTopCandidates(extracted, baseResults, employees, {
        apiKey: settings.anthropicApiKey,
        model: settings.model,
      })
      setReranked(next)
      setRerankState({ phase: 'idle' })
    } catch (error) {
      const message = error instanceof MatchingError ? error.message : toUserErrorMessage(error)
      setRerankState({ phase: 'error', message })
    }
  }

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  return (
    <div className="match-panel">
      <div className="match-panel-toolbar">
        <label className="include-assigned-toggle">
          <input
            type="checkbox"
            checked={includeAssigned}
            onChange={(e) => setIncludeAssigned(e.target.checked)}
          />
          アサイン中を含める
        </label>
        <button
          type="button"
          className="btn-quiet"
          onClick={() => void handleRerank()}
          disabled={rerankState.phase === 'running'}
        >
          AIで再ランク＋提案根拠を生成
        </button>
      </div>

      {rerankState.phase === 'running' && (
        <p className="hint">上位候補の提案順を検討しています…</p>
      )}
      {rerankState.phase === 'error' && <p className="error-note">{rerankState.message}</p>}
      {rerankState.phase === 'missing-key' && (
        <div className="missing-key-notice">
          <p className="note">APIキーが未設定です。設定画面でAnthropic APIキーを登録してください。</p>
          <button type="button" className="btn-quiet" onClick={onOpenSettings}>
            設定画面を開く
          </button>
        </div>
      )}

      <ol className="candidate-list">
        {results.flatMap((result, i) => {
          const employee = employeeById.get(result.employeeId)
          return employee === undefined
            ? []
            : [<CandidateCard key={result.employeeId} rank={i + 1} employee={employee} result={result} />]
        })}
      </ol>
    </div>
  )
}
