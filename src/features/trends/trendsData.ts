// トレンド集計の純関数群。API呼び出しなし・すべて決定的。
// UIコンポーネントからはこのファイルの関数のみを呼び出すこと（集計ロジックの単一の真実源）。

import { normalizeSkillName, skillKey } from '../../lib/normalize'
import type { Project, RemoteStyle } from '../../lib/types'

export type TrendPeriod = 'all' | '90d' | '30d'

/** スキル需要Top10の1行 */
export interface SkillDemand {
  /** 表示名（canonical名） */
  name: string
  /** required + preferred の出現件数（重み付けなし） */
  count: number
}

/** 月別案件数の1点 */
export interface MonthlyCount {
  /** "2026-07" 形式 */
  month: string
  count: number
}

export type SkillTrendDirection = 'up' | 'down' | 'flat'

/** スキル需要の直近30日 vs その前30日の比較 */
export interface SkillTrendChange {
  name: string
  recentCount: number
  previousCount: number
  delta: number
  direction: SkillTrendDirection
}

/** リモート形態の内訳1行 */
export interface RemoteBreakdownItem {
  style: RemoteStyle
  count: number
  ratio: number
}

const MONTHLY_TREND_MONTHS = 6
const RECENT_WINDOW_DAYS = 30
const TOP_N = 10
const DAY_MS = 24 * 60 * 60 * 1000

/** extracted済みの案件のみを集計対象とする */
export function extractedOnly(projects: Project[]): Project[] {
  return projects.filter((p) => p.extracted !== undefined)
}

function isWithinDays(receivedAt: string, now: Date, days: number): boolean {
  const received = new Date(receivedAt).getTime()
  if (Number.isNaN(received)) return false
  const diffDays = (now.getTime() - received) / DAY_MS
  return diffDays >= 0 && diffDays < days
}

/** 期間フィルタを適用する（'all' はそのまま返す） */
export function filterByPeriod(
  projects: Project[],
  period: TrendPeriod,
  now: Date = new Date(),
): Project[] {
  if (period === 'all') return projects
  const days = period === '30d' ? 30 : 90
  return projects.filter((p) => isWithinDays(p.receivedAt, now, days))
}

/**
 * スキル需要Top10。required/preferred問わず出現件数で数える。
 * skillKeyで正規化して同一スキルを束ね、表示名はcanonical名（normalizeSkillName）を使う。
 */
export function computeSkillDemand(projects: Project[], topN: number = TOP_N): SkillDemand[] {
  const countByKey = new Map<string, { name: string; count: number }>()

  for (const project of extractedOnly(projects)) {
    for (const skill of project.extracted?.skills ?? []) {
      const key = skillKey(skill.name)
      const existing = countByKey.get(key)
      if (existing === undefined) {
        countByKey.set(key, { name: normalizeSkillName(skill.name), count: 1 })
      } else {
        existing.count += 1
      }
    }
  }

  return [...countByKey.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'))
    .slice(0, topN)
}

function monthKey(iso: string): string | undefined {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function recentMonthKeys(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

/** 月別案件数推移（直近6ヶ月固定・件数0の月も0として含める） */
export function computeMonthlyCounts(
  projects: Project[],
  now: Date = new Date(),
  months: number = MONTHLY_TREND_MONTHS,
): MonthlyCount[] {
  const countByMonth = new Map<string, number>()
  for (const project of extractedOnly(projects)) {
    const key = monthKey(project.receivedAt)
    if (key === undefined) continue
    countByMonth.set(key, (countByMonth.get(key) ?? 0) + 1)
  }

  return recentMonthKeys(now, months).map((month) => ({
    month,
    count: countByMonth.get(month) ?? 0,
  }))
}

function directionOf(delta: number): SkillTrendDirection {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

function countSkillsInWindow(
  projects: Project[],
  now: Date,
  windowStartDays: number,
  windowEndDays: number,
): Map<string, { name: string; count: number }> {
  const countByKey = new Map<string, { name: string; count: number }>()
  for (const project of extractedOnly(projects)) {
    const received = new Date(project.receivedAt).getTime()
    if (Number.isNaN(received)) continue
    const diffDays = (now.getTime() - received) / DAY_MS
    if (diffDays < windowStartDays || diffDays >= windowEndDays) continue

    for (const skill of project.extracted?.skills ?? []) {
      const key = skillKey(skill.name)
      const existing = countByKey.get(key)
      if (existing === undefined) {
        countByKey.set(key, { name: normalizeSkillName(skill.name), count: 1 })
      } else {
        existing.count += 1
      }
    }
  }
  return countByKey
}

/**
 * スキル需要の増減。直近30日 vs その前30日で出現件数を比較する。
 * どちらの期間にも出現するスキルのみ対象（新規/消滅は増減の意味が薄いため除外）。
 * 変化量（絶対値）の降順で並べる。
 */
export function computeSkillTrendChanges(
  projects: Project[],
  now: Date = new Date(),
): SkillTrendChange[] {
  const recent = countSkillsInWindow(projects, now, 0, RECENT_WINDOW_DAYS)
  const previous = countSkillsInWindow(projects, now, RECENT_WINDOW_DAYS, RECENT_WINDOW_DAYS * 2)

  const allKeys = new Set([...recent.keys(), ...previous.keys()])
  const changes: SkillTrendChange[] = []
  for (const key of allKeys) {
    const recentEntry = recent.get(key)
    const previousEntry = previous.get(key)
    const recentCount = recentEntry?.count ?? 0
    const previousCount = previousEntry?.count ?? 0
    const name = recentEntry?.name ?? previousEntry?.name ?? key
    const delta = recentCount - previousCount
    changes.push({ name, recentCount, previousCount, delta, direction: directionOf(delta) })
  }

  return changes.sort(
    (a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name, 'ja'),
  )
}

const REMOTE_STYLES: RemoteStyle[] = ['full', 'hybrid', 'onsite', 'unknown']

/** リモート形態の内訳。remote未設定は'unknown'として数える */
export function computeRemoteBreakdown(projects: Project[]): RemoteBreakdownItem[] {
  const targets = extractedOnly(projects)
  const countByStyle = new Map<RemoteStyle, number>(REMOTE_STYLES.map((s) => [s, 0]))

  for (const project of targets) {
    const style = project.extracted?.remote ?? 'unknown'
    countByStyle.set(style, (countByStyle.get(style) ?? 0) + 1)
  }

  const total = targets.length
  return REMOTE_STYLES.map((style) => {
    const count = countByStyle.get(style) ?? 0
    return { style, count, ratio: total === 0 ? 0 : count / total }
  })
}
