# harness 経験ライブラリ

`npm run harness:index` が `docs/harness/experience/` から作り直す。手で編集しない。

harness（AGENTS.md・skill・スクリプト・hook）を変える前に、同じ領域のエントリを開いて教訓を読む。前の作業で確かめた事実も、ここでは仮説として確かめ直す。書き方は `.agents/skills/agent-harness/SKILL.md`。

## e2e

- [e2e の失敗を再実行で流さず、CI ログの時刻を main と比べて性能の退行を探す](experience/2026-10-13-e2e-timing-regression.md) — 2026-10-13 · 確度 中 · 部品: CI ログの時刻の比べ方, `AGENTS.md`（常駐、当時は `CLAUDE.md`）
  - きっかけ: 描画やメインスレッドの負荷に触れる変更のあとで、e2e がときどき落ち、再実行すると通る

## feature-pilot

- [feature-pilot の指示の食い違いを、複数プロジェクトの実行記録と静的な検査で見つけて揃える](experience/2026-10-25-feature-pilot-audit.md) — 2026-10-25 · 確度 低 · 部品: `feature-pilot`（SKILL.md・`references/feature-pilot-protocol-details.md`）, `feature-pilot`（`references/feature-pilot-protocol-details.md`）
  - きっかけ: brief2dev から移植した skill を監査したいが、このリポジトリでその skill を読んだセッションが少ない

## scene

- [3D シーンを覆う backdrop-filter の禁止を、常駐の文章から hook と ESLint に移す](experience/2026-10-18-scene-backdrop-hook.md) — 2026-10-18 · 確度 中 · 部品: `src/components/PostureScene`, `CLAUDE.md`（常駐）, `scene-backdrop-guard` hook と ESLint
  - きっかけ: 1 ファイルの中だけで機械的に見分けられる禁止事項（クラスの組み合わせ、使ってはいけない API）が、常駐の文章として書かれている

## skill-listing

- [スタックに無い plugin と skill をプロジェクト設定でモデルの一覧から外す](experience/2026-10-25-project-skill-listing.md) — 2026-10-25 · 確度 中 · 部品: `.claude/settings.json` の `enabledPlugins`, `.claude/settings.json` の `skillOverrides`
  - きっかけ: セッションに読み込まれる skill が数百あり、その多くがこのリポジトリの依存（`package.json`）に無い技術向けである

## subagent

- [タスクごとの実装 subagent（SDD）を既定から外し、主ループの inline TDD を既定にする](experience/2026-10-25-fold-sdd-subagents.md) — 2026-10-25 · 確度 低 · 部品: `feature-implementer`（SKILL.md・`references/implementation-protocol-details.md`）, `engineering-plan-writer`（呼び出し図）, `agent-harness`（「Subagent を足す・残す・畳む」）
  - きっかけ: skill が、タスクの数や作業の種類（設計・実装・テスト）を理由に subagent を自動で起動するよう書かれている

## verification

- [全体検査が通っても、入力の同一性と検査対象の反例を試す](experience/2026-10-28-fingerprint-false-passes.md) — 2026-10-28 · 確度 中 · 部品: type-check の変更分類, fingerprint のリンク入力, fingerprint のファイル入力
  - きっかけ: 成功 cache の同一性をファイルの metadata や拡張子の一部だけで判断する gate を変える
- [検証の省略を成功キャッシュにせず、段階ごとの実行証拠を残す](experience/2026-10-28-verification-receipt.md) — 2026-10-28 · 確度 中 · 部品: `scripts/verify-gate.mjs` のキャッシュ, `scripts/verify-gate.mjs` の検証と receipt, `agent-harness` skill, `scripts/verify-gate.mjs` の共有 verdict 更新, harness 検査の入力範囲, `pre-quality-gate` skill
  - きっかけ: 差分で検査を省略する gate が、同じ場所に成功キャッシュも保存する
