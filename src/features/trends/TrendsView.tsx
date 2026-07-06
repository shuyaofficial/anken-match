// トレンドダッシュボード本実装。
// データ源はdbのprojects（extracted済みのみ集計対象）。API呼び出しなし・全て決定的集計。
// レイアウトはDESIGN.md準拠: カードグリッドの羅列ではなく「スキル需要→推移→内訳」の一本の流れ。

import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { getAllProjects } from '../../lib/db'
import type { Project } from '../../lib/types'
import type { NavTarget } from '../navigation'
import RemoteBreakdownBar from './RemoteBreakdownBar'
import SkillTrendBadges from './SkillTrendBadges'
import './trends.css'
import {
  computeMonthlyCounts,
  computeRemoteBreakdown,
  computeSkillDemand,
  computeSkillTrendChanges,
  extractedOnly,
  filterByPeriod,
  type TrendPeriod,
} from './trendsData'

// rechartsはバンドルが大きいため遅延読み込み。
const SkillDemandChart = lazy(() =>
  import('./TrendsCharts').then((m) => ({ default: m.SkillDemandChart })),
)
const MonthlyTrendChart = lazy(() =>
  import('./TrendsCharts').then((m) => ({ default: m.MonthlyTrendChart })),
)

type Props = {
  onNavigate: (target: NavTarget) => void
}

const PERIOD_OPTIONS: { value: TrendPeriod; label: string }[] = [
  { value: 'all', label: '全期間' },
  { value: '90d', label: '直近90日' },
  { value: '30d', label: '直近30日' },
]

function ChartFallback() {
  return <p className="note">集計を描画しています…</p>
}

export default function TrendsView({ onNavigate }: Props) {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [period, setPeriod] = useState<TrendPeriod>('all')

  useEffect(() => {
    let cancelled = false
    getAllProjects().then((all) => {
      if (!cancelled) setProjects(all)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const extracted = useMemo(() => extractedOnly(projects ?? []), [projects])

  const skillDemand = useMemo(
    () => computeSkillDemand(filterByPeriod(extracted, period)),
    [extracted, period],
  )
  const monthlyCounts = useMemo(() => computeMonthlyCounts(extracted), [extracted])
  const skillTrendChanges = useMemo(() => computeSkillTrendChanges(extracted), [extracted])
  const remoteBreakdown = useMemo(() => computeRemoteBreakdown(extracted), [extracted])

  if (projects === null) {
    return <p className="note">集計を読み込んでいます…</p>
  }

  if (extracted.length === 0) {
    return (
      <div className="empty-state">
        <p>表示できるトレンドデータがまだありません。案件を取り込むと集計されます。</p>
        <button type="button" className="btn" onClick={() => onNavigate('projects')}>
          案件タブへ移動する
        </button>
      </div>
    )
  }

  return (
    <div className="trends-view">
      <section className="section">
        <div className="trends-section-header">
          <h2>スキル需要</h2>
          <div className="trends-period-picker" role="group" aria-label="集計期間">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={opt.value === period ? 'btn-quiet active' : 'btn-quiet'}
                aria-pressed={opt.value === period}
                onClick={() => setPeriod(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {skillDemand.length === 0 ? (
          <p className="note">この期間に該当するスキルがありません。</p>
        ) : (
          <Suspense fallback={<ChartFallback />}>
            <SkillDemandChart data={skillDemand} />
          </Suspense>
        )}

        <h3 className="trends-subheading">直近30日の増減</h3>
        <SkillTrendBadges changes={skillTrendChanges} />
      </section>

      <section className="section">
        <h2>月別案件数推移</h2>
        <Suspense fallback={<ChartFallback />}>
          <MonthlyTrendChart data={monthlyCounts} />
        </Suspense>
      </section>

      <section className="section">
        <h2>リモート形態の内訳</h2>
        <RemoteBreakdownBar breakdown={remoteBreakdown} />
      </section>
    </div>
  )
}
