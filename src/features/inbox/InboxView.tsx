// 案件受信箱。一覧・取込・詳細を1画面のフローとして提供する（Phase 3a 本実装）。

import { useEffect, useState } from 'react'
import { toProject, type IncomingMail } from '../../lib/mail'
import { deleteProject, getAllProjects, putProject } from '../../lib/db'
import { loadSettings } from '../../lib/settings'
import type { NavTarget } from '../navigation'
import type { Project } from '../../lib/types'
import ImportPanel from './ImportPanel'
import './inbox.css'
import ProjectDetail from './ProjectDetail'
import ProjectList from './ProjectList'
import { SAMPLE_MAILS } from './sampleMails'

// Phase 3a で本実装に置き換えるスタブ。propsの契約は変更しないこと。
type Props = {
  onNavigate: (target: NavTarget) => void
}

/** サンプルメールをIncomingMailへ変換する（受信日時はサンプルごとに数日ずらして一覧の順序を分かりやすくする） */
function sampleMailsToIncoming(now: Date): IncomingMail[] {
  return SAMPLE_MAILS.map((sample, index) => {
    const receivedAt = new Date(now.getTime() - index * 24 * 60 * 60 * 1000)
    return {
      source: 'paste' as const,
      subject: sample.subject,
      from: sample.from,
      receivedAt: receivedAt.toISOString(),
      bodyText: sample.bodyText,
    }
  })
}

export default function InboxView({ onNavigate }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [saveError, setSaveError] = useState('')
  const [gmailClientId] = useState(() => loadSettings().gmailClientId)

  useEffect(() => {
    let cancelled = false
    getAllProjects().then((loaded) => {
      if (!cancelled) {
        setProjects(loaded)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function sortByReceivedAtDesc(list: Project[]): Project[] {
    return [...list].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  }

  async function handleImport(mails: IncomingMail[]): Promise<void> {
    const now = new Date()
    const newProjects = mails.map((mail) => toProject(mail, now))
    await Promise.all(newProjects.map((p) => putProject(p)))
    setProjects((prev) => sortByReceivedAtDesc([...prev, ...newProjects]))
  }

  async function handleImportSample(): Promise<void> {
    const mails = sampleMailsToIncoming(new Date())
    await handleImport(mails)
  }

  async function handleDelete(project: Project): Promise<void> {
    await deleteProject(project.id)
    setProjects((prev) => prev.filter((p) => p.id !== project.id))
    if (selectedId === project.id) setSelectedId(undefined)
  }

  // Projectの永続化はここが単一所有者。子（抽出・マッチ・提案の各パネル）は更新オブジェクトを
  // 報告するだけでDBには書かない。
  async function handleProjectUpdated(updated: Project): Promise<void> {
    setProjects((prev) => sortByReceivedAtDesc(prev.map((p) => (p.id === updated.id ? updated : p))))
    try {
      await putProject(updated)
      setSaveError('')
    } catch {
      setSaveError('変更の保存に失敗しました。ブラウザのストレージ設定を確認してください。')
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedId)

  if (isLoading) {
    return <p className="note">案件を読み込んでいます…</p>
  }

  if (selectedProject) {
    return (
      <>
        {saveError && <p className="error-note">{saveError}</p>}
        <ProjectDetail
          project={selectedProject}
          onBack={() => setSelectedId(undefined)}
          onProjectUpdated={(updated) => void handleProjectUpdated(updated)}
          onOpenSettings={() => onNavigate('settings')}
        />
      </>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state">
        <p>案件はまだありません。メールを取り込んで抽出を始めましょう。</p>
        <button type="button" className="btn" onClick={() => void handleImportSample()}>
          サンプルメールで試す
        </button>
        <div className="section" style={{ textAlign: 'left', marginTop: 'var(--space-lg)' }}>
          <ImportPanel
            onImport={(mails) => void handleImport(mails)}
            gmailClientId={gmailClientId}
            onOpenSettings={() => onNavigate('settings')}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="section">
        <h2>取込</h2>
        <ImportPanel
          onImport={(mails) => void handleImport(mails)}
          gmailClientId={gmailClientId}
          onOpenSettings={() => onNavigate('settings')}
        />
      </section>

      <section className="section">
        <h2>案件一覧</h2>
        <ProjectList
          projects={projects}
          onOpen={(project) => setSelectedId(project.id)}
          onDelete={(project) => void handleDelete(project)}
        />
      </section>
    </div>
  )
}
