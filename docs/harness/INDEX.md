# harness 経験ライブラリ

`npm run harness:index` が `docs/harness/experience/` から作り直す。手で編集しない。

harness（AGENTS.md・skill・スクリプト・hook）を変える前に、同じ領域のエントリを開いて教訓を読む。前の作業で確かめた事実も、ここでは仮説として確かめ直す。書き方は `.agents/skills/agent-harness/SKILL.md`。

## e2e

- [e2e の失敗を再実行で流さず、CI ログの時刻を main と比べて性能の退行を探す](experience/2026-10-13-e2e-timing-regression.md) — 2026-10-13 · 確度 中 · 部品: CI ログの時刻の比べ方, `AGENTS.md`（常駐、当時は `CLAUDE.md`）
  - きっかけ: 描画やメインスレッドの負荷に触れる変更のあとで、e2e がときどき落ち、再実行すると通る

## scene

- [3D シーンを覆う backdrop-filter の禁止を、常駐の文章から hook と ESLint に移す](experience/2026-10-18-scene-backdrop-hook.md) — 2026-10-18 · 確度 中 · 部品: `src/components/PostureScene`, `CLAUDE.md`（常駐）, `scene-backdrop-guard` hook と ESLint
  - きっかけ: 1 ファイルの中だけで機械的に見分けられる禁止事項（クラスの組み合わせ、使ってはいけない API）が、常駐の文章として書かれている

## worktree

- [並列 worktree の検証ゲートを差分判定と共有 scratchpad キャッシュで短縮する](experience/2026-10-24-worktree-verify-gate-scratchpad.md) — 2026-10-24 · 確度 高 · 部品: `scripts/check-agent-harness.mjs` と `.cli/lib/edited-files.mjs`, `scripts/lib/agent-scratchpad.mjs` と `scripts/verify-gate.mjs`, `eslint.config.mjs`・`tsconfig.json`・`vitest.config.mts`
  - きっかけ: 複数の AI CLI が `.worktrees/<branch>` を並列に所有してコミット・`make q.check`・PR マージを回すとき、毎回フルビルドや子プロセス起動が重なって検証ゲートで詰まる
