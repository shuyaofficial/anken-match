import { useState } from 'react'
import InboxView from './features/inbox/InboxView'
import type { NavTarget } from './features/navigation'
import SettingsView from './features/settings/SettingsView'
import TalentView from './features/talent/TalentView'
import TrendsView from './features/trends/TrendsView'

const VIEWS: { id: NavTarget; label: string }[] = [
  { id: 'projects', label: '案件' },
  { id: 'employees', label: '人材' },
  { id: 'trends', label: 'トレンド' },
  { id: 'settings', label: '設定' },
]

export default function App() {
  const [view, setView] = useState<NavTarget>('projects')

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">内容抽出</h1>
        <nav className="tab-nav" aria-label="メインナビゲーション">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={view === v.id ? 'active' : undefined}
              aria-current={view === v.id ? 'page' : undefined}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </header>
      <main>
        {view === 'projects' && <InboxView onNavigate={setView} />}
        {view === 'employees' && <TalentView onNavigate={setView} />}
        {view === 'trends' && <TrendsView onNavigate={setView} />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  )
}
