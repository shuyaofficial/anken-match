import { describe, expect, test } from 'vitest'
import {
  computeMonthlyCounts,
  computeRemoteBreakdown,
  computeSkillDemand,
  computeSkillTrendChanges,
  extractedOnly,
  filterByPeriod,
} from './trendsData'
import type { ExtractedProject, Project } from '../../lib/types'

const NOW = new Date('2026-07-05T12:00:00Z')

function makeExtracted(overrides: Partial<ExtractedProject> = {}): ExtractedProject {
  return {
    title: '案件',
    summary: '概要',
    skills: [],
    ...overrides,
  }
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: crypto.randomUUID(),
    receivedAt: NOW.toISOString(),
    source: 'paste',
    rawText: '',
    status: 'new',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    extracted: makeExtracted(),
    ...overrides,
  }
}

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

describe('extractedOnly', () => {
  test('extracted未設定の案件は除外する', () => {
    // Arrange
    const projects = [
      makeProject({ extracted: undefined }),
      makeProject({ extracted: makeExtracted() }),
    ]

    // Act
    const result = extractedOnly(projects)

    // Assert
    expect(result).toHaveLength(1)
  })
})

describe('filterByPeriod', () => {
  test('allは全件そのまま返す', () => {
    // Arrange
    const projects = [makeProject({ receivedAt: daysAgo(400) })]

    // Act
    const result = filterByPeriod(projects, 'all', NOW)

    // Assert
    expect(result).toHaveLength(1)
  })

  test('90dは直近90日以内のみ含む', () => {
    // Arrange
    const projects = [
      makeProject({ id: 'in', receivedAt: daysAgo(89) }),
      makeProject({ id: 'out', receivedAt: daysAgo(91) }),
    ]

    // Act
    const result = filterByPeriod(projects, '90d', NOW)

    // Assert
    expect(result.map((p) => p.id)).toEqual(['in'])
  })

  test('30dは直近30日以内のみ含む', () => {
    // Arrange
    const projects = [
      makeProject({ id: 'in', receivedAt: daysAgo(29) }),
      makeProject({ id: 'out', receivedAt: daysAgo(31) }),
    ]

    // Act
    const result = filterByPeriod(projects, '30d', NOW)

    // Assert
    expect(result.map((p) => p.id)).toEqual(['in'])
  })

  test('未来日時や不正な日付は含めない', () => {
    // Arrange
    const projects = [
      makeProject({ id: 'future', receivedAt: daysAgo(-5) }),
      makeProject({ id: 'invalid', receivedAt: 'not-a-date' }),
    ]

    // Act
    const result = filterByPeriod(projects, '30d', NOW)

    // Assert
    expect(result).toHaveLength(0)
  })
})

describe('computeSkillDemand', () => {
  test('required/preferredを区別せず出現件数で数える', () => {
    // Arrange
    const projects = [
      makeProject({
        extracted: makeExtracted({
          skills: [
            { name: 'AWS', kind: 'required' },
            { name: 'AWS', kind: 'preferred' },
          ],
        }),
      }),
    ]

    // Act
    const result = computeSkillDemand(projects)

    // Assert
    expect(result[0]).toEqual({ name: 'AWS', count: 2 })
  })

  test('表記ゆれはskillKeyで正規化して束ね、表示名はcanonical名にする', () => {
    // Arrange
    const projects = [
      makeProject({
        extracted: makeExtracted({ skills: [{ name: 'k8s', kind: 'required' }] }),
      }),
      makeProject({
        extracted: makeExtracted({ skills: [{ name: 'Kubernetes', kind: 'preferred' }] }),
      }),
      makeProject({
        extracted: makeExtracted({ skills: [{ name: 'クバネティス', kind: 'required' }] }),
      }),
    ]

    // Act
    const result = computeSkillDemand(projects)

    // Assert
    expect(result).toEqual([{ name: 'Kubernetes', count: 3 }])
  })

  test('件数降順・同数は名前昇順で並び、topNで切り詰める', () => {
    // Arrange
    const projects = [
      makeProject({ extracted: makeExtracted({ skills: [{ name: 'AWS', kind: 'required' }] }) }),
      makeProject({ extracted: makeExtracted({ skills: [{ name: 'AWS', kind: 'required' }] }) }),
      makeProject({ extracted: makeExtracted({ skills: [{ name: 'Azure', kind: 'required' }] }) }),
      makeProject({ extracted: makeExtracted({ skills: [{ name: 'GCP', kind: 'required' }] }) }),
    ]

    // Act
    const result = computeSkillDemand(projects, 2)

    // Assert
    expect(result).toEqual([
      { name: 'AWS', count: 2 },
      { name: 'Azure', count: 1 },
    ])
  })

  test('extracted未設定の案件は集計対象外', () => {
    // Arrange
    const projects = [makeProject({ extracted: undefined })]

    // Act
    const result = computeSkillDemand(projects)

    // Assert
    expect(result).toEqual([])
  })

  test('未知スキルもそのまま件数に含める', () => {
    // Arrange
    const projects = [
      makeProject({
        extracted: makeExtracted({ skills: [{ name: '独自フレームワークX', kind: 'required' }] }),
      }),
    ]

    // Act
    const result = computeSkillDemand(projects)

    // Assert
    expect(result).toEqual([{ name: '独自フレームワークX', count: 1 }])
  })
})

