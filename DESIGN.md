---
version: alpha
name: 内容抽出 (Anken Match)
description: 案件メールを解析し、自社人材との最適マッチを提示する意思決定ツール
colors:
  surface: "oklch(98.5% 0.003 250)"
  surface-raised: "#FFFFFF"
  ink: "oklch(22% 0.01 250)"
  ink-soft: "oklch(48% 0.012 250)"
  line: "oklch(90% 0.006 250)"
  accent: "oklch(44% 0.10 250)"
  accent-soft: "oklch(94% 0.02 250)"
  match-strong: "oklch(52% 0.12 155)"
  match-mid: "oklch(62% 0.13 80)"
  match-weak: "oklch(60% 0.02 250)"
  danger: "oklch(52% 0.17 25)"
typography:
  h1:
    fontFamily: -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif
    fontSize: clamp(24px, 3.2vw, 32px)
    fontWeight: 700
    lineHeight: 1.25
  h2:
    fontFamily: -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif
    fontSize: 18px
    fontWeight: 650
    lineHeight: 1.4
  body:
    fontFamily: -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.7
  numeric:
    fontFamily: -apple-system, "Hiragino Kaku Gothic ProN", sans-serif
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 10px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#FFFFFF"
    borderRadius: "{rounded.sm}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    borderRadius: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface-raised}"
    borderColor: "{colors.line}"
    borderRadius: "{rounded.md}"
  skill-tag:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    borderRadius: "{rounded.pill}"
---

## Overview

コンセプトは**「静かな選考室」**。営業担当が案件メールと自社の人材を一枚のテーブルに載せ、
数分で「この人を提案する」と決められる道具。主役はマッチング結果であり、UIは意思決定の邪魔をしない。

判断基準は「スティーブ・ジョブズはこれで納得するか」:
- 開いて3クリック以内に答え（推薦候補）へ到達する
- 機能をタブで並べない。**案件を軸にした一本のフロー**（取込 → 抽出確認 → マッチ → 提案文）
- 装飾ゼロ。情報の階層は余白・ウェイト・罫線だけで作る
- 空状態・ローディング・エラーも本設計の一部（空状態は必ず「一文＋次の行動ボタン」）

学習手帳（紙ノート×明朝）とは別ブランド。こちらは**クールな無彩色＋鋼青**の実務ツール。ライトテーマ単一。

## Colors

色は意味でのみ使う。面積の95%は `surface` / `ink` / `line` の無彩色で構成する。

- `accent`（鋼青）: 行動。主ボタン・リンク・選択状態・進行中ステップ。装飾には使わない
- `match-strong` / `match-mid` / `match-weak`: マッチ度の三段階。スコアバッジとスコアバーだけに使う
- `danger`（赤）: 破壊操作・必須スキル未充足の警告のみ
- グラデーション・影付き色面・カラフルなイラストは使わない

## Typography

システムサンセリフ一本。外部フォント読込なし（性能・CSP優先）。
階層はサイズよりウェイト（400/650/700）と `ink-soft` への格下げで表現する。
スコア・単価・年数などの数値は必ず `tabular-nums`＋`numeric` トークン。数字はこのアプリの主役級。

## Layout

- 最大幅 1080px 中央寄せ。案件詳細は2カラム（左: 抽出結果の構造化ビュー、右: 候補者ランキング）
- モバイル（<800px）は1カラムに畳む。優先順位は候補者 → 抽出結果 → 原文
- 余白は `spacing` トークンのみ。均一パディングで塗りつぶさず、関連の強さを距離で示す
- 原文メールは常に折りたたみで従属。構造化された抽出結果が正面

## Elevation & Depth

影は使わない。面の区別は `surface` と `surface-raised` の明度差＋ `line` の1px罫線のみ。
重なり（モーダル）は最小限にし、原則インライン展開で解決する。

## Shapes

角丸は控えめ（sm=6px, md=10px）。スキルタグのみ pill。丸すぎる形は玩具的になるので禁止。

## Components

- **スコアバッジ**: 0–100 の数値＋三段階色。根拠（内訳）はホバー/タップで展開
- **スキルタグ**: pill 型。必須スキルは `accent` 枠線付き、歓迎スキルは枠線なし。充足済みは塗り、未充足は打ち消し風に `danger` 下線
- **ステッパー**: 取込→抽出→マッチ→提案 の現在地を上部に細く表示。クリックで戻れる
- **テーブル**: 横罫のみ。行ホバー `accent-soft`。ソートは列見出しクリック
- **フォーム**: ラベル上置き。フォーカスリング `accent` 2px。エラーは入力直下に一文

## Do's and Don'ts

- Do: hover/focus を必ず設計（ボタン沈み込み translateY(1px)、150–250ms、transform/opacity のみ）
- Do: `prefers-reduced-motion` でトランジション削除
- Do: 1画面1目的。迷ったら要素を削る
- Don't: ダッシュボード的なカードグリッドの羅列、絵文字アイコンの多用、影の多層化
- Don't: LLM待ち時間を裸のスピナーで放置しない — 何を抽出中かを一文で示すスケルトンを出す
