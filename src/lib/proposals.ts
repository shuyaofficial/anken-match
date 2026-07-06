// 選定候補者向けの提案文（要約＋クライアント返信ドラフト）生成。
// プロンプト・応答パース・スキーマ検証をここに集約する。LLM応答は信頼せず必ず検証する。
// extraction.ts と同じ防御的パースのスタイルを踏襲する。

import { callClaude } from './anthropic'
import type { Employee, MatchResult, Project } from './types'

const MAX_OUTPUT_TOKENS = 2000

export class ProposalError extends Error {}

export const PROPOSAL_SYSTEM_PROMPT = `あなたはSES営業担当の提案文作成アシスタントです。与えられた案件情報・候補者情報・機械採点をもとに、クライアントへの提案文を作成し、JSONオブジェクトのみを出力します。説明文・前置き・コードフェンスは一切出力しません。

出力スキーマ:
{
  "summaryText": "案件要件に対応づけた候補者のアピール要約",
  "replyDraft": "クライアントへの一次返信メール全文"
}

規則:
- 与えられた情報のみを使用する。候補者の経歴・スキルの捏造や誇張は禁止。無い情報は書かない
- 未充足の必須スキルがある場合は隠さず、近接する経験でどう補えるかを正直に書く（捏造はしない）
- summaryText は200〜300字程度の地の文とし、必要なら箇条書きを2〜4点添える。見出しやマークダウン記法（#, **, - 見出し的な使い方など）は使わない
- replyDraft は1行目を「件名: Re: （元の件名、無ければ案件名）」とし、本文は敬体（ですます調）で書く。候補者のスキル・経験年数・稼働開始時期・単価目線（案件情報にあれば）に触れ、スキルシート送付と面談設定の打診で締める。署名は [自社名]・[担当者名] のプレースホルダのままにする`

interface ProposalUserPayload {
  project: {
    title?: string
    summary?: string
    skills: { name: string; kind: string }[]
    price?: string
    period?: string
    notes?: string
    subject?: string
  }
  candidate: {
    name: string
    roles: string[]
    skills: { name: string; years: number; level: string }[]
    summary?: string
    availability: { status: string; until?: string }
  }
  score: {
    score: number
    matchedSkills: string[]
    missingRequired: string[]
  }
}

/** 案件・候補者・機械採点をコンパクトなJSONにまとめ、LLMへのユーザーテキストを組み立てる */
export function buildProposalUserText(
  project: Project,
  employee: Employee,
  result: MatchResult,
): string {
  const extracted = project.extracted
  const payload: ProposalUserPayload = {
    project: {
      title: extracted?.title,
      summary: extracted?.summary,
      skills: (extracted?.skills ?? []).map((s) => ({ name: s.name, kind: s.kind })),
      price: extracted?.price,
      period: extracted?.period,
      notes: extracted?.notes,
      subject: project.subject,
    },
    candidate: {
      name: employee.name,
      roles: employee.roles,
      skills: employee.skills.map((s) => ({ name: s.name, years: s.years, level: s.level })),
      summary: employee.summary,
      availability: employee.availability,
    },
    score: {
      score: result.score,
      matchedSkills: result.breakdown.matchedSkills,
      missingRequired: result.breakdown.missingRequired,
    },
  }

  return `次の案件・候補者情報をもとに提案文を作成してください。\n\n${JSON.stringify(payload)}`
}

/** LLM応答テキストからJSON部分を取り出す（コードフェンス・前後の説明文に耐える） */
function extractJsonSlice(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new ProposalError('応答にJSONオブジェクトが含まれていません')
  }
  return text.slice(start, end + 1)
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** LLM応答を検証済みの提案文ペアに変換する。不正な応答は ProposalError */
export function parseProposalResponse(text: string): { summaryText: string; replyDraft: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonSlice(text))
  } catch (error) {
    if (error instanceof ProposalError) throw error
    throw new ProposalError('応答のJSONを解析できませんでした')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new ProposalError('応答がJSONオブジェクトではありません')
  }

  const obj = parsed as Record<string, unknown>
  const summaryText = asNonEmptyString(obj.summaryText)
  if (summaryText === undefined) throw new ProposalError('summaryText がありません')

  const replyDraft = asNonEmptyString(obj.replyDraft)
  if (replyDraft === undefined) throw new ProposalError('replyDraft がありません')

  return { summaryText, replyDraft }
}

/** 案件・候補者・機械採点から提案文を生成する（Claude API呼び出し込み） */
export async function generateProposal(
  project: Project,
  employee: Employee,
  result: MatchResult,
  opts: { apiKey: string; model: string },
): Promise<{ summaryText: string; replyDraft: string }> {
  const response = await callClaude({
    apiKey: opts.apiKey,
    model: opts.model,
    system: PROPOSAL_SYSTEM_PROMPT,
    userText: buildProposalUserText(project, employee, result),
    maxTokens: MAX_OUTPUT_TOKENS,
  })
  return parseProposalResponse(response)
}
