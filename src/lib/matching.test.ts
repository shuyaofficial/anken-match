import { describe, expect, test } from 'vitest'
import {
  applyRerank,
  buildRerankUserText,
  MatchingError,
  parseRerankResponse,
  rankEmployees,
  scoreEmployee,
} from './matching'
import type { Employee, ExtractedProject, MatchResult } from './types'

function makeProject(overrides: Partial<ExtractedProject> = {}): ExtractedProject {
  return {
    title: 'クラウド基盤構築',
    summary: 'AWS基盤の設計構築',
    skills: [
      { name: 'AWS', kind: 'required' },
      { name: 'Linux', kind: 'required' },
      { name: 'Terraform', kind: 'preferred' },
    ],
    ...overrides,
  }
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 'e1',
    name: '山田太郎',
    roles: ['インフラエンジニア'],
    skills: [],
    availability: { status: 'available' },
    createdAt: '2026-07-05T00:00:00Z',
    updatedAt: '2026-07-05T00:00:00Z',
    ...overrides,
  }
}

describe('scoreEmployee', () => {
  test('必須・歓迎とも十分な経験で満たすとスコア100になる', () => {
    const employee = makeEmployee({
      skills: [
        { name: 'AWS', years: 10, level: 'expert' },
        { name: 'Linux', years: 12, level: 'expert' },
        { name: 'Terraform', years: 10, level: 'advanced' },
      ],
    })

    const result = scoreEmployee(makeProject(), employee)

    expect(result.score).toBe(100)
    expect(result.breakdown.missingRequired).toEqual([])
  })

  test('必須スキル未充足はmissingRequiredに列挙されスコアが下がる', () => {
    const employee = makeEmployee({
      skills: [{ name: 'AWS', years: 5, level: 'advanced' }],
    })

    const result = scoreEmployee(makeProject(), employee)

    expect(result.breakdown.missingRequired).toEqual(['Linux'])
    expect(result.score).toBeLessThan(60)
  })

  test('社員スキルの表記ゆれ（別名）でも一致する', () => {
    const employee = makeEmployee({
      skills: [
        { name: 'amazon web services', years: 5, level: 'advanced' },
        { name: 'RHEL', years: 5, level: 'advanced' },
      ],
    })

    const result = scoreEmployee(makeProject(), employee)

    expect(result.breakdown.requiredCoverage).toBe(1)
  })

  test('スキルが一つも合わない社員は0点', () => {
    const employee = makeEmployee({ skills: [{ name: 'PHP', years: 8, level: 'expert' }] })

    const result = scoreEmployee(makeProject(), employee)

    expect(result.score).toBe(0)
  })

  test('必須スキルの無い案件でもNaNにならない', () => {
    const project = makeProject({ skills: [{ name: 'AWS', kind: 'preferred' }] })
    const employee = makeEmployee({ skills: [{ name: 'AWS', years: 3, level: 'intermediate' }] })

    const result = scoreEmployee(project, employee)

    expect(Number.isFinite(result.score)).toBe(true)
    expect(result.breakdown.requiredCoverage).toBe(1)
  })

  test('経験年数は10年で頭打ちになる', () => {
    const tenYears = makeEmployee({
      id: 'e10',
      skills: [{ name: 'AWS', years: 10, level: 'expert' }],
    })
    const twentyYears = makeEmployee({
      id: 'e20',
      skills: [{ name: 'AWS', years: 20, level: 'expert' }],
    })
    const project = makeProject({ skills: [{ name: 'AWS', kind: 'required' }] })

    expect(scoreEmployee(project, tenYears).score).toBe(scoreEmployee(project, twentyYears).score)
  })
})

