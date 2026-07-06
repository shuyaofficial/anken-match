import { describe, expect, test } from 'vitest'
import {
  buildExtractionUserText,
  ExtractionError,
  parseExtractionResponse,
} from './extraction'

const validResponse = JSON.stringify({
  title: 'クラウド基盤構築案件',
  summary: 'AWS上での社内基盤構築。設計から運用まで。',
  skills: [
    { name: 'アマゾンウェブサービス', kind: 'required' },
    { name: 'Terraform', kind: 'preferred' },
  ],
  role: 'インフラエンジニア',
  price: '65〜75万円/月',
  remote: 'hybrid',
})

describe('parseExtractionResponse', () => {
  test('正常なJSON応答を検証済みExtractedProjectに変換する', () => {
    const result = parseExtractionResponse(validResponse)

    expect(result.title).toBe('クラウド基盤構築案件')
    expect(result.role).toBe('インフラエンジニア')
    expect(result.remote).toBe('hybrid')
    expect(result.skills).toHaveLength(2)
  })

  test('スキル名を正規化する', () => {
    const result = parseExtractionResponse(validResponse)

    expect(result.skills[0]).toEqual({ name: 'AWS', kind: 'required' })
  })

  test('コードフェンスや前置き付きの応答からJSONを取り出せる', () => {
    const wrapped = '以下が結果です。\n```json\n' + validResponse + '\n```\nご確認ください。'

    const result = parseExtractionResponse(wrapped)

    expect(result.title).toBe('クラウド基盤構築案件')
  })

  test('required/preferred重複スキルはrequiredを優先して重複排除する', () => {
    const response = JSON.stringify({
      title: 't',
      summary: 's',
      skills: [
        { name: 'k8s', kind: 'preferred' },
        { name: 'Kubernetes', kind: 'required' },
      ],
    })

    const result = parseExtractionResponse(response)

    expect(result.skills).toEqual([{ name: 'Kubernetes', kind: 'required' }])
  })

  test('不正なkindはpreferredに落とす', () => {
    const response = JSON.stringify({
      title: 't',
      summary: 's',
      skills: [{ name: 'AWS', kind: 'mandatory' }],
    })

    const result = parseExtractionResponse(response)

    expect(result.skills[0]?.kind).toBe('preferred')
  })

  test('未知のremote値はunknownに落とす', () => {
    const response = JSON.stringify({ title: 't', summary: 's', skills: [], remote: 'リモート可' })

    const result = parseExtractionResponse(response)

    expect(result.remote).toBe('unknown')
  })

  test('titleが無い応答はExtractionErrorを投げる', () => {
    const response = JSON.stringify({ summary: 's', skills: [] })

    expect(() => parseExtractionResponse(response)).toThrow(ExtractionError)
  })

  test('JSONを含まない応答はExtractionErrorを投げる', () => {
    expect(() => parseExtractionResponse('抽出できませんでした')).toThrow(ExtractionError)
  })

  test('壊れたJSONはExtractionErrorを投げる', () => {
    expect(() => parseExtractionResponse('{"title": "t", ')).toThrow(ExtractionError)
  })

  test('空文字のオプションフィールドはundefinedに落とす', () => {
    const response = JSON.stringify({ title: 't', summary: 's', skills: [], price: '  ' })

    const result = parseExtractionResponse(response)

    expect(result.price).toBeUndefined()
  })
})

describe('buildExtractionUserText', () => {
  test('メール本文を含む指示文を組み立てる', () => {
    const text = buildExtractionUserText('案件のご紹介です')

    expect(text).toContain('案件のご紹介です')
  })

  test('過大な入力は切り詰める', () => {
    const huge = 'あ'.repeat(20000)

    const text = buildExtractionUserText(huge)

    expect(text.length).toBeLessThan(16000)
  })
})
