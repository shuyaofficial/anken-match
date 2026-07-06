# 内容抽出（anken-match）

SES案件紹介メールをLLMで構造化抽出し、自社人材のスキルセットと照合して「誰を提案するか」を数分で決めるためのローカル完結SPA。

- **取込**: メール本文の貼り付け / .eml・.txtファイル / Gmail API（読み取り専用）
- **抽出**: Claude APIでスキル（必須/歓迎）・単価・期間・商流などをJSON構造化
- **マッチング**: 決定的スコアリング（必須充足0.6＋歓迎0.2＋経験年数0.2、API課金ゼロ）＋上位5名のみLLM再ランク＆提案根拠生成
- **提案**: 候補者のアピール要約とクライアント向け返信ドラフトを生成・編集・コピー
- **トレンド**: 蓄積案件からスキル需要Top10・月別推移・増減を可視化

## 使い方

```bash
npm install
npm run dev      # http://localhost:5173
```

初回は「案件」タブの**サンプルメールで試す**と「人材」タブの**デモ社員20名を投入**で、APIキー無しでもマッチングまで体験できます（決定的スコアリングはローカル計算のため）。

LLM機能（抽出・再ランク・提案文）を使うには、設定タブで自分のAnthropic APIキーを登録してください（BYOK方式）。

## アーキテクチャ

- Vite + React 19 + TypeScript。サーバなし・全データはブラウザのIndexedDB/localStorageに保存
- **BYOK**: APIキー・Gmail OAuth Client IDは利用者自身のものをこの端末にのみ保存。外部送信はAnthropic API（抽出・生成時）とGmail API（取込時）のみ
- `src/lib/` がエンジン層（extraction / matching / normalize / proposals / mail）、`src/features/` が画面
- スキル名は正規化辞書（`src/lib/normalize.ts`）で表記ゆれを吸収（例: k8s ≡ Kubernetes）
- Projectの永続化は `InboxView` の単一所有。子パネルは更新オブジェクトを報告するのみ

## Gmail連携のセットアップ

1. Google Cloud ConsoleでプロジェクトID作成 → Gmail APIを有効化
2. OAuth同意画面を構成し、自分のGmailをテストユーザーに追加
3. OAuthクライアントID（ウェブアプリケーション）を作成し、「承認済みのJavaScript生成元」にアプリのURL（ローカルなら `http://localhost:5173`）を追加
4. 取得したClient IDをアプリの設定タブに登録
5. 案件タブの取込パネル「Gmailから取り込む」で検索クエリを指定して実行（scope: gmail.readonly のみ、トークンはメモリのみ保持）

詳細手順は設定画面内の折りたたみヘルプ参照。

## 開発

```bash
npm run test     # vitest（lib層＋純関数を網羅）
npm run lint     # oxlint + eslint(react-hooks)
npm run build    # tsc -b && vite build
```

- デザイン規約は [DESIGN.md](DESIGN.md)（コンセプト「静かな選考室」）を正とする
- データモデル契約は [src/lib/types.ts](src/lib/types.ts)
- 設計思想の応用例・既存サービス比較は [docs/活用提案.md](docs/活用提案.md)

## 既知の制限

- コンポーネント層のテスト（React Testing Library）は未整備。lib層・純関数は109テストでカバー
- Gmail取込の重複排除は未対応（同じメールを再取込すると重複する）
- 抽出はLLM依存のため、メール本文に埋め込まれた指示への耐性はプロンプト指示＋出力スキーマ検証＋人間レビュー前提の多層で緩和（完全ではない）
