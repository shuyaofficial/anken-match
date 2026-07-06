import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAllData,
  deleteEmployee,
  deleteMatchRecord,
  deleteProject,
  getAllEmployees,
  getAllMatchRecords,
  getAllProjects,
  getEmployee,
  getMatchRecord,
  getProject,
  newId,
  putEmployee,
  putMatchRecord,
  putProject,
} from './db'
import type { Employee, MatchResult, Project } from './types'

function makeProject(id: string, overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString()
  return {
    id,
    receivedAt: now,
    source: 'paste',
    rawText: '案件メール本文',
    status: 'new',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeEmployee(id: string, overrides: Partial<Employee> = {}): Employee {
  const now = new Date().toISOString()
  return {
    id,
    name: 'テスト太郎',
    roles: ['インフラエンジニア'],
    skills: [],
    availability: { status: 'available' },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeMatchResult(projectId: string, employeeId: string): MatchResult {
  return {
    projectId,
    employeeId,
    score: 80,
    breakdown: {
      requiredCoverage: 1,
      preferredCoverage: 0.5,
      experienceBonus: 0.1,
      missingRequired: [],
      matchedSkills: ['AWS'],
    },
  }
}

beforeEach(async () => {
  await clearAllData()
})

describe('projects store', () => {
  it('put/get/getAllで案件を保存・取得できる', async () => {
    const project = makeProject('p1')
    await putProject(project)

    expect(await getProject('p1')).toEqual(project)
    expect(await getAllProjects()).toHaveLength(1)
  })

  it('getAllProjectsはcreatedAt降順で返す', async () => {
    await putProject(makeProject('older', { createdAt: '2026-01-01T00:00:00.000Z' }))
    await putProject(makeProject('newer', { createdAt: '2026-06-01T00:00:00.000Z' }))

    const all = await getAllProjects()
    expect(all.map((p) => p.id)).toEqual(['newer', 'older'])
  })

  it('deleteProjectで削除できる', async () => {
    await putProject(makeProject('p1'))
    await deleteProject('p1')
    expect(await getProject('p1')).toBeUndefined()
    expect(await getAllProjects()).toHaveLength(0)
  })

  it('存在しないidのgetProjectはundefinedを返す', async () => {
    expect(await getProject(newId())).toBeUndefined()
  })
})

describe('employees store', () => {
  it('put/get/getAllで人材を保存・取得できる', async () => {
    const employee = makeEmployee('e1')
    await putEmployee(employee)

    expect(await getEmployee('e1')).toEqual(employee)
    expect(await getAllEmployees()).toHaveLength(1)
  })

  it('deleteEmployeeで削除できる', async () => {
    await putEmployee(makeEmployee('e1'))
    await deleteEmployee('e1')
    expect(await getEmployee('e1')).toBeUndefined()
    expect(await getAllEmployees()).toHaveLength(0)
  })
})

describe('matches store', () => {
  it('projectIdをキーにマッチ結果一式を保存・取得できる', async () => {
    const record = {
      projectId: 'p1',
      results: [makeMatchResult('p1', 'e1'), makeMatchResult('p1', 'e2')],
      computedAt: new Date().toISOString(),
    }
    await putMatchRecord(record)

    const got = await getMatchRecord('p1')
    expect(got).toEqual(record)
    expect(got?.results).toHaveLength(2)
  })

  it('同じprojectIdで上書き保存すると最新のみ残る（イミュータブルな新レコード）', async () => {
    const first = {
      projectId: 'p1',
      results: [makeMatchResult('p1', 'e1')],
      computedAt: '2026-01-01T00:00:00.000Z',
    }
    const second = {
      ...first,
      results: [makeMatchResult('p1', 'e1'), makeMatchResult('p1', 'e2')],
      computedAt: '2026-02-01T00:00:00.000Z',
    }
    await putMatchRecord(first)
    await putMatchRecord(second)

    const got = await getMatchRecord('p1')
    expect(got?.results).toHaveLength(2)
    expect(got?.computedAt).toBe('2026-02-01T00:00:00.000Z')
    expect(await getAllMatchRecords()).toHaveLength(1)
  })

  it('deleteMatchRecordで削除できる', async () => {
    await putMatchRecord({ projectId: 'p1', results: [], computedAt: new Date().toISOString() })
    await deleteMatchRecord('p1')
    expect(await getMatchRecord('p1')).toBeUndefined()
    expect(await getAllMatchRecords()).toHaveLength(0)
  })
})

describe('clearAllData', () => {
  it('全ストアを空にする', async () => {
    await putProject(makeProject('p1'))
    await putEmployee(makeEmployee('e1'))
    await putMatchRecord({ projectId: 'p1', results: [], computedAt: new Date().toISOString() })

    await clearAllData()

    expect(await getAllProjects()).toHaveLength(0)
    expect(await getAllEmployees()).toHaveLength(0)
    expect(await getAllMatchRecords()).toHaveLength(0)
  })
})
