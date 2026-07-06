// 案件詳細。上部にステッパー、2カラム（左: 抽出結果、右: マッチング＋提案文）、下部に原文の折りたたみ。
// マッチ結果の単一ソースはここ: MatchPanelが計算→本コンポーネントが永続化しProposalPanelへ配布する。

import { useState } from 'react'
import { putMatchRecord } from '../../lib/db'
import MatchPanel from '../matching/MatchPanel'
import ProposalPanel from '../proposals/ProposalPanel'
import type { MatchResult, Project } from '../../lib/types'
import ExtractedView from './ExtractedView'
import Stepper, { type StepKey } from './Stepper'

type Props = {
  project: Project
  onBack: () => void
  onProjectUpdated: (project: Project) => void
  onOpenSettings: () => void
}

function currentStep(project: Project): StepKey {
  if (project.proposal !== undefined || project.status === 'proposed' || project.status === 'closed') {
    return 'propose'
  }
  if (project.status === 'matched') return 'match'
  if (project.extracted !== undefined) return 'extract'
  return 'import'
}

export default function ProjectDetail({
  project,
  onBack,
  onProjectUpdated,
  onOpenSettings,
}: Props) {
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null)
  const [persistError, setPersistError] = useState('')

  const title = project.extracted?.title ?? project.subject ?? '(件名なし)'

  function handleResultsChange(results: MatchResult[]): void {
    setMatchResults(results)
    putMatchRecord({ projectId: project.id, results, computedAt: new Date().toISOString() })
      .then(() => setPersistError(''))
      .catch(() => setPersistError('マッチ結果の保存に失敗しました。ブラウザのストレージ設定を確認してください。'))
    if (project.status === 'new') {
      onProjectUpdated({ ...project, status: 'matched', updatedAt: new Date().toISOString() })
    }
  }

  return (
    <div className="project-detail">
      <div className="project-detail-header">
        <button type="button" className="btn-quiet" onClick={onBack}>
          ← 一覧へ戻る
        </button>
        <h2 className="project-detail-title">{title}</h2>
      </div>

      <Stepper current={currentStep(project)} />

      {persistError && <p className="error-note">{persistError}</p>}

      <div className="project-detail-columns">
        <section className="project-detail-column">
          <h3 className="sr-only">抽出結果</h3>
          <ExtractedView
            project={project}
            onExtracted={onProjectUpdated}
            onOpenSettings={onOpenSettings}
          />
        </section>
        <section className="project-detail-column">
          <h3 className="sr-only">マッチング候補</h3>
          <MatchPanel
            key={project.id}
            project={project}
            onOpenSettings={onOpenSettings}
            onResultsChange={handleResultsChange}
          />

          <div className="project-detail-section-divider">
            <h3 className="project-detail-section-title">提案文</h3>
          </div>
          <ProposalPanel
            key={`proposal-${project.id}`}
            project={project}
            results={matchResults}
            onOpenSettings={onOpenSettings}
            onProjectUpdated={onProjectUpdated}
          />
        </section>
      </div>

      <details className="project-detail-raw">
        <summary>原文メール</summary>
        <div className="project-detail-raw-meta note">
          {project.from && <span>差出人: {project.from}</span>}
        </div>
        <pre className="project-detail-raw-body">{project.rawText}</pre>
      </details>
    </div>
  )
}
