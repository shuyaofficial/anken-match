import { useEffect, useState } from 'react'
import { deleteEmployee, getAllEmployees, newId, putEmployee } from '../../lib/db'
import type { Employee } from '../../lib/types'
import type { NavTarget } from '../navigation'
import EmployeeForm from './EmployeeForm'
import EmployeeTable from './EmployeeTable'
import ImportExportPanel from './ImportExportPanel'
import { createSeedEmployees } from './seedEmployees'
import './talent.css'
import { EMPTY_FORM_STATE, skillToDraft, type EmployeeFormState } from './types'

type Props = {
  onNavigate: (target: NavTarget) => void
}

type PanelState = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; employee: Employee }

function employeeToFormState(employee: Employee): EmployeeFormState {
  return {
    name: employee.name,
    roles: employee.roles.join('、'),
    skills: employee.skills.map((s, i) => skillToDraft(s, `${employee.id}-${i}`)),
    status: employee.availability.status,
    until: employee.availability.until ?? '',
    location: employee.location ?? '',
    summary: employee.summary ?? '',
  }
}

export default function TalentView({ onNavigate }: Props) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [panel, setPanel] = useState<PanelState>({ mode: 'closed' })
  const [seedNotice, setSeedNotice] = useState('')
  const [showSeedConfirm, setShowSeedConfirm] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAllEmployees().then((all) => {
      if (!cancelled) {
        setEmployees(all)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function refresh(): Promise<void> {
    setEmployees(await getAllEmployees())
  }

  async function handleFormSubmit(input: {
    name: string
    roles: string[]
    skills: Employee['skills']
    availability: Employee['availability']
    location?: string
    summary?: string
  }): Promise<void> {
    const now = new Date().toISOString()
    if (panel.mode === 'edit') {
      const updated: Employee = { ...panel.employee, ...input, updatedAt: now }
      await putEmployee(updated)
    } else {
      const created: Employee = { id: newId(), ...input, createdAt: now, updatedAt: now }
      await putEmployee(created)
    }
    setPanel({ mode: 'closed' })
    await refresh()
  }

  async function handleDelete(): Promise<void> {
    if (panel.mode !== 'edit') return
    await deleteEmployee(panel.employee.id)
    setPanel({ mode: 'closed' })
    await refresh()
  }

  async function runSeed(): Promise<void> {
    setShowSeedConfirm(false)
    await Promise.all(createSeedEmployees().map((employee) => putEmployee(employee)))
    setSeedNotice('デモ社員20名を投入しました。')
    await refresh()
  }

  function handleSeed(): void {
    if (employees.length > 0) {
      setShowSeedConfirm(true)
      return
    }
    void runSeed()
  }

  async function handleImport(imported: Employee[]): Promise<void> {
    await Promise.all(imported.map((employee) => putEmployee(employee)))
    await refresh()
  }

  if (isLoading) {
    return <p className="hint">人材データを読み込んでいます…</p>
  }

  if (employees.length === 0 && panel.mode === 'closed') {
    return (
      <div className="empty-state">
        <p>人材が未登録です。デモデータを投入するか、追加して始めましょう。</p>
        <div className="form-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" onClick={handleSeed}>
            デモ社員20名を投入
          </button>
          <button type="button" className="btn-quiet" onClick={() => setPanel({ mode: 'create' })}>
            人材を追加
          </button>
        </div>
        {showSeedConfirm && (
          <p className="delete-confirm" style={{ justifyContent: 'center' }}>
            既に{employees.length}名登録されています。デモ社員20名を追加投入しますか？
            <button type="button" className="btn-danger" onClick={() => void runSeed()}>
              投入する
            </button>
            <button type="button" className="btn-quiet" onClick={() => setShowSeedConfirm(false)}>
              取消
            </button>
          </p>
        )}
        <div style={{ marginTop: 'var(--space-lg)', textAlign: 'left' }}>
          <ImportExportPanel employees={employees} onImport={handleImport} />
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="section">
        <div className="section-header-row">
          <h2>人材一覧（{employees.length}名）</h2>
          <button type="button" className="btn" onClick={() => setPanel({ mode: 'create' })}>
            人材を追加
          </button>
        </div>

        {seedNotice && <p className="note">{seedNotice}</p>}

        {panel.mode === 'create' && (
          <EmployeeForm
            key="create"
            mode="create"
            initial={EMPTY_FORM_STATE}
            onSubmit={handleFormSubmit}
            onCancel={() => setPanel({ mode: 'closed' })}
          />
        )}

        {panel.mode === 'edit' && (
          <EmployeeForm
            key={panel.employee.id}
            mode="edit"
            initial={employeeToFormState(panel.employee)}
            onSubmit={handleFormSubmit}
            onCancel={() => setPanel({ mode: 'closed' })}
            onDelete={handleDelete}
          />
        )}

        <EmployeeTable
          employees={employees}
          onSelect={(employee) => setPanel({ mode: 'edit', employee })}
        />
      </section>

      <section className="section">
        <h2>インポート・エクスポート</h2>
        <ImportExportPanel employees={employees} onImport={handleImport} />
      </section>

      <div className="form-actions" style={{ marginTop: 'var(--space-lg)' }}>
        <button type="button" className="btn-quiet" onClick={() => onNavigate('projects')}>
          案件タブへ戻る
        </button>
      </div>
    </div>
  )
}
