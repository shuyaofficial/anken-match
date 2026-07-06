import { describe, expect, test } from 'vitest'
import {
  exportEmployeesToJson,
  importEmployeesFromCsv,
  importEmployeesFromJson,
} from './importEmployees'
import type { Employee } from '../../lib/types'

describe('importEmployeesFromJson', () => {
  test('正常なEmployee[]をそのままインポートできる', () => {
    const json = JSON.stringify([
      {
        name: '山田太郎',
        roles: ['インフラエンジニア'],
        skills: [{ name: 'AWS', years: 5, level: 'advanced' }],
        availability: { status: 'available' },
      },
    ])

    const result = importEmployeesFromJson(json)

    expect(result.errors).toEqual([])
    expect(result.employees).toHaveLength(1)
    expect(result.employees[0]?.name).toBe('山田太郎')
    expect(result.employees[0]?.id).toBeTruthy()
    expect(result.employees[0]?.createdAt).toBeTruthy()
  })

  test('id/createdAt/updatedAtが既にあれば保持する', () => {
    const json = JSON.stringify([
      {
        id: 'fixed-id',
        name: '佐藤',
        roles: [],
        skills: [],
        availability: { status: 'available' },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ])

    const result = importEmployeesFromJson(json)

    expect(result.employees[0]?.id).toBe('fixed-id')
    expect(result.employees[0]?.createdAt).toBe('2026-01-01T00:00:00.000Z')
  })

  test('スキル名は正規化される', () => {
    const json = JSON.stringify([
      {
        name: '鈴木',
        skills: [{ name: 'amazon web services', years: 3, level: 'intermediate' }],
        availability: { status: 'available' },
      },
    ])

    const result = importEmployeesFromJson(json)

    expect(result.employees[0]?.skills[0]?.name).toBe('AWS')
  })

  test('氏名が空の要素はエラーとして報告され、他の正常な要素は取り込まれる', () => {
    const json = JSON.stringify([
      { name: '', skills: [], availability: { status: 'available' } },
      { name: '正常太郎', skills: [], availability: { status: 'available' } },
    ])

    const result = importEmployeesFromJson(json)

    expect(result.employees).toHaveLength(1)
    expect(result.employees[0]?.name).toBe('正常太郎')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.index).toBe(1)
    expect(result.errors[0]?.reason).toContain('氏名')
  })

  test('年数が範囲外はエラーになる', () => {
    const json = JSON.stringify([
      { name: '太郎', skills: [{ name: 'AWS', years: 60, level: 'expert' }] },
    ])

    const result = importEmployeesFromJson(json)

    expect(result.employees).toHaveLength(0)
    expect(result.errors[0]?.reason).toContain('年数')
  })

  test('不正なJSON文字列はパースエラーを返す', () => {
    const result = importEmployeesFromJson('{ 不正 ')

    expect(result.employees).toHaveLength(0)
    expect(result.errors[0]?.reason).toContain('JSON')
  })

  test('配列でないJSONはエラーになる', () => {
    const result = importEmployeesFromJson(JSON.stringify({ name: '太郎' }))

    expect(result.employees).toHaveLength(0)
    expect(result.errors[0]?.reason).toContain('配列')
  })
})

describe('importEmployeesFromCsv', () => {
  test('正常なCSVをインポートできる', () => {
    const csv = [
      'name,roles,skills,availability,location,summary',
      '山田太郎,インフラエンジニア;PM,AWS:5:advanced;Linux:3:intermediate,available,東京,クラウド基盤の経験が豊富',
    ].join('\n')

    const result = importEmployeesFromCsv(csv)

    expect(result.errors).toEqual([])
    expect(result.employees).toHaveLength(1)
    const employee = result.employees[0] as Employee
    expect(employee.name).toBe('山田太郎')
    expect(employee.roles).toEqual(['インフラエンジニア', 'PM'])
    expect(employee.skills).toEqual([
      { name: 'AWS', years: 5, level: 'advanced' },
      { name: 'Linux', years: 3, level: 'intermediate' },
    ])
    expect(employee.availability).toEqual({ status: 'available' })
    expect(employee.location).toBe('東京')
    expect(employee.summary).toBe('クラウド基盤の経験が豊富')
  })

  test('ヘッダが不正な場合は全体をエラーにする', () => {
    const csv = ['foo,bar', '1,2'].join('\n')

    const result = importEmployeesFromCsv(csv)

    expect(result.employees).toHaveLength(0)
    expect(result.errors[0]?.reason).toContain('ヘッダ')
  })

  test('氏名が空の行はエラー、他の行は取り込まれる', () => {
    const csv = [
      'name,roles,skills,availability,location,summary',
      ',,,available,,',
      '正常太郎,,,available,,',
    ].join('\n')

    const result = importEmployeesFromCsv(csv)

    expect(result.employees).toHaveLength(1)
    expect(result.employees[0]?.name).toBe('正常太郎')
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]?.index).toBe(1)
  })

  test('スキル年数が範囲外の行はエラーになる', () => {
    const csv = [
      'name,roles,skills,availability,location,summary',
      '太郎,,AWS:100:expert,available,,',
    ].join('\n')

    const result = importEmployeesFromCsv(csv)

    expect(result.employees).toHaveLength(0)
    expect(result.errors[0]?.reason).toContain('年数')
  })

  test('空のCSVはエラーになる', () => {
    const result = importEmployeesFromCsv('')

    expect(result.employees).toHaveLength(0)
    expect(result.errors[0]?.reason).toContain('空')
  })

  test('ダブルクォートで囲まれたカンマ入りフィールドを扱える', () => {
    const csv = [
      'name,roles,skills,availability,location,summary',
      '"田中,次郎",,,available,,"経歴です, 続きます"',
    ].join('\n')

    const result = importEmployeesFromCsv(csv)

    expect(result.employees).toHaveLength(1)
    expect(result.employees[0]?.name).toBe('田中,次郎')
    expect(result.employees[0]?.summary).toBe('経歴です, 続きます')
  })
})

describe('exportEmployeesToJson', () => {
  test('整形済みJSON文字列を返しパースし直せる', () => {
    const employees: Employee[] = [
      {
        id: 'e1',
        name: '山田',
        roles: [],
        skills: [],
        availability: { status: 'available' },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]

    const json = exportEmployeesToJson(employees)

    expect(JSON.parse(json)).toEqual(employees)
  })
})
