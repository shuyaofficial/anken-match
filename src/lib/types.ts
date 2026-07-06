// データモデル契約 — 全featureはこのファイルの型を正とする。
// 変更はメインセッション（設計担当）の承認を経ること。

export type MailSource = 'paste' | 'file' | 'gmail'

export type SkillKind = 'required' | 'preferred'

export interface ExtractedSkill {
  /** 正規化済みスキル名（canonical名。例: "AWS", "Cisco IOS"） */
  name: string
  kind: SkillKind
}

export type RemoteStyle = 'full' | 'hybrid' | 'onsite' | 'unknown'

/** LLMがメール原文から抽出する構造化案件情報 */
export interface ExtractedProject {
  title: string
  /** 2〜3文の案件要約 */
  summary: string
  skills: ExtractedSkill[]
  /** 例: "インフラエンジニア", "PM" */
  role?: string
  /** 例: "60〜70万円/月" */
  price?: string
  /** 例: "2026/08〜長期" */
  period?: string
  /** 例: "東京・品川" */
  location?: string
  remote?: RemoteStyle
  /** 商流。例: "エンド直", "1次請け" */
  commercialFlow?: string
  /** 開始時期（原文表現のまま可） */
  startDate?: string
  /** 面談回数・外国籍可否などその他条件 */
  notes?: string
}

export type ProjectStatus = 'new' | 'matched' | 'proposed' | 'closed'

/** 選定した候補者について生成した提案文書（編集後の最終版を保持する） */
export interface ProposalDraft {
  employeeId: string
  /** 案件要件に合わせた候補者のアピール要約 */
  summaryText: string
  /** クライアントへの一次返信メール文面 */
  replyDraft: string
  generatedAt: string
}

export interface Project {
  id: string
  /** メール受信日時 ISO8601 */
  receivedAt: string
  source: MailSource
  subject?: string
  from?: string
  rawText: string
  /** 未抽出は undefined */
  extracted?: ExtractedProject
  /** 提案文書。生成・保存すると status は 'proposed' になる */
  proposal?: ProposalDraft
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface EmployeeSkill {
  name: string
  years: number
  level: SkillLevel
}

export type AvailabilityStatus = 'available' | 'assigned'

export interface Employee {
  id: string
  name: string
  /** 例: ["ネットワークエンジニア"] */
  roles: string[]
  skills: EmployeeSkill[]
  availability: { status: AvailabilityStatus; until?: string }
  location?: string
  /** 経歴サマリ。提案文生成の材料 */
  summary?: string
  createdAt: string
  updatedAt: string
}

export interface MatchBreakdown {
  /** 必須スキル充足率 0..1 */
  requiredCoverage: number
  /** 歓迎スキル充足率 0..1 */
  preferredCoverage: number
  /** 経験年数による加点 0..1 */
  experienceBonus: number
  missingRequired: string[]
  matchedSkills: string[]
}

export interface MatchResult {
  projectId: string
  employeeId: string
  /** 0..100 */
  score: number
  breakdown: MatchBreakdown
  /** LLM再ランク時の提案根拠 */
  llmRationale?: string
  llmRank?: number
}

export interface AppSettings {
  anthropicApiKey: string
  /** 既定 'claude-sonnet-5' */
  model: string
  /** Gmail連携用 OAuth Client ID（未設定なら連携UI非活性） */
  gmailClientId: string
}

export const DEFAULT_MODEL = 'claude-sonnet-5'
