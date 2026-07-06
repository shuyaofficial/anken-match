// ProposalPanel向けの純粋関数群。DBアクセス・LLM呼び出しを含まない。

import type { MatchResult, Project, ProposalDraft } from '../../lib/types'

/** 上位候補（llmRankがあればその順、無ければスコア降順）を最大5件返す */
export function topCandidates(results: MatchResult[] | null | undefined, limit = 5): MatchResult[] {
  if (results === null || results === undefined) return []
  const sorted = [...results].sort((a, b) => {
    if (a.llmRank !== undefined && b.llmRank !== undefined) return a.llmRank - b.llmRank
    if (a.llmRank !== undefined) return -1
    if (b.llmRank !== undefined) return 1
    return b.score - a.score
  })
  return sorted.slice(0, limit)
}

/** 選択中候補者に対応するMatchResultを取得する */
export function findResultFor(
  candidates: MatchResult[],
  employeeId: string,
): MatchResult | undefined {
  return candidates.find((c) => c.employeeId === employeeId)
}

/** project をイミュータブルに更新し、提案文書を保存した状態にする */
export function withProposal(
  project: Project,
  draft: { employeeId: string; summaryText: string; replyDraft: string },
  now: Date,
): Project {
  const proposal: ProposalDraft = {
    employeeId: draft.employeeId,
    summaryText: draft.summaryText,
    replyDraft: draft.replyDraft,
    generatedAt: now.toISOString(),
  }
  return {
    ...project,
    proposal,
    status: 'proposed',
    updatedAt: now.toISOString(),
  }
}
