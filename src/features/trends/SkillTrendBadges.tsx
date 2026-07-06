// スキル需要の増減バッジ。「AWS +5件」のような一行。色の意味を守る:
// 増加は --match-strong（好材料）、減少・横ばいは --ink-soft（中立の格下げ表現）。

import type { SkillTrendChange } from './trendsData'

const MAX_BADGES = 8

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}件`
  if (delta < 0) return `${delta}件`
  return '±0件'
}

interface Props {
  changes: SkillTrendChange[]
}

export default function SkillTrendBadges({ changes }: Props) {
  const visible = changes.filter((c) => c.direction !== 'flat').slice(0, MAX_BADGES)

  if (visible.length === 0) {
    return <p className="note">直近30日で目立った増減はありません。</p>
  }

  return (
    <ul className="trend-badge-list">
      {visible.map((change) => (
        <li key={change.name} className="trend-badge-row">
          <span className="trend-badge-name">{change.name}</span>
          <span
            className="trend-badge-delta tabular"
            style={{ color: change.direction === 'up' ? 'var(--match-strong)' : 'var(--ink-soft)' }}
          >
            {formatDelta(change.delta)}
          </span>
        </li>
      ))}
    </ul>
  )
}
