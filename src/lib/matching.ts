// 案件×社員マッチングエンジン。
// 一段目: 決定的スコアリング（API課金ゼロ・テスト可能）。
// 二段目: 上位候補のみLLMで再ランク＋提案根拠生成（トークン節約のため人数を絞る）。

import { callClaude } from './anthropic'
import { skillKey } from './normalize'
import type { Employee, ExtractedProject, MatchBreakdown, MatchResult } from './types'

export class MatchingError extends Error {}

/** スコア配分。必須スキル充足を最重視する */
const WEIGHTS = { required: 0.6, preferred: 0.2, experience: 0.2 } as const
/** 経験年数はこの年数で頭打ち（10年超の差はマッチング上意味が薄い） */
const EXPERIENCE_CAP_YEARS = 10
/** LLM再ランクに渡す上位候補数 */
export const RERANK_TOP_N = 5
const RERANK_MAX_TOKENS = 2000

function coverage(matched: number, total: number): number {
  return total === 0 ? 1 : matched / total
}

/** 1社員の案件適合度を決定的に採点する */
export function scoreEmployee(project: ExtractedProject, employee: Employee): MatchResult {
  const yearsBySkill = new Map(employee.skills.map((s) => [skillKey(s.name), s.years]))

  const required = project.skills.filter((s) => s.kind === 'required')
  const preferred = project.skills.filter((s) => s.kind === 'preferred')
  const matchedRequired = required.filter((s) => yearsBySkill.has(skillKey(s.name)))
  const matchedPreferred = preferred.filter((s) => yearsBySkill.has(skillKey(s.name)))
  const matchedAll = [...matchedRequired, ...matchedPreferred]

  const experienceBonus =
    matchedAll.length === 0
      ? 0
      : matchedAll.reduce((sum, s) => {
          const years = yearsBySkill.get(skillKey(s.name)) ?? 0
          return sum + Math.min(years, EXPERIENCE_CAP_YEARS) / EXPERIENCE_CAP_YEARS
        }, 0) / matchedAll.length

  const breakdown: MatchBreakdown = {
    requiredCoverage: coverage(matchedRequired.length, required.length),
    preferredCoverage: coverage(matchedPreferred.length, preferred.length),
    experienceBonus,
    missingRequired: required
      .filter((s) => !yearsBySkill.has(skillKey(s.name)))
      .map((s) => s.name),
    matchedSkills: matchedAll.map((s) => s.name),
  }

  const score = Math.round(
    100 *
      (WEIGHTS.required * breakdown.requiredCoverage +
        WEIGHTS.preferred * breakdown.preferredCoverage +
        WEIGHTS.experience * breakdown.experienceBonus),
  )

  return { projectId: '', employeeId: employee.id, score, breakdown }
}

/**
 * 全社員を採点しスコア降順に並べる。アサイン中の社員は既定で除外。
 * 同点は必須充足率降順 → 名前昇順で安定させる。
 */
