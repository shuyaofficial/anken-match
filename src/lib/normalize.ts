// スキル名の正規化。LLM抽出結果と社員スキルの表記ゆれを吸収し、
// マッチングは常に正規化済みの名前同士で比較する。

/** canonical名 → 別名リスト（比較は小文字化して行う） */
const SKILL_ALIASES: Record<string, string[]> = {
  AWS: ['amazon web services', 'アマゾンウェブサービス', 'amazon aws'],
  Azure: ['microsoft azure', 'ms azure', 'アジュール'],
  GCP: ['google cloud', 'google cloud platform', 'グーグルクラウド'],
  'Cisco IOS': ['ios-xe', 'cisco ios-xe', 'catalyst'],
  CCNA: [],
  CCNP: [],
  Linux: ['linuxサーバ', 'linuxサーバー', 'rhel', 'red hat enterprise linux', 'centos', 'ubuntu'],
  'Windows Server': ['windowsサーバ', 'windowsサーバー', 'winserver'],
  'Active Directory': ['ad', 'activedirectory'],
  VMware: ['vsphere', 'esxi', 'vmware vsphere'],
  Docker: ['docker compose'],
  Kubernetes: ['k8s', 'クバネティス', 'クーベネティス', 'eks', 'aks', 'gke'],
  Terraform: [],
  Ansible: [],
  Python: ['python3'],
  Java: [],
  'C#': ['csharp', 'c sharp'],
  PHP: [],
  Ruby: ['ruby on rails', 'rails'],
  Go: ['golang'],
  JavaScript: ['js', 'ジャバスクリプト'],
  TypeScript: ['ts'],
  React: ['react.js', 'reactjs'],
  'Vue.js': ['vue', 'vuejs'],
  'Next.js': ['nextjs', 'next'],
  'Node.js': ['node', 'nodejs'],
  SQL: [],
  MySQL: [],
  PostgreSQL: ['postgres'],
  Oracle: ['oracle db', 'oracle database'],
  ネットワーク設計: ['nw設計', 'ネットワークデザイン'],
  ネットワーク構築: ['nw構築'],
  ネットワーク運用: ['nw運用', 'ネットワーク運用保守', 'nw運用保守'],
  ファイアウォール: ['firewall', 'fortigate', 'palo alto', 'paloalto', 'asa'],
  ロードバランサ: ['load balancer', 'lb', 'bigip', 'big-ip', 'f5'],
  BGP: [],
  OSPF: [],
  監視: ['zabbix', 'nagios', '監視運用', 'システム監視'],
  セキュリティ: ['security', 'セキュリティ対策'],
  PM: ['プロジェクトマネージャ', 'プロジェクトマネージャー', 'プロジェクトマネジメント', 'pmo'],
  要件定義: [],
  基本設計: [],
  詳細設計: [],
}

/** 小文字化した別名/正式名 → canonical名 の逆引き表 */
const LOOKUP: ReadonlyMap<string, string> = new Map(
  Object.entries(SKILL_ALIASES).flatMap(([canonical, aliases]) => [
    [canonical.toLowerCase(), canonical] as [string, string],
    ...aliases.map((alias) => [alias.toLowerCase(), canonical] as [string, string]),
  ]),
)

/**
 * スキル名を正規化する。辞書にあればcanonical名、なければ前後空白を除いた原文を返す。
 * 未知スキル同士も小文字比較で一致させられるよう、比較キーは skillKey() を使うこと。
 */
export function normalizeSkillName(raw: string): string {
  const trimmed = raw.trim()
  const canonical = LOOKUP.get(trimmed.toLowerCase())
  return canonical ?? trimmed
}

/** マッチング比較用キー（正規化 → 小文字化） */
export function skillKey(raw: string): string {
  return normalizeSkillName(raw).toLowerCase()
}

/** 登録済みcanonicalスキル名の一覧（UIのサジェスト用） */
export function knownSkills(): string[] {
  return Object.keys(SKILL_ALIASES)
}
