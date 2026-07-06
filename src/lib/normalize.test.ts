import { describe, expect, test } from 'vitest'
import { knownSkills, normalizeSkillName, skillKey } from './normalize'

describe('normalizeSkillName', () => {
  test('別名をcanonical名に正規化する', () => {
    expect(normalizeSkillName('k8s')).toBe('Kubernetes')
    expect(normalizeSkillName('Amazon Web Services')).toBe('AWS')
    expect(normalizeSkillName('アマゾンウェブサービス')).toBe('AWS')
  })

  test('大文字小文字を無視して照合する', () => {
    expect(normalizeSkillName('K8S')).toBe('Kubernetes')
    expect(normalizeSkillName('aws')).toBe('AWS')
  })

  test('canonical名そのものはそのまま返す', () => {
    expect(normalizeSkillName('Terraform')).toBe('Terraform')
  })

  test('未知のスキルは前後空白のみ除去して返す', () => {
    expect(normalizeSkillName('  独自フレームワークX  ')).toBe('独自フレームワークX')
  })
})

describe('skillKey', () => {
  test('別名同士が同一キーに揃う', () => {
    expect(skillKey('k8s')).toBe(skillKey('Kubernetes'))
    expect(skillKey('rails')).toBe(skillKey('Ruby on Rails'))
  })

  test('未知スキルも小文字比較で一致する', () => {
    expect(skillKey('MyTool')).toBe(skillKey('mytool'))
  })
})

describe('knownSkills', () => {
  test('canonical名の一覧を返す', () => {
    // Arrange & Act
    const skills = knownSkills()
    // Assert
    expect(skills).toContain('AWS')
    expect(skills).toContain('ネットワーク設計')
    expect(skills.length).toBeGreaterThan(20)
  })
})