describe('computeMonthlyCounts', () => {
  test('直近6ヶ月を件数0の月も含めて返す', () => {
    // Arrange
    const projects = [makeProject({ receivedAt: NOW.toISOString() })]

    // Act
    const result = computeMonthlyCounts(projects, NOW)

    // Assert
    expect(result).toHaveLength(6)
    expect(result[result.length - 1]).toEqual({ month: '2026-07', count: 1 })
    expect(result[0]).toEqual({ month: '2026-02', count: 0 })
  })

  test('月キーの昇順（古い→新しい）で並ぶ', () => {
    // Arrange
    const projects: Project[] = []

    // Act
    const result = computeMonthlyCounts(projects, NOW)

    // Assert
    expect(result.map((r) => r.month)).toEqual([
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
    ])
  })

  test('extracted未設定は集計対象外', () => {
    // Arrange
    const projects = [makeProject({ receivedAt: NOW.toISOString(), extracted: undefined })]

    // Act
    const result = computeMonthlyCounts(projects, NOW)

    // Assert
    expect(result[result.length - 1]?.count).toBe(0)
  })
})

describe('computeSkillTrendChanges', () => {
  test('直近30日が前30日より増えていればupと判定する', () => {
    // Arrange
    const projects = [
      makeProject({
        receivedAt: daysAgo(5),
        extracted: makeExtracted({ skills: [{ name: 'AWS', kind: 'required' }] }),
      }),
      makeProject({
        receivedAt: daysAgo(10),
        extracted: makeExtracted({ skills: [{ name: 'AWS', kind: 'required' }] }),
      }),
      makeProject({
        receivedAt: daysAgo(40),
        extracted: makeExtracted({ skills: [{ name: 'AWS', kind: 'required' }] }),
      }),
    ]

    // Act
    const result = computeSkillTrendChanges(projects, NOW)

    // Assert
    const aws = result.find((r) => r.name === 'AWS')
    expect(aws).toEqual({ name: 'AWS', recentCount: 2, previousCount: 1, delta: 1, direction: 'up' })
  })

  test('件数が同じならflatと判定する', () => {
    // Arrange
    const projects = [
      makeProject({
        receivedAt: daysAgo(5),
        extracted: makeExtracted({ skills: [{ name: 'Azure', kind: 'required' }] }),
      }),
      makeProject({
        receivedAt: daysAgo(40),
        extracted: makeExtracted({ skills: [{ name: 'Azure', kind: 'required' }] }),
      }),
    ]

    // Act
    const result = computeSkillTrendChanges(projects, NOW)

    // Assert
    const azure = result.find((r) => r.name === 'Azure')
    expect(azure?.direction).toBe('flat')
  })

  test('前30日のみに出現し直近0件ならdownと判定する', () => {
    // Arrange
    const projects = [
      makeProject({
        receivedAt: daysAgo(45),
        extracted: makeExtracted({ skills: [{ name: 'GCP', kind: 'preferred' }] }),
      }),
    ]

    // Act
    const result = computeSkillTrendChanges(projects, NOW)

    // Assert
    const gcp = result.find((r) => r.name === 'GCP')
    expect(gcp).toEqual({ name: 'GCP', recentCount: 0, previousCount: 1, delta: -1, direction: 'down' })
  })

  test('変化量の絶対値降順で並ぶ', () => {
    // Arrange
    const projects = [
      ...Array.from({ length: 3 }, () =>
        makeProject({
          receivedAt: daysAgo(5),
          extracted: makeExtracted({ skills: [{ name: 'AWS', kind: 'required' }] }),
        }),
      ),
      makeProject({
        receivedAt: daysAgo(5),
        extracted: makeExtracted({ skills: [{ name: 'Azure', kind: 'required' }] }),
      }),
    ]

    // Act
    const result = computeSkillTrendChanges(projects, NOW)

    // Assert
    expect(result.map((r) => r.name)).toEqual(['AWS', 'Azure'])
  })
})

describe('computeRemoteBreakdown', () => {
  test('remote未設定はunknownとして数える', () => {
    // Arrange
    const projects = [makeProject({ extracted: makeExtracted({ remote: undefined }) })]

    // Act
    const result = computeRemoteBreakdown(projects)

    // Assert
    const unknown = result.find((r) => r.style === 'unknown')
    expect(unknown).toEqual({ style: 'unknown', count: 1, ratio: 1 })
  })

  test('4区分すべてを固定順で返し比率を計算する', () => {
    // Arrange
    const projects = [
      makeProject({ extracted: makeExtracted({ remote: 'full' }) }),
      makeProject({ extracted: makeExtracted({ remote: 'full' }) }),
      makeProject({ extracted: makeExtracted({ remote: 'hybrid' }) }),
      makeProject({ extracted: makeExtracted({ remote: 'onsite' }) }),
    ]

    // Act
    const result = computeRemoteBreakdown(projects)

    // Assert
    expect(result.map((r) => r.style)).toEqual(['full', 'hybrid', 'onsite', 'unknown'])
    expect(result.find((r) => r.style === 'full')).toEqual({ style: 'full', count: 2, ratio: 0.5 })
  })

  test('対象0件なら比率は0でNaNにならない', () => {
    // Arrange
    const projects: Project[] = []

    // Act
    const result = computeRemoteBreakdown(projects)

    // Assert
    expect(result.every((r) => r.ratio === 0)).toBe(true)
  })

  test('extracted未設定は集計対象外', () => {
    // Arrange
    const projects = [makeProject({ extracted: undefined })]

    // Act
    const result = computeRemoteBreakdown(projects)

    // Assert
    expect(result.every((r) => r.count === 0)).toBe(true)
  })
})
