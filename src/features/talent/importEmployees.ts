// 人材データのインポート用純関数群。
// JSON/CSVいずれも「行/要素単位でバリデーションし、エラーは理由付きで報告、正常分のみ採用」方針。

import { normalizeSkillName } from '../../lib/normalize'
import type { AvailabilityStatus, Employee, EmployeeSkill, SkillLevel } from '../../lib/types'

export interface ImportError {
  /** 何行目/何件目か（1始まり、ヘッダ除く） */
  index: number
  reason: string
}

export interface ImportResult {
  employees: Employee[]
  errors: ImportError[]
}

const MIN_YEARS = 0
const MAX_YEARS = 50
const SKILL_LEVELS: readonly SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert']
const AVAILABILITY_STATUSES: readonly AvailabilityStatus[] = ['available', 'assigned']

function isValidYears(years: number): boolean {
  return Number.isFinite(years) && years >= MIN_YEARS && years <= MAX_YEARS
}

function isSkillLevel(value: string): value is SkillLevel {
  return (SKILL_LEVELS as readonly string[]).includes(value)
}

function isAvailabilityStatus(value: string): value is AvailabilityStatus {
  return (AVAILABILITY_STATUSES as readonly string[]).includes(value)
}

/* ---------- JSON インポート ---------- */

/** JSON側の1件を検証し、Employeeへ補完する。不正なら理由文字列を返す。 */
function parseJsonEmployee(raw: unknown, now: string): Employee | string {
  if (typeof raw !== 'object' || raw === null) return 'オブジェクトではありません'
  const r = raw as Record<string, unknown>

  if (typeof r.name !== 'string' || r.name.trim() === '') return '氏名が空です'

  const roles = Array.isArray(r.roles) ? r.roles.filter((x): x is string => typeof x === 'string') : []
  const skills = parseJsonSkills(r.skills)
  if (typeof skills === 'string') return skills

  const availability = parseJsonAvailability(r.availability)
  if (typeof availability === 'string') return availability

  return {
    id: typeof r.id === 'string' && r.id !== '' ? r.id : crypto.randomUUID(),
    name: r.name.trim(),
    roles,
    skills,
    availability,
    location: typeof r.location === 'string' ? r.location : undefined,
    summary: typeof r.summary === 'string' ? r.summary : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : now,
  }
}

function parseJsonSkills(raw: unknown): EmployeeSkill[] | string {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return 'skillsが配列ではありません'

  const skills: EmployeeSkill[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return 'skillsの要素が不正です'
    const s = item as Record<string, unknown>
    if (typeof s.name !== 'string' || s.name.trim() === '') return 'skill名が空です'
    const years = typeof s.years === 'number' ? s.years : 0
    if (!isValidYears(years)) return `年数は${MIN_YEARS}〜${MAX_YEARS}の範囲で入力してください`
    const level = typeof s.level === 'string' && isSkillLevel(s.level) ? s.level : 'intermediate'
    skills.push({ name: normalizeSkillName(s.name), years, level })
  }
  return skills
}

function parseJsonAvailability(raw: unknown): Employee['availability'] | string {
  if (raw === undefined) return { status: 'available' }
  if (typeof raw !== 'object' || raw === null) return 'availabilityが不正です'
  const a = raw as Record<string, unknown>
  const status = typeof a.status === 'string' && isAvailabilityStatus(a.status) ? a.status : 'available'
  const until = typeof a.until === 'string' ? a.until : undefined
  return { status, until }
}

/** Employee[] 形式のJSON文字列をインポートする。id/createdAt等は補完。 */
export function importEmployeesFromJson(jsonText: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return { employees: [], errors: [{ index: 0, reason: 'JSONを解析できませんでした' }] }
  }
  if (!Array.isArray(parsed)) {
    return { employees: [], errors: [{ index: 0, reason: 'JSONは配列である必要があります' }] }
  }

  const now = new Date().toISOString()
  const employees: Employee[] = []
  const errors: ImportError[] = []
  parsed.forEach((raw, i) => {
    const result = parseJsonEmployee(raw, now)
    if (typeof result === 'string') {
      errors.push({ index: i + 1, reason: result })
    } else {
      employees.push(result)
    }
  })
  return { employees, errors }
}

