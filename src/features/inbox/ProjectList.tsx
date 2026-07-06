// 案件一覧。receivedAt降順で表示。行クリックで詳細へ、削除は確認つき。

import { useState } from 'react'
import type { Project, ProjectStatus } from '../../lib/types'

const STATUS_LABEL: Record<ProjectStatus, string> = {
  new: '未対応',
  matched: 'マッチ済み',
  proposed: '提案済み',
  closed: '完了',
}

const SOURCE_LABEL: Record<Project['source'], string> = {
  paste: '貼り付け',
  file: 'ファイル',
  gmail: 'Gmail',
}

const SKILL_PREVIEW_COUNT = 4

function formatReceivedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type Props = {
  projects: Project[]
  onOpen: (project: Project) => void
  onDelete: (project: Project) => void
}

export default function ProjectList({ projects, onOpen, onDelete }: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  function handleConfirmDelete(project: Project): void {
    setConfirmingId(null)
    onDelete(project)
  }

  return (
    <div className="table-scroll">
      <table className="project-table">
      <thead>
        <tr>
          <th>件名</th>
          <th>取込元</th>
          <th>ステータス</th>
          <th>受信日</th>
          <th>スキル</th>
          <th aria-label="操作" />
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => {
          const title = project.extracted?.title ?? project.subject ?? '(件名なし)'
          const skills = project.extracted?.skills ?? []
          const preview = skills.slice(0, SKILL_PREVIEW_COUNT)
          const remaining = skills.length - preview.length

          return (
            <tr key={project.id} className="project-row">
              <td className="project-title-cell">
                <button type="button" className="project-title-button" onClick={() => onOpen(project)}>
                  {title}
                </button>
              </td>
              <td className="note">{SOURCE_LABEL[project.source]}</td>
              <td>
                <span className={`status-badge status-badge--${project.status}`}>
                  {STATUS_LABEL[project.status]}
                </span>
              </td>
              <td className="note tabular">{formatReceivedAt(project.receivedAt)}</td>
              <td>
                <div className="skill-tag-row">
                  {preview.map((skill) => (
                    <span
                      key={skill.name}
                      className={`skill-tag${skill.kind === 'required' ? ' required' : ''}`}
                    >
                      {skill.name}
                    </span>
                  ))}
                  {remaining > 0 && <span className="note">+{remaining}</span>}
                  {skills.length === 0 && <span className="note">未抽出</span>}
                </div>
              </td>
              <td>
                {confirmingId === project.id ? (
                  <span className="delete-confirm">
                    削除しますか？
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleConfirmDelete(project)}
                    >
                      削除する
                    </button>
                    <button type="button" className="btn-quiet" onClick={() => setConfirmingId(null)}>
                      取消
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-danger project-delete"
                    onClick={() => setConfirmingId(project.id)}
                  >
                    削除
                  </button>
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
    </div>
  )
}
