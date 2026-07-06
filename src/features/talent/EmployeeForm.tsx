import { useState } from 'react'
import type { AvailabilityStatus, Employee } from '../../lib/types'
import SkillRow, { KnownSkillsDatalist } from './SkillRow'
import { draftToSkill, type EmployeeFormState, type SkillDraft } from './types'

const MIN_YEARS = 0
const MAX_YEARS = 50

const STATUS_OPTIONS: { value: AvailabilityStatus; label: string }[] = [
  { value: 'available', label: '提案可' },
  { value: 'assigned', label: 'アサイン中' },
]

type Props = {
  initial: EmployeeFormState
  /** 新規追加か編集か。ラベルや削除ボタンの出し分けに使う */
  mode: 'create' | 'edit'
  onSubmit: (employee: {
    name: string
    roles: string[]
    skills: Employee['skills']
    availability: Employee['availability']
    location?: string
    summary?: string
  }) => void
  onCancel: () => void
  onDelete?: () => void
}

function nextSkillKey(skills: SkillDraft[]): string {
  return `skill-${skills.length}-${Date.now()}`
}

/** 入力を検証する。問題なければ null、あれば一文のエラーメッセージを返す */
function validate(state: EmployeeFormState): string | null {
  if (state.name.trim() === '') return '氏名を入力してください。'
  for (const skill of state.skills) {
    if (skill.name.trim() === '') continue
    const years = Number(skill.years)
    if (!Number.isFinite(years) || years < MIN_YEARS || years > MAX_YEARS) {
      return `スキル「${skill.name}」の年数は${MIN_YEARS}〜${MAX_YEARS}の範囲で入力してください。`
    }
  }
  return null
}

/** 追加・編集共通のインライン展開フォーム。 */
export default function EmployeeForm({ initial, mode, onSubmit, onCancel, onDelete }: Props) {
  const [state, setState] = useState<EmployeeFormState>(initial)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function handleAddSkill(): void {
    setState({
      ...state,
      skills: [...state.skills, { key: nextSkillKey(state.skills), name: '', years: '0', level: 'intermediate' }],
    })
  }

  function handleSkillChange(index: number, next: SkillDraft): void {
    setState({
      ...state,
      skills: state.skills.map((s, i) => (i === index ? next : s)),
    })
  }

  function handleSkillRemove(index: number): void {
    setState({ ...state, skills: state.skills.filter((_, i) => i !== index) })
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    const validationError = validate(state)
    if (validationError !== null) {
      setError(validationError)
      return
    }
    setError('')
    onSubmit({
      name: state.name.trim(),
      roles: state.roles
        .split(/[、,;]/)
        .map((r) => r.trim())
        .filter((r) => r !== ''),
      skills: state.skills.flatMap((draft) => {
        const skill = draftToSkill(draft)
        return skill === undefined ? [] : [skill]
      }),
      availability: {
        status: state.status,
        until: state.until.trim() === '' ? undefined : state.until,
      },
      location: state.location.trim() === '' ? undefined : state.location.trim(),
      summary: state.summary.trim() === '' ? undefined : state.summary.trim(),
    })
  }

  return (
    <form className="employee-form card" onSubmit={handleSubmit}>
      <KnownSkillsDatalist />
      <h3>{mode === 'create' ? '人材を追加' : '人材を編集'}</h3>

      <label className="form-field">
        <span>氏名</span>
        <input
          type="text"
          value={state.name}
          onChange={(e) => setState({ ...state, name: e.target.value })}
          required
        />
      </label>

      <label className="form-field">
        <span>ロール（読点区切り。例: ネットワークエンジニア、PM）</span>
        <input
          type="text"
          value={state.roles}
          onChange={(e) => setState({ ...state, roles: e.target.value })}
        />
      </label>

      <fieldset className="form-field">
        <legend>スキル</legend>
        {state.skills.map((draft, i) => (
          <SkillRow
            key={draft.key}
            draft={draft}
            onChange={(next) => handleSkillChange(i, next)}
            onRemove={() => handleSkillRemove(i)}
          />
        ))}
        <button type="button" className="btn-quiet" onClick={handleAddSkill}>
          + スキルを追加
        </button>
      </fieldset>

      <div className="form-row">
        <label className="form-field">
          <span>稼働状況</span>
          <select
            value={state.status}
            onChange={(e) => setState({ ...state, status: e.target.value as AvailabilityStatus })}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {state.status === 'assigned' && (
          <label className="form-field">
            <span>アサイン終了予定日</span>
            <input
              type="date"
              value={state.until}
              onChange={(e) => setState({ ...state, until: e.target.value })}
            />
          </label>
        )}

        <label className="form-field">
          <span>拠点</span>
          <input
            type="text"
            value={state.location}
            placeholder="例: 東京・品川、フルリモート"
            onChange={(e) => setState({ ...state, location: e.target.value })}
          />
        </label>
      </div>

      <label className="form-field">
        <span>経歴サマリ</span>
        <p className="note" style={{ margin: '0 0 4px' }}>
          提案文を書く際の材料になります。得意領域や実績を2文程度で。
        </p>
        <textarea
          value={state.summary}
          rows={3}
          onChange={(e) => setState({ ...state, summary: e.target.value })}
        />
      </label>

      {error && <p className="error-note">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn">
          {mode === 'create' ? '追加する' : '保存する'}
        </button>
        <button type="button" className="btn-quiet" onClick={onCancel}>
          キャンセル
        </button>
        {mode === 'edit' && onDelete !== undefined && (
          <>
            {showDeleteConfirm ? (
              <span className="delete-confirm">
                本当に削除しますか？
                <button type="button" className="btn-danger" onClick={onDelete}>
                  削除する
                </button>
                <button type="button" className="btn-quiet" onClick={() => setShowDeleteConfirm(false)}>
                  やめる
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn-danger"
                style={{ marginLeft: 'auto' }}
                onClick={() => setShowDeleteConfirm(true)}
              >
                この人材を削除
              </button>
            )}
          </>
        )}
      </div>
    </form>
  )
}
