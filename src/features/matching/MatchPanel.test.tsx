// @vitest-environment jsdom
// MatchPanelの表示分岐（extracted無し／社員0／正常ランキング）と、
// 結果確定時にonResultsChangeが1回だけ発火する契約を検証する。
// ランキング計算は実物のrankEmployeesを通す（決定的スコアリングのため再現可能）。

import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getAllEmployees } from '../../lib/db'
import type { Employee, ExtractedProject, MatchResult, Project } from '../../lib/types'
import MatchPanel from './MatchPanel'

vi.mock('../../lib/db', () => ({
  getAllEmployees: vi.fn(),
}))

const NOW = '2026-07-01T00:00:00.000Z'

function makeExtracted(overrides: Partial<ExtractedProject> = {}): ExtractedProject {
  return {
    title: 'AWS基盤構築案件',
    summary: 'AWS環境の設計・構築を担当する案件。',
    skills: [{ name: 'AWS', kind: 'required' }],
    ...overrides,
  }
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    receivedAt: NOW,
    source: 'paste',
    rawText: '案件メール本文',
    status: 'new',
    createdAt: NOW,
    updatedAt: NOW,
    extracted: makeExtracted(),
    ...overrides,
  }
}

function makeEmployee(id: string, name: string, overrides: Partial<Employee> = {}): Employee {
  return {
    id,
    name,
    roles: ['インフラエンジニア'],
    skills: [],
    availability: { status: 'available' },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

/** AWS必須スキルを満たす高スコア候補 */
function makeStrongEmployee(): Employee {
  return makeEmployee('e1', '山田太郎', {
    skills: [{ name: 'AWS', years: 10, level: 'advanced' }],
  })
}

/** スキル未登録の低スコア候補 */
function makeWeakEmployee(): Employee {
  return makeEmployee('e2', '佐藤花子')
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(cleanup)

describe('MatchPanel 表示分岐', () => {
  test('extractedが無い場合は先に抽出を促す案内を表示する', async () => {
    // Arrange
    vi.mocked(getAllEmployees).mockResolvedValue([])
    const project = makeProject({ extracted: undefined })

    // Act
    render(<MatchPanel project={project} onOpenSettings={() => {}} />)
    await act(async () => {}) // 社員ロード完了まで待つ

    // Assert
    expect(screen.getByText('先に抽出を実行してください。')).toBeDefined()
  })

  test('社員が0人の場合は人材登録を促す案内を表示する', async () => {
    // Arrange
    vi.mocked(getAllEmployees).mockResolvedValue([])

    // Act
    render(<MatchPanel project={makeProject()} onOpenSettings={() => {}} />)

    // Assert
    expect(
      await screen.findByText('人材が未登録です。人材タブから登録してください。'),
    ).toBeDefined()
  })

  test('社員がいる場合はスコア降順のランキングを表示する', async () => {
    // Arrange（登録順に依存しないことを見るため低スコア候補を先に返す）
    vi.mocked(getAllEmployees).mockResolvedValue([makeWeakEmployee(), makeStrongEmployee()])

    // Act
    render(<MatchPanel project={makeProject()} onOpenSettings={() => {}} />)

    // Assert
    const items = await screen.findAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('山田太郎')).toBeDefined()
    expect(within(items[1]).getByText('佐藤花子')).toBeDefined()
  })
})

describe('MatchPanel onResultsChange契約', () => {
  test('結果確定時にonResultsChangeが1回だけ発火する', async () => {
    // Arrange
    const onResultsChange = vi.fn<(results: MatchResult[]) => void>()
    vi.mocked(getAllEmployees).mockResolvedValue([makeStrongEmployee(), makeWeakEmployee()])

    // Act
    render(
      <MatchPanel
        project={makeProject()}
        onOpenSettings={() => {}}
        onResultsChange={onResultsChange}
      />,
    )

    // Assert
    await waitFor(() => expect(onResultsChange).toHaveBeenCalledTimes(1))
    const results = onResultsChange.mock.calls[0][0]
    expect(results.map((r) => r.employeeId)).toEqual(['e1', 'e2'])
    expect(results.map((r) => r.projectId)).toEqual(['p1', 'p1'])
  })
})
