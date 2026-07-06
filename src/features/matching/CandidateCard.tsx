import { useState } from 'react'
import type { Employee, MatchResult } from '../../lib/types'
import { scoreTier } from './constants'

type Props = {
  rank: number
  employee: Employee
  result: MatchResult
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

/** 1候補者分のランキング行。スコアバッジ・スキル充足状況・内訳（展開式）・LLM根拠を表示する。 */
export default function CandidateCard({ rank, employee, result }: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const tier = scoreTier(result.score)
  const { breakdown } = result

  return (
    <li className="candidate-card">
      <div className="candidate-header">
        <span className="candidate-rank tabular">{rank}</span>
        <span className="candidate-name">{employee.name}</span>
        <span className={`score-badge score-badge--${tier} tabular`}>{result.score}</span>
      </div>

      <div className="skill-tag-list">
        {breakdown.matchedSkills.map((name) => (
          <span key={`matched-${name}`} className="skill-tag">
            {name}
          </span>
        ))}
        {breakdown.missingRequired.map((name) => (
          <span key={`missing-${name}`} className="skill-tag skill-tag--missing">
            {name}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="btn-quiet candidate-breakdown-toggle"
        onClick={() => setShowBreakdown(!showBreakdown)}
        aria-expanded={showBreakdown}
      >
        {showBreakdown ? '内訳を閉じる' : '内訳を見る'}
      </button>

      {showBreakdown && (
        <dl className="candidate-breakdown note">
          <div>
            <dt>必須充足率</dt>
            <dd className="tabular">{formatPercent(breakdown.requiredCoverage)}</dd>
          </div>
          <div>
            <dt>歓迎充足率</dt>
            <dd className="tabular">{formatPercent(breakdown.preferredCoverage)}</dd>
          </div>
          <div>
            <dt>経験加点</dt>
            <dd className="tabular">{formatPercent(breakdown.experienceBonus)}</dd>
          </div>
        </dl>
      )}

      {result.llmRationale !== undefined && result.llmRationale !== '' && (
        <p className="candidate-rationale">{result.llmRationale}</p>
      )}
    </li>
  )
}
