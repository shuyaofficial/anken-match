import { describe, expect, test } from 'vitest'
import { ProposalError, parseProposalResponse } from './proposals'

const validResponse = JSON.stringify({
  summaryText: 'AWS運用経験が豊富で、案件要件に高く合致します。稼働開始は即日可能です。',
  replyDraft:
    '件名: Re: クラウド基盤構築案件\n\nお世話になっております。ご紹介いただいた案件について、候補者をご提案いたします。',
})

describe('parseProposalResponse', () => {
  test('正常なJSON応答をsummaryTextとreplyDraftに変換する', () => {
    // Arrange
    const text = validResponse

    // Act
    const result = parseProposalResponse(text)

    // Assert
    expect(result.summaryText).toBe(
      'AWS運用経験が豊富で、案件要件に高く合致します。稼働開始は即日可能です。',
    )
    expect(result.replyDraft).toContain('件名: Re:')
  })

  test('コードフェンスや前置き付きの応答からJSONを取り出せる', () => {
    // Arrange
    const wrapped = '以下が提案文です。\n```json\n' + validResponse + '\n```\nご確認ください。'

    // Act
    const result = parseProposalResponse(wrapped)

    // Assert
    expect(result.summaryText).toContain('AWS運用経験')
  })

  test('summaryTextが欠落した応答はProposalErrorを投げる', () => {
    // Arrange
    const response = JSON.stringify({ replyDraft: '件名: Re: 案件\n\n本文' })

    // Act & Assert
    expect(() => parseProposalResponse(response)).toThrow(ProposalError)
  })

  test('replyDraftが欠落した応答はProposalErrorを投げる', () => {
    // Arrange
    const response = JSON.stringify({ summaryText: '要約テキスト' })

    // Act & Assert
    expect(() => parseProposalResponse(response)).toThrow(ProposalError)
  })

  test('壊れたJSONはProposalErrorを投げる', () => {
    // Arrange
    const broken = '{"summaryText": "t", '

    // Act & Assert
    expect(() => parseProposalResponse(broken)).toThrow(ProposalError)
  })

  test('JSONを含まない応答はProposalErrorを投げる', () => {
    // Arrange
    const noJson = '提案文を作成できませんでした'

    // Act & Assert
    expect(() => parseProposalResponse(noJson)).toThrow(ProposalError)
  })

  test('空文字のsummaryTextはProposalErrorを投げる', () => {
    // Arrange
    const response = JSON.stringify({ summaryText: '   ', replyDraft: '件名: Re: 案件\n\n本文' })

    // Act & Assert
    expect(() => parseProposalResponse(response)).toThrow(ProposalError)
  })

  test('複数フィールドが同時に欠落した応答はProposalErrorを投げる', () => {
    // Arrange
    const response = JSON.stringify({ note: '関係ないフィールドのみ' })

    // Act & Assert
    expect(() => parseProposalResponse(response)).toThrow(ProposalError)
  })
})
