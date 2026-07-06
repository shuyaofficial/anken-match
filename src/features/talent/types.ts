// talent feature 内部でのみ使うフォーム用の型。

import type { AvailabilityStatus, EmployeeSkill, SkillLevel } from '../../lib/types'

/** スキル行エディタの1行分の入力状態（年数はinput値をそのまま文字列で保持） */
export interface SkillDraft {
  key: string
  name: string
  years: string
  level: SkillLevel
}

export interface EmployeeFormState {
  name: string
  roles: string
  skills: SkillDraft[]
  status: AvailabilityStatus
  until: string
  location: string
  summary: string
}

export const EMPTY_FORM_STATE: EmployeeFormState = {
  name: '',
  roles: '',
  skills: [],
  status: 'available',
  until: '',
  location: '',
  summary: '',
}

export function skillToDraft(skill: EmployeeSkill, key: string): SkillDraft {
  return { key, name: skill.name, years: String(skill.years), level: skill.level }
}

export function draftToSkill(draft: SkillDraft): EmployeeSkill | undefined {
  const name = draft.name.trim()
  if (name === '') return undefined
  const years = Number(draft.years)
  return { name, years: Number.isFinite(years) ? years : 0, level: draft.level }
}
