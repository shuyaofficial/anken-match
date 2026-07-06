// デモ人材データ。空状態からのワンクリック投入用。
// スキル名は必ず src/lib/normalize.ts の canonical 名を使うこと（マッチング精度のため）。

import type { Employee } from '../../lib/types'

interface SeedInput {
  name: string
  roles: string[]
  skills: { name: string; years: number; level: Employee['skills'][number]['level'] }[]
  status: Employee['availability']['status']
  until?: string
  location: string
  summary: string
}

const SEED_INPUTS: SeedInput[] = [
  {
    name: '佐藤健太',
    roles: ['ネットワークエンジニア'],
    skills: [
      { name: 'Cisco IOS', years: 8, level: 'expert' },
      { name: 'BGP', years: 6, level: 'advanced' },
      { name: 'ネットワーク設計', years: 8, level: 'expert' },
      { name: 'ファイアウォール', years: 5, level: 'advanced' },
    ],
    status: 'available',
    location: '東京・品川',
    summary:
      '大手キャリア向けコアネットワークの設計構築を8年担当。BGP/OSPFを用いた冗長構成の実績多数。',
  },
  {
    name: '鈴木彩香',
    roles: ['ネットワークエンジニア'],
    skills: [
      { name: 'ネットワーク構築', years: 4, level: 'advanced' },
      { name: 'CCNA', years: 4, level: 'advanced' },
      { name: 'ネットワーク運用', years: 3, level: 'intermediate' },
    ],
    status: 'available',
    location: '大阪',
    summary: '中規模企業のLAN/WAN構築を中心に4年経験。監視運用の切り分けにも対応可能。',
  },
  {
    name: '高橋直人',
    roles: ['インフラエンジニア'],
    skills: [
      { name: 'Cisco IOS', years: 10, level: 'expert' },
      { name: 'CCNP', years: 7, level: 'expert' },
      { name: 'ロードバランサ', years: 6, level: 'advanced' },
      { name: 'セキュリティ', years: 5, level: 'advanced' },
    ],
    status: 'assigned',
    until: '2026-09-30',
    location: '東京・新宿',
    summary: '金融系データセンターのネットワーク基盤を10年担当。F5ロードバランサの実務経験豊富。',
  },
  {
    name: '田中美咲',
    roles: ['インフラエンジニア'],
    skills: [
      { name: 'Linux', years: 6, level: 'advanced' },
      { name: 'Windows Server', years: 5, level: 'advanced' },
      { name: 'Active Directory', years: 4, level: 'intermediate' },
      { name: '監視', years: 3, level: 'intermediate' },
    ],
    status: 'available',
    location: '東京・秋葉原',
    summary: 'オンプレサーバの構築・運用保守を6年経験。Zabbixによる監視基盤構築が得意。',
  },
  {
    name: '伊藤翔太',
    roles: ['クラウドエンジニア'],
    skills: [
      { name: 'AWS', years: 5, level: 'expert' },
      { name: 'Terraform', years: 4, level: 'advanced' },
      { name: 'Docker', years: 3, level: 'advanced' },
      { name: 'Linux', years: 5, level: 'advanced' },
    ],
    status: 'available',
    location: 'フルリモート',
    summary: 'AWS基盤のIaC化を主導した経験を持つ。Terraformでのマルチアカウント運用が得意。',
  },
  {
    name: '渡辺結衣',
    roles: ['クラウドエンジニア'],
    skills: [
      { name: 'Azure', years: 4, level: 'advanced' },
      { name: 'Kubernetes', years: 3, level: 'intermediate' },
      { name: 'Ansible', years: 3, level: 'intermediate' },
    ],
    status: 'available',
    location: '名古屋',
    summary: 'Azure上のコンテナ基盤設計を4年経験。Ansibleによる構成管理の自動化を推進。',
  },
  {
    name: '山本大輔',
    roles: ['クラウドエンジニア'],
    skills: [
      { name: 'GCP', years: 6, level: 'expert' },
      { name: 'Kubernetes', years: 5, level: 'expert' },
      { name: 'Docker', years: 6, level: 'expert' },
      { name: 'Python', years: 4, level: 'advanced' },
    ],
    status: 'assigned',
    until: '2026-08-15',
    location: 'フルリモート',
    summary: 'GKEを用いたマイクロサービス基盤の設計運用を6年担当。SRE的な改善活動も得意。',
  },
  {
    name: '中村さくら',
    roles: ['Webエンジニア'],
    skills: [
      { name: 'JavaScript', years: 5, level: 'advanced' },
      { name: 'TypeScript', years: 4, level: 'advanced' },
      { name: 'React', years: 4, level: 'advanced' },
      { name: 'Node.js', years: 3, level: 'intermediate' },
    ],
    status: 'available',
    location: '東京・渋谷',
    summary: 'toC向けWebサービスのフロントエンド開発を5年経験。React/TypeScriptでの設計が得意。',
  },
  {
    name: '小林蓮',
    roles: ['Webエンジニア'],
    skills: [
      { name: 'PHP', years: 6, level: 'expert' },
      { name: 'MySQL', years: 6, level: 'advanced' },
      { name: 'JavaScript', years: 4, level: 'intermediate' },
    ],
    status: 'available',
    location: '福岡',
    summary: 'EC系サービスのバックエンド開発を6年担当。大規模トラフィックのDB設計経験あり。',
  },
  {
    name: '加藤陽菜',
    roles: ['Webエンジニア'],
    skills: [
      { name: 'Java', years: 7, level: 'expert' },
      { name: 'SQL', years: 7, level: 'advanced' },
      { name: 'Oracle', years: 4, level: 'intermediate' },
    ],
    status: 'available',
    location: '東京・丸の内',
    summary: '基幹業務システムのJava開発を7年経験。要件定義から結合テストまで一気通貫で対応可能。',
  },
  {
    name: '吉田颯太',
    roles: ['Webエンジニア'],
    skills: [
      { name: 'Ruby', years: 3, level: 'intermediate' },
      { name: 'PostgreSQL', years: 3, level: 'intermediate' },
      { name: 'Next.js', years: 2, level: 'beginner' },
    ],
    status: 'available',
    location: 'フルリモート',
    summary: 'スタートアップでRailsを用いた新規サービス開発を3年経験。フロントも一部担当。',
  },
  {
    name: '山田香織',
    roles: ['PM'],
    skills: [
      { name: 'PM', years: 8, level: 'expert' },
      { name: '要件定義', years: 8, level: 'expert' },
      { name: '基本設計', years: 6, level: 'advanced' },
    ],
    status: 'available',
    location: '東京・品川',
    summary: '通信キャリア案件のPMを8年経験。要件定義から本番稼働までの一貫したプロジェクト管理が強み。',
  },
  {
    name: '佐々木悠斗',
    roles: ['PM'],
    skills: [
      { name: 'PM', years: 5, level: 'advanced' },
      { name: '詳細設計', years: 5, level: 'advanced' },
      { name: 'ネットワーク運用', years: 3, level: 'intermediate' },
    ],
    status: 'assigned',
    until: '2026-10-31',
    location: '大阪',
    summary: 'インフラ更改プロジェクトのPMを5年経験。ベンダー調整と進捗管理を得意とする。',
  },
  {
    name: '松本真央',
    roles: ['インフラエンジニア'],
    skills: [
      { name: 'VMware', years: 6, level: 'expert' },
      { name: 'Windows Server', years: 5, level: 'advanced' },
      { name: '監視', years: 4, level: 'advanced' },
    ],
    status: 'available',
    location: '東京・浜松町',
    summary: '仮想化基盤の設計構築を6年経験。vSphereクラスタの移行プロジェクトを複数主導。',
  },
  {
    name: '井上和也',
    roles: ['ネットワークエンジニア'],
    skills: [
      { name: 'OSPF', years: 5, level: 'advanced' },
      { name: 'Cisco IOS', years: 6, level: 'advanced' },
      { name: 'ロードバランサ', years: 3, level: 'intermediate' },
    ],
    status: 'available',
    location: '横浜',
    summary: '拠点間VPN網の設計構築を6年経験。障害切り分けのスピードに定評がある。',
  },
  {
    name: '木村奈々',
    roles: ['クラウドエンジニア'],
    skills: [
      { name: 'AWS', years: 3, level: 'advanced' },
      { name: 'Docker', years: 3, level: 'intermediate' },
      { name: 'Python', years: 3, level: 'intermediate' },
    ],
    status: 'available',
    location: 'フルリモート',
    summary: '中小規模のAWS移行案件を3年経験。CI/CDパイプライン構築の実績もある。',
  },
  {
    name: '林拓海',
    roles: ['Webエンジニア', 'インフラエンジニア'],
    skills: [
      { name: 'Go', years: 4, level: 'advanced' },
      { name: 'Linux', years: 4, level: 'advanced' },
      { name: 'Kubernetes', years: 2, level: 'intermediate' },
    ],
    status: 'available',
    location: '東京・恵比寿',
    summary: 'バックエンドAPI開発とインフラ構築の両方を経験。Go言語でのマイクロサービス設計が得意。',
  },
  {
    name: '清水美月',
    roles: ['PM'],
    skills: [
      { name: 'PM', years: 4, level: 'advanced' },
      { name: 'セキュリティ', years: 3, level: 'intermediate' },
      { name: '要件定義', years: 4, level: 'advanced' },
    ],
    status: 'available',
    location: '東京・品川',
    summary: 'セキュリティ強化プロジェクトのPMを4年経験。監査対応や社内調整を得意とする。',
  },
  {
    name: '斎藤陸',
    roles: ['ネットワークエンジニア'],
    skills: [
      { name: 'ファイアウォール', years: 5, level: 'advanced' },
      { name: 'セキュリティ', years: 5, level: 'advanced' },
      { name: 'CCNA', years: 5, level: 'advanced' },
    ],
    status: 'available',
    location: '福岡',
    summary: 'FortiGateを用いた境界防御の設計構築を5年経験。セキュリティ監視の運用にも精通。',
  },
  {
    name: '橋本七海',
    roles: ['Webエンジニア'],
    skills: [
      { name: 'C#', years: 5, level: 'advanced' },
      { name: 'SQL', years: 5, level: 'advanced' },
      { name: 'Azure', years: 2, level: 'beginner' },
    ],
    status: 'assigned',
    until: '2026-08-31',
    location: '東京・池袋',
    summary: '業務アプリケーションの.NET開発を5年経験。Azureへの移行案件にも参画中。',
  },
]

/** src/lib/db.ts の Employee 形式にそのまま渡せる20名分のデモデータを生成する */
export function createSeedEmployees(): Employee[] {
  const now = new Date().toISOString()
  return SEED_INPUTS.map((input, i) => ({
    id: crypto.randomUUID(),
    name: input.name,
    roles: input.roles,
    skills: input.skills,
    availability: { status: input.status, until: input.until },
    location: input.location,
    summary: input.summary,
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
    updatedAt: now,
  }))
}