/* ---------- CSV インポート ---------- */

const CSV_HEADER = ['name', 'roles', 'skills', 'availability', 'location', 'summary'] as const

/** 1行分のCSV（カンマ区切り、簡易ダブルクォート対応）をフィールド配列に分割する */
function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)
  return fields
}

/** `スキル名:年数:レベル` を `;` 区切りで並べたセルをパースする */
function parseCsvSkills(cell: string): EmployeeSkill[] | string {
  const trimmed = cell.trim()
  if (trimmed === '') return []

  const skills: EmployeeSkill[] = []
  for (const entry of trimmed.split(';')) {
    const part = entry.trim()
    if (part === '') continue
    const [name, yearsRaw, levelRaw] = part.split(':').map((s) => s.trim())
    if (name === undefined || name === '') return `不正なスキル指定です: "${entry}"`
    const years = yearsRaw === undefined || yearsRaw === '' ? 0 : Number(yearsRaw)
    if (!isValidYears(years)) return `年数は${MIN_YEARS}〜${MAX_YEARS}の範囲で入力してください: "${entry}"`
    const level = levelRaw !== undefined && isSkillLevel(levelRaw) ? levelRaw : 'intermediate'
    skills.push({ name: normalizeSkillName(name), years, level })
  }
  return skills
}

function parseCsvRoles(cell: string): string[] {
  return cell
    .trim()
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

function parseCsvAvailability(cell: string): Employee['availability'] {
  const trimmed = cell.trim()
  const status = isAvailabilityStatus(trimmed) ? trimmed : 'available'
  return { status }
}

/** CSVの1レコード（ヘッダ除く実データ行）をEmployeeへ変換する。不正なら理由文字列。 */
function parseCsvRow(fields: string[], now: string): Employee | string {
  const [name, rolesCell, skillsCell, availabilityCell, location, summary] = fields
  if (name === undefined || name.trim() === '') return '氏名が空です'

  const skills = parseCsvSkills(skillsCell ?? '')
  if (typeof skills === 'string') return skills

  return {
    id: crypto.randomUUID(),
    name: name.trim(),
    roles: parseCsvRoles(rolesCell ?? ''),
    skills,
    availability: parseCsvAvailability(availabilityCell ?? ''),
    location: location !== undefined && location.trim() !== '' ? location.trim() : undefined,
    summary: summary !== undefined && summary.trim() !== '' ? summary.trim() : undefined,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * CSVテキストをインポートする。
 * ヘッダ: name,roles,skills,availability,location,summary
 */
export function importEmployeesFromCsv(csvText: string): ImportResult {
  const lines = csvText.split(/\r\n|\r|\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) {
    return { employees: [], errors: [{ index: 0, reason: 'CSVが空です' }] }
  }

  const header = splitCsvLine(lines[0] ?? '').map((h) => h.trim())
  const isHeaderValid = CSV_HEADER.every((expected, i) => header[i] === expected)
  if (!isHeaderValid) {
    return {
      employees: [],
      errors: [{ index: 0, reason: `ヘッダは ${CSV_HEADER.join(',')} である必要があります` }],
    }
  }

  const now = new Date().toISOString()
  const employees: Employee[] = []
  const errors: ImportError[] = []
  lines.slice(1).forEach((line, i) => {
    const fields = splitCsvLine(line)
    const result = parseCsvRow(fields, now)
    if (typeof result === 'string') {
      errors.push({ index: i + 1, reason: result })
    } else {
      employees.push(result)
    }
  })
  return { employees, errors }
}

/** エクスポート用: Employee[] を整形済みJSON文字列に変換する */
export function exportEmployeesToJson(employees: Employee[]): string {
  return JSON.stringify(employees, null, 2)
}
