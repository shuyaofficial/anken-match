// recharts依存部分。バンドルが大きいためTrendsView側でReact.lazy経由で読み込む。
// 色は --accent 単色 / グリッド・軸は --line・--ink-soft のみ（虹色チャート禁止）。

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyCount, SkillDemand } from './trendsData'

const CHART_INK_SOFT = 'oklch(48% 0.012 250)'
const CHART_LINE = 'oklch(90% 0.006 250)'
const CHART_ACCENT = 'oklch(44% 0.1 250)'

const AXIS_TICK_STYLE = { fill: CHART_INK_SOFT, fontSize: 12 }

interface SkillDemandChartProps {
  data: SkillDemand[]
}

/** スキル需要Top10。横棒・単色。 */
export function SkillDemandChart({ data }: SkillDemandChartProps) {
  const chartHeight = Math.max(data.length * 36, 120)

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 24 }}>
        <CartesianGrid stroke={CHART_LINE} horizontal={false} />
        <XAxis type="number" tick={AXIS_TICK_STYLE} allowDecimals={false} axisLine={{ stroke: CHART_LINE }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={AXIS_TICK_STYLE}
          axisLine={{ stroke: CHART_LINE }}
          tickLine={false}
          width={120}
        />
        <Tooltip
          cursor={{ fill: 'oklch(94% 0.02 250)' }}
          contentStyle={{ borderColor: CHART_LINE, borderRadius: 6, fontSize: 13 }}
          formatter={(value) => [`${value}件`, '出現件数']}
        />
        <Bar dataKey="count" fill={CHART_ACCENT} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface MonthlyTrendChartProps {
  data: MonthlyCount[]
}

/** 月別案件数推移。細い折れ線・単色。 */
export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid stroke={CHART_LINE} vertical={false} />
        <XAxis dataKey="month" tick={AXIS_TICK_STYLE} axisLine={{ stroke: CHART_LINE }} tickLine={false} />
        <YAxis
          allowDecimals={false}
          tick={AXIS_TICK_STYLE}
          axisLine={{ stroke: CHART_LINE }}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{ borderColor: CHART_LINE, borderRadius: 6, fontSize: 13 }}
          formatter={(value) => [`${value}件`, '案件数']}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={CHART_ACCENT}
          strokeWidth={1.5}
          dot={{ r: 3, fill: CHART_ACCENT, strokeWidth: 0 }}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