describe('rankEmployees', () => {
  const strong = makeEmployee({
    id: 'strong',
    name: '佐藤',
    skills: [
      { name: 'AWS', years: 8, level: 'expert' },
      { name: 'Linux', years: 8, level: 'expert' },
      { name: 'Terraform', years: 4, level: 'advanced' },
    ],
  })
  const weak = makeEmployee({
    id: 'weak',
    name: '鈴木',
    skills: [{ name: 'AWS', years: 2, level: 'beginner' }],
  })
  const assigned = makeEmployee({
    id: 'assigned',
    name: '高橋',
    skills: strong.skills,
    availability: { status: 'assigned', until: '2026-09-30' },
  })

  test('スコア降順に並ぶ', () => {
    const results = rankEmployees(makeProject(), [weak, strong])

    expect(results.map((r) => r.employeeId)).toEqual(['strong', 'weak'])
  })

  test('アサイン中の社員は既定で除外される', () => {
    const results = rankEmployees(makeProject(), [strong, assigned])

    expect(results.map((r) => r.employeeId)).toEqual(['strong'])
  })

  test('includeAssignedオプションでアサイン中も含められる', () => {
    const results = rankEmployees(makeProject(), [strong, assigned], { includeAssigned: true })

    expect(results).toHaveLength(2)
  })

  test('projectIdが結果に引き継がれる', () => {
    const results = rankEmployees(makeProject(), [strong], { projectId: 'p1' })

    expect(results[0]?.projectId).toBe('p1')
  })
})

function makeResult(employeeId: string, score: number): MatchResult {
  return {
    projectId: 'p1',
    employeeId,
    score,
    breakdown: {
      requiredCoverage: 1,
      preferredCoverage: 1,
      experienceBonus: 1,
      missingRequired: [],
      matchedSkills: [],
    },
  }
}

describe('parseRerankResponse', () => {
  test('有効な応答をランク昇順で返す', () => {
    const response = JSON.stringify([
      { employeeId: 'b', rank: 2, rationale: '次点' },
      { employeeId: 'a', rank: 1, rationale: '最有力' },
    ])

    const entries = parseRerankResponse(response, ['a', 'b'])

    expect(entries.map((e) => e.employeeId)).toEqual(['a', 'b'])
  })

  test('未知のemployeeIdは捨てる', () => {
    const response = JSON.stringify([
      { employeeId: 'a', rank: 1, rationale: '' },
      { employeeId: 'intruder', rank: 2, rationale: '' },
    ])

    const entries = parseRerankResponse(response, ['a'])

    expect(entries).toHaveLength(1)
  })

  test('有効エントリが無ければMatchingErrorを投げる', () => {
    const response = JSON.stringify([{ employeeId: 'intruder', rank: 1 }])

    expect(() => parseRerankResponse(response, ['a'])).toThrow(MatchingError)
  })

  test('JSON配列を含まない応答はMatchingErrorを投げる', () => {
    expect(() => parseRerankResponse('並べ替えできません', ['a'])).toThrow(MatchingError)
  })
})

describe('applyRerank', () => {
  test('再ランク順が先頭に来て、対象外はスコア順のまま後続する', () => {
    const results = [makeResult('a', 90), makeResult('b', 80), makeResult('c', 70)]
    const rerank = [
      { employeeId: 'b', llmRank: 1, llmRationale: '実質要件を満たす' },
      { employeeId: 'a', llmRank: 2, llmRationale: '' },
    ]

    const merged = applyRerank(results, rerank)

    expect(merged.map((r) => r.employeeId)).toEqual(['b', 'a', 'c'])
    expect(merged[0]?.llmRationale).toBe('実質要件を満たす')
  })

  test('元の配列をミューテートしない', () => {
    const results = [makeResult('a', 90)]
    const before = JSON.stringify(results)

    applyRerank(results, [{ employeeId: 'a', llmRank: 1, llmRationale: 'x' }])

    expect(JSON.stringify(results)).toBe(before)
  })
})

describe('buildRerankUserText', () => {
  test('案件と候補者の要点を含む', () => {
    const employee = makeEmployee({ id: 'e1', name: '佐藤' })
    const text = buildRerankUserText(makeProject(), [
      { employee, result: makeResult('e1', 88) },
    ])

    expect(text).toContain('クラウド基盤構築')
    expect(text).toContain('佐藤')
    expect(text).toContain('88')
  })
})