export function rankEmployees(
  project: ExtractedProject,
  employees: Employee[],
  opts: { projectId?: string; includeAssigned?: boolean } = {},
): MatchResult[] {
  const nameById = new Map(employees.map((e) => [e.id, e.name]))
  return employees
    .filter((e) => opts.includeAssigned === true || e.availability.status === 'available')
    .map((e) => ({ ...scoreEmployee(project, e), projectId: opts.projectId ?? '' }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.breakdown.requiredCoverage - a.breakdown.requiredCoverage ||
        (nameById.get(a.employeeId) ?? '').localeCompare(nameById.get(b.employeeId) ?? '', 'ja'),
    )
}

export const RERANK_SYSTEM_PROMPT = `あなたはSES営業の提案順位を決めるアドバイザーです。案件情報と候補者リスト（機械採点済み）を受け取り、提案すべき順に並べ替えて、JSON配列のみを出力します。説明文・コードフェンスは出力しません。

出力スキーマ:
[{"employeeId": "候補者ID", "rank": 1, "rationale": "この候補者を提案する根拠。営業がそのまま使える日本語2文以内"}]

規則:
- 全候補者を必ず含める。rankは1から始まる連番
- 機械採点を参考にしつつ、スキルの実質的な近さ（例: CCNP保持者はCCNA要件を満たす）、経歴サマリとの相性、稼働開始時期を考慮してよい
- rationale には必須スキルの充足状況を必ず織り込む`

/** 再ランク用のユーザーテキストを組み立てる（渡す情報は必要最小限に絞る） */
export function buildRerankUserText(
  project: ExtractedProject,
  candidates: { employee: Employee; result: MatchResult }[],
): string {
  const projectPart = {
    title: project.title,
    summary: project.summary,
    role: project.role,
    skills: project.skills,
    notes: project.notes,
  }
  const candidatePart = candidates.map(({ employee, result }) => ({
    employeeId: employee.id,
    name: employee.name,
    roles: employee.roles,
    skills: employee.skills,
    availableFrom: employee.availability.until,
    summary: employee.summary,
    machineScore: result.score,
    missingRequired: result.breakdown.missingRequired,
  }))
  return `案件:\n${JSON.stringify(projectPart)}\n\n候補者:\n${JSON.stringify(candidatePart)}`
}

/** LLM再ランク応答を検証する。未知IDは捨て、有効エントリが無ければ MatchingError */
export function parseRerankResponse(
  text: string,
  candidateIds: string[],
): { employeeId: string; llmRank: number; llmRationale: string }[] {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end <= start) throw new MatchingError('応答にJSON配列が含まれていません')

  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new MatchingError('応答のJSONを解析できませんでした')
  }
  if (!Array.isArray(parsed)) throw new MatchingError('応答がJSON配列ではありません')

  const validIds = new Set(candidateIds)
  const seen = new Set<string>()
  const entries: { employeeId: string; llmRank: number; llmRationale: string }[] = []
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue
    const { employeeId, rank, rationale } = item as Record<string, unknown>
    if (typeof employeeId !== 'string' || !validIds.has(employeeId) || seen.has(employeeId)) continue
    if (typeof rank !== 'number' || !Number.isInteger(rank) || rank < 1) continue
    seen.add(employeeId)
    entries.push({
      employeeId,
      llmRank: rank,
      llmRationale: typeof rationale === 'string' ? rationale : '',
    })
  }
  if (entries.length === 0) throw new MatchingError('有効な再ランク結果がありません')
  return entries.sort((a, b) => a.llmRank - b.llmRank)
}

/** 再ランク結果を決定的ランキングにマージする（再ランク対象外の候補はスコア順のまま後続） */
export function applyRerank(
  results: MatchResult[],
  rerank: { employeeId: string; llmRank: number; llmRationale: string }[],
): MatchResult[] {
  const byId = new Map(rerank.map((r) => [r.employeeId, r]))
  const reranked = results
    .filter((r) => byId.has(r.employeeId))
    .map((r) => {
      const entry = byId.get(r.employeeId)
      if (entry === undefined) throw new MatchingError('再ランク結果の整合が取れません')
      return { ...r, llmRank: entry.llmRank, llmRationale: entry.llmRationale }
    })
    .sort((a, b) => (a.llmRank ?? 0) - (b.llmRank ?? 0))
  const rest = results.filter((r) => !byId.has(r.employeeId))
  return [...reranked, ...rest]
}

/**
 * 上位 RERANK_TOP_N 名をLLMで再ランクし、提案根拠付きの全ランキングを返す。
 * LLM応答が不正な場合は MatchingError（呼び出し側は決定的ランキングへフォールバックする）。
 */
export async function rerankTopCandidates(
  project: ExtractedProject,
  results: MatchResult[],
  employees: Employee[],
  opts: { apiKey: string; model: string },
): Promise<MatchResult[]> {
  const employeeById = new Map(employees.map((e) => [e.id, e]))
  const top = results.slice(0, RERANK_TOP_N).flatMap((result) => {
    const employee = employeeById.get(result.employeeId)
    return employee === undefined ? [] : [{ employee, result }]
  })
  if (top.length === 0) return results

  const response = await callClaude({
    apiKey: opts.apiKey,
    model: opts.model,
    system: RERANK_SYSTEM_PROMPT,
    userText: buildRerankUserText(project, top),
    maxTokens: RERANK_MAX_TOKENS,
  })
  const rerank = parseRerankResponse(
    response,
    top.map((t) => t.employee.id),
  )
  return applyRerank(results, rerank)
}
