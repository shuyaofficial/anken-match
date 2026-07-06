// スコアバッジの三段階色分け閾値。DESIGN.md準拠（match-strong/mid/weak）。

export const SCORE_STRONG_THRESHOLD = 70
export const SCORE_MID_THRESHOLD = 40

export type ScoreTier = 'strong' | 'mid' | 'weak'

export function scoreTier(score: number): ScoreTier {
  if (score >= SCORE_STRONG_THRESHOLD) return 'strong'
  if (score >= SCORE_MID_THRESHOLD) return 'mid'
  return 'weak'
}
