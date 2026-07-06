import type { Employee } from '../../lib/types'

const MAX_VISIBLE_SKILLS = 3

function formatAvailability(availability: Employee['availability']): string {
  if (availability.status === 'available') return '提案可'
  if (availability.until !== undefined && availability.until !== '') {
    return `アサイン中（〜${availability.until}）`
  }
  return 'アサイン中'
}

type Props = {
  employees: Employee[]
  onSelect: (employee: Employee) => void
}

/** 人材一覧テーブル。DESIGN.md準拠（横罫のみ・行ホバーaccent-soft）。行クリックで編集へ。 */
export default function EmployeeTable({ employees, onSelect }: Props) {
  return (
    <div className="table-scroll">
      <table className="employee-table">
      <thead>
        <tr>
          <th>氏名</th>
          <th>ロール</th>
          <th>スキル</th>
          <th>稼働状況</th>
          <th>拠点</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => {
          const visibleSkills = employee.skills.slice(0, MAX_VISIBLE_SKILLS)
          const hiddenCount = employee.skills.length - visibleSkills.length
          return (
            <tr key={employee.id}>
              <td className="employee-name-cell">
                <button type="button" className="employee-name-button" onClick={() => onSelect(employee)}>
                  {employee.name}
                </button>
              </td>
              <td>{employee.roles.join('、') || '—'}</td>
              <td>
                <div className="skill-tag-list">
                  {visibleSkills.map((skill) => (
                    <span key={skill.name} className="skill-tag">
                      {skill.name}
                    </span>
                  ))}
                  {hiddenCount > 0 && <span className="skill-tag">+{hiddenCount}</span>}
                  {employee.skills.length === 0 && <span className="note">—</span>}
                </div>
              </td>
              <td>
                <span className={employee.availability.status === 'available' ? undefined : 'note'}>
                  {formatAvailability(employee.availability)}
                </span>
              </td>
              <td>{employee.location ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}
