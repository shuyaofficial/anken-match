// @vitest-environment jsdom
// InboxViewの永続化契約テスト。
// 子（詳細画面）は更新オブジェクトを親へ報告するだけで、DB書き込み（putProject）は
// InboxViewが単一所有者としてちょうど1回行う — この契約を検証する。

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getAllProjects, putProject } from '../../lib/db'
import type { Project } from '../../lib/types'
import InboxView from './InboxView'

vi.mock('../../lib/db', () => ({
  getAllProjects: vi.fn(),
  putProject: vi.fn(),
  deleteProject: vi.fn(),
}))

// 詳細画面は「更新オブジェクトを親へ報告する」契約だけを再現するスタブに差し替える
vi.mock('./ProjectDetail', async () => {
  const { createElement } = await import('react')
  type StubProps = {
    project: Project
    onProjectUpdated: (updated: Project) => void
  }
  return {
    default: ({ project, onProjectUpdated }: StubProps) =>
      createElement(
        'button',
        {
          type: 'button',
          onClick: () => onProjectUpdated({ ...project, status: 'closed' }),
        },
        '更新を報告',
      ),
  }
})

const SAVE_ERROR_MESSAGE = '変更の保存に失敗しました。ブラウザのストレージ設定を確認してください。'

function makeProject(overrides: Partial<Project> = {}): Project {
  const now = '2026-07-01T00:00:00.000Z'
  return {
    id: 'p1',
    receivedAt: now,
    source: 'paste',
    subject: 'NW運用案件',
    rawText: '案件メール本文',
    status: 'new',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(cleanup)

describe('InboxView 永続化契約', () => {
  test('子が更新を報告するとputProjectをちょうど1回呼ぶ', async () => {
    // Arrange
    const project = makeProject()
    vi.mocked(getAllProjects).mockResolvedValue([project])
    vi.mocked(putProject).mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<InboxView onNavigate={() => {}} />)

    // Act
    await user.click(await screen.findByRole('button', { name: 'NW運用案件' }))
    await user.click(await screen.findByRole('button', { name: '更新を報告' }))

    // Assert
    await waitFor(() => expect(putProject).toHaveBeenCalledTimes(1))
    expect(putProject).toHaveBeenCalledWith({ ...project, status: 'closed' })
    expect(screen.queryByText(SAVE_ERROR_MESSAGE)).toBeNull()
  })

  test('保存に失敗するとエラーメッセージを表示する', async () => {
    // Arrange
    const project = makeProject()
    vi.mocked(getAllProjects).mockResolvedValue([project])
    vi.mocked(putProject).mockRejectedValue(new Error('storage full'))
    const user = userEvent.setup()
    render(<InboxView onNavigate={() => {}} />)

    // Act
    await user.click(await screen.findByRole('button', { name: 'NW運用案件' }))
    await user.click(await screen.findByRole('button', { name: '更新を報告' }))

    // Assert
    expect(await screen.findByText(SAVE_ERROR_MESSAGE)).toBeDefined()
  })
})
