# スタックに無い plugin と skill をプロジェクト設定でモデルの一覧から外す

- 領域: skill-listing
- 日付: 2026-10-25
- 出典: このブランチの `.claude/settings.json`、`claude -p --output-format stream-json` の init イベントで数えた skill 数

## 部品ごとの変更と観察

| 部品 | 変更 | 観察 | 判定 |
|---|---|---|---|
| `.claude/settings.json` の `enabledPlugins` | このリポジトリで使わない posthog・dart-flutter・supabase・postgres-best-practices を `false` にした（user 設定の `true` より project 設定が優先） | init イベントの skill 数が 366 から 172 になり、4 つの plugin が plugins から消えた | 効いた |
| `.claude/settings.json` の `skillOverrides` | 依存に無い技術の user skill 24 個（remotion-*・supabase・shadcn・Cloudflare Sandbox / Agents / Durable Objects / One / Email）を `user-invocable-only` にした | init イベントには残るが、`claude -p` でモデルに一覧を書き写させると該当名は 0 件で、`wrangler` は残った。選択の精度が上がったかは測っていない | 切り分け不能 |

## 持ち越す教訓

- **きっかけ**: セッションに読み込まれる skill が数百あり、その多くがこのリポジトリの依存（`package.json`）に無い技術向けである
- **教訓**: 外すときは plugin 単位を `enabledPlugins: false`、user skill 単位を `skillOverrides: "user-invocable-only"`（`/名前` では呼べる）で project の `.claude/settings.json` に置く。worktree にも届くよう `settings.local.json` には置かない。効いたかは `claude -p "OK" --output-format stream-json --verbose --max-turns 1` の init の `skills` の数と、モデルに一覧を書き写させた結果で確かめる
- **根拠**: `enabledPlugins` の行（366 → 172）
- **確度**: 中 — 一覧から消えることは確かめたが、skill の選び方が良くなったかは同じ依頼のやり直しで見ていない
