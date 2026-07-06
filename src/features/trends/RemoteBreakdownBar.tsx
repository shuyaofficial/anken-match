// リモート形態の内訳。円グラフは使わず、水平スタックバー1本＋凡例で表現する。
// 無彩色濃淡＋accentの単色系（DESIGN.mdの「色は意味でのみ」に沿い、区分は明度差で示す）。

import type { RemoteBreakdownItem } from './trendsData'
import type { RemoteStyle } from '../../lib/types'

const STYLE_LABEL: Record<RemoteStyle, string> = {
  full: 'フルリモート',
  hybrid: 'ハイブリッド',
  onsite: '常駐',
  unknown: '不明',
}

/** アクセントからの濃淡4段階。彩度を割らず明度のみ変えて単色系を保つ。 */
const STYLE_COLOR: Record<RemoteStyle, string> = {
  full: 'var(--accent)',
  hybrid: 'color-mix(in oklch, var(--accent) 65%, var(--surface-raised))',
  onsite: 'color-mix(in oklch, var(--accent) 35%, var(--surface-raised))',
  unknown: 'var(--line)',
}

interface Props {
  breakdown: RemoteBreakdownItem[]
}

export default function RemoteBreakdownBar({ breakdown }: Props) {
  const total = breakdown.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return <p className="note">集計できるデータがありません。</p>
  }

  return (
    <div className="remote-breakdown">
      <div className="remote-breakdown-bar" role="img" aria-label="リモート形態の内訳">
        {breakdown
          .filter((item) => item.count > 0)
          .map((item) => (
            <div
              key={item.style}
              className="remote-breakdown-segment"
              style={{ width: `${item.ratio * 100}%`, background: STYLE_COLOR[item.style] }}
              title={`${STYLE_LABEL[item.style]} ${item.count}件`}
            />
          ))}
      </div>
      <ul className="remote-breakdown-legend">
        {breakdown.map((item) => (
          <li key={item.style} className="remote-breakdown-legend-item">
            <span className="remote-breakdown-swatch" style={{ background: STYLE_COLOR[item.style] }} />
            <span>{STYLE_LABEL[item.style]}</span>
            <span className="tabular note">{Math.round(item.ratio * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
