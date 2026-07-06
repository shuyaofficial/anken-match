import { knownSkills } from '../../lib/normalize'
import type { SkillLevel } from '../../lib/types'
import type { SkillDraft } from './types'

const SKILL_LEVEL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '上級' },
  { value: 'expert', label: 'エキスパート' },
]

const KNOWN_SKILLS_DATALIST_ID = 'talent-known-skills'

type Props = {
  draft: SkillDraft
  onChange: (next: SkillDraft) => void
  onRemove: () => void
}

/** スキル1行分の入力行（スキル名サジェスト＋年数＋レベル）。 */
export default function SkillRow({ draft, onChange, onRemove }: Props) {
  return (
    <div className="skill-row">
      <input
        type="text"
        list={KNOWN_SKILLS_DATALIST_ID}
        value={draft.name}
        placeholder="スキル名"
        aria-label="スキル名"
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
      />
      <input
        type="number"
        min={0}
        max={50}
        value={draft.years}
        aria-label="経験年数"
        className="tabular"
        onChange={(e) => onChange({ ...draft, years: e.target.value })}
      />
      <select
        value={draft.level}
        aria-label="習熟レベル"
        onChange={(e) => onChange({ ...draft, level: e.target.value as SkillLevel })}
      >
        {SKILL_LEVEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button type="button" className="btn-quiet" onClick={onRemove} aria-label="このスキルを削除">
        削除
      </button>
    </div>
  )
}

/** knownSkills() のサジェスト用datalist。フォーム内に1つだけ配置する。 */
export function KnownSkillsDatalist() {
  return (
    <datalist id={KNOWN_SKILLS_DATALIST_ID}>
      {knownSkills().map((skill) => (
        <option key={skill} value={skill}>
          {skill}
        </option>
      ))}
    </datalist>
  )
}
