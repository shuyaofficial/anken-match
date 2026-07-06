// @vitest-environment jsdom
// ProposalPanelの表示分岐を検証する。
// results=null（マッチ未実行）は案内文、候補ありはスコア順の候補者selectを表示する。

import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { getAllEmployees } from '../../lib/db'
import type { Employee, MatchResult, Project } from '../../lib/types'
import ProposalPanel from './ProposalPanel'

vi.mock('../../lib/db', () => ({
  getAllEmployees: vi.fn(),
}))

const NOW = '2026-07-01T00:00:00.000Z'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    receivedAt: NOW,
    source: 'paste',
    rawText: '案件メール本文',
    status: 'matched',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function makeEmployee(id: string, name: string): Employee {
  return {
    id,
    name,
    roles: ['インフラエンジニア'],
    skills: [],
    availability: { status: 'available' },
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function makeResult(employeeId: string, score: number): MatchResult {
  return {
    projectId: 'p1',
    employeeId,
    score,
    breakdown: {
      requiredCoverage: 1,
      preferredCoverage: 0.5,
      experienceBonus: 0.1,
      missingRequired: [],
      matchedSkills: ['AWS'],
    },
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(cleanup)

describe('ProposalPanel 表示分岐', () => {
  test('resultsがnullの場合はマッチング実行を促す案内を表示する', async () => {
    // Arrange
    vi.mocked(getAllEmployees).mockResolvedValue([])

    // Act
    render(<ProposalPanel project={makeProject()} results={null} onOpenSettings={() => {}} />)
    await act(async () => {}) // 社員ロード完了まで待つ

    // Assert
    expect(screen.getByText('先にマッチングを実行してください。')).toBeDefined()
  })

  test('候補がある場合はスコア順の候補者selectを表示する', async () => {
    // Arrange（登録順に依存しないことを見るため低スコア候補を先に渡す）
    vi.mocked(getAllEmployees).mockResolvedValue([
      makeEmployee('e1', '山田太郎'),
      makeEmployee('e2', '佐藤花子'),
    ])
    const results = [makeResult('e2', 60), makeResult('e1', 90)]

    // Act
    render(<ProposalPanel project={makeProject()} results={results} onOpenSettings={() => {}} />)

    // Assert
    expect(await screen.findByRole('option', { name: '1位・山田太郎（90点）' })).toBeDefined()
    expect(screen.getByRole('option', { name: '2位・佐藤花子（60点）' })).toBeDefined()
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('e1')
  })
})
