# 並列 worktree の検証ゲートを差分判定と共有 scratchpad キャッシュで短縮する

- 領域: worktree
- 日付: 2026-10-24
- 出典: feature/optimize-worktree-verification-gate

## 部品ごとの変更と観察

| 部品 | 変更 | 観察 | 判定 |
|---|---|---|---|
| `scripts/check-agent-harness.mjs` と `.cli/lib/edited-files.mjs` | hook モジュールの構文検査を `node --check` の子プロセス起動ループから同一プロセス内の `espree.parse`＋内容 SHA-256 キャッシュに置き換え、`editedFiles` のルート解決を `.git` 探索優先にした | `tests/unit/agent-harness.test.ts` の所要時間が 9.21s から 3.26s に短縮され、`validateHarness(REPO)` 単体は 2,161ms から 53ms になった | 効いた |
| `scripts/lib/agent-scratchpad.mjs` と `scripts/verify-gate.mjs` | `<mainRoot>/.tmp/agent-scratchpad` に worktree 横断の検証結果キャッシュとビルド排他ロックを置き、`make q.check` でアプリ本体に無関係な変更のときは `next build` を省略するようにした | 従来の `make q.check`（約 38.0s）がフル実行でも 15.9s、2 回目以降や同一入力ハッシュの別 worktree では 174ms（キャッシュ判定）で完了することを単体テストと実測で確かめた | 効いた |
| `eslint.config.mjs`・`tsconfig.json`・`vitest.config.mts` | `.worktrees/**`・`.tmp/**`・`.cache/**` を除外に追加し、Vitest の `isolate: false` でワーカーを再利用するようにした | 並列 worktree が複数ある状態で親リポジトリやテストから ESLint・TypeScript が他の worktree を走査しなくなり、22 ファイル 227 テストが 3.55s で通った | 効いた |

## 持ち越す教訓

- **きっかけ**: 複数の AI CLI が `.worktrees/<branch>` を並列に所有してコミット・`make q.check`・PR マージを回すとき、毎回フルビルドや子プロセス起動が重なって検証ゲートで詰まる
- **教訓**: 1 件ごとの子プロセス起動（`node --check` や `git rev-parse`）は同一プロセス内の構文解析・ファイル探索に置き換え、worktree 間で共有できる検証結果と排他ロックは `git-common-dir` 配下の `.tmp/agent-scratchpad` に集約して、アプリ本体に触れない worktree では重いビルドを `main` / CI に委ねる
- **根拠**: `validateHarness` が 2,161ms から 53ms、`agent-harness.test.ts` が 9.21s から 3.58s に縮み、`verify-gate.test.ts` で差分スキップとキャッシュ再利用を検証した
- **確度**: 高 — 同一ワークツリーでの実測値（before/after）と単体テストの両方で短縮を確認した
