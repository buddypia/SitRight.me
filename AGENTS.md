# SitRight.me

ブラウザだけで動く AI 姿勢判定 Web アプリ（SPA）。処理はすべてクライアントで完結させ、カメラ映像は外部サーバーに送らない。構成・データフロー・技術選定は `docs/ARCHITECTURE.md`。

## このリポジトリの前提

- Next.js 16（App Router、`output: 'export'` の静的書き出し）、React 19、TypeScript（strict）、MediaPipe Tasks Vision（姿勢推定）、three.js（3D シーン）、Zustand（状態管理）、Tailwind CSS v4。
- パッケージ管理は npm。`package-lock.json` をコミットする。
- 確認は `npm run lint` / `npm run type-check` / `npm test`（Vitest、`tests/unit/**/*.test.ts`）/ `npm run build` / `npm run check:harness`。e2e（`npm run test:e2e`、Playwright）は CI で回し、ローカルでは新しいブラウザを起動しない。
- 配信は Cloudflare Pages。デプロイは `npm run deploy`（`wrangler pages deploy`。`cf pages deploy` は Legacy Pages に未対応）、バインディングは `wrangler.toml`。分析・監視は `cf`（`npm run analytics`、`npx cf rum`、`npx cf speed`）。Workers Assets へ移ったら `wrangler` を外し、`cf deploy` と `cloudflare.config.ts` に一本化する。

## コーディング規則

- Prettier（`.prettierrc`）と ESLint（`eslint.config.mjs`）に従う。
- 変数・関数は camelCase、コンポーネント・クラス・型は PascalCase、独自の CSS クラスは BEM（`block__element--modifier`）。
- コンポーネントは `src/components/<Name>/` に関連ファイルと `index.ts` をまとめる。見た目（Presentational Component）と振る舞い（カスタムフック）を分ける。
- 非同期処理は `async/await` を第一に選ぶ。
- API キーなどの機密は `.env` で管理し、ビルドで組み込む。コミットしない。
- 言語切替など、使う前提になる機能は共通ヘッダーから 1 操作で切り替えられるようにし、モーダルやサブ設定に埋めない。感度・通知間隔・効果音などの詳細設定は `SettingsSheet` にまとめる。

## 開発の流れ

- GitHub Flow。`main` が本番。作業は worktree で行う（`make wt.new BR=feature/<ISSUE#>-<description>`）。
- `main` への PR で CI（`.github/workflows/ci.yml`）が lint・型・unit test・build・e2e を回し、`main` へのマージで本番へデプロイされる。
- コード生成と品質検証（`make q.check`・レビュー記録）が完了したら `.claude/config/approval-policy.json` で危険度を判定し、大規模変更（T2: 10 ファイル以上または 300 LOC 以上）のときだけ人間のレビューを求め、それ以外（T0 / T1）は `node .claude/scripts/create-pr/ops.mjs ship-worktree` で自動マージと worktree クリーンアップまで完了させる。
- e2e が一度でも落ちた PR は、再実行で通っても原因を特定するまでマージしない。CI ログの `[e2e] calibrated at` / `alert at` / `avatar ready at` と各テストの所要時間を main の直近の成功 run と比べ、遅くなっていれば不安定なテストではなく性能の退行として扱う。

## 作業の前に読むもの

- テレメトリ・分析・外部への通信を追加・変更するときは `docs/TELEMETRY_CONTRACT.md` を読んで従う（集計の運用は `docs/ANALYTICS.md`）。
- UI 文言（ja / en / ko）を追加・変更するときは `docs/UI_COPY_GUIDELINES.md` を読んで従う。
- 新機能の追加・機能変更など、開発の依頼を受けたときは `.agents/skills/feature-pilot/SKILL.md` を読んで従う。
- ユーザーストーリーや要件から SPEC.md と画面ドキュメントを起こすときは `.agents/skills/feature-architect/SKILL.md` を読んで従う。
- SPEC.md と画面ドキュメントを新しく書くときは `.agents/skills/feature-spec-generator/SKILL.md` を読んで従う。
- 既存の SPEC を更新する（FR の追加・変更）ときは `.agents/skills/feature-spec-updater/SKILL.md` を読んで従う。
- SPEC.md をユーザーストーリーと受け入れ条件に分けるときは `.agents/skills/story-decomposer/SKILL.md` を読んで従う。
- SPEC からファイル単位の実装計画を書くときは `.agents/skills/engineering-plan-writer/SKILL.md` を読んで従う。
- 実装前に画面のワイヤーフレームを作って承認を取るときは `.agents/skills/ui-approval-gate/SKILL.md` を読んで従う。
- SPEC.md と画面ドキュメントをもとに TDD で実装するときは `.agents/skills/feature-implementer/SKILL.md` を読んで従う。
- 実装した機能の export・ルート・データフローのつながりを確かめるときは `.agents/skills/feature-wiring/SKILL.md` を読んで従う。
- ログ・メトリクス・トレース・アラートを設計するときは `.agents/skills/observability-and-instrumentation/SKILL.md` を読んで従う。
- CONTEXT.json と index.md の進捗を同期するときは `.agents/skills/feature-status-sync/SKILL.md` を読んで従う。
- SPEC の API 定義から Zod スキーマ・API クライアント・MSW モックを作るときは `.agents/skills/contract-codegen/SKILL.md` を読んで従う。
- Zod スキーマから契約テストを作って回すときは `.agents/skills/contract-tester/SKILL.md` を読んで従う。
- 「動かない」「エラーが出る」「落ちる」などのバグを直すときは `.agents/skills/bug-fix/SKILL.md` を読んで従う。
- バグ・テスト失敗・想定外の挙動を直す前に原因を調べるときは `.agents/skills/systematic-debugging/SKILL.md` を読んで従う。
- 挙動を変えずに直近の変更をコーディング規則に揃えるときは `.agents/skills/code-standards-aligner/SKILL.md` を読んで従う。
- コミットや PR の前に品質チェック（`make q.check`）をするときは `.agents/skills/pre-quality-gate/SKILL.md` を読んで従う。
- 大きな変更や品質リスクの高い変更をまとめて検証するときは `.agents/skills/verification-loop/SKILL.md` を読んで従う。
- PR を作る直前に、変更の大きさに合うレビュー手段を選ぶときは `.agents/skills/pre-ship-quality-advisor/SKILL.md` を読んで従う。
- 最終レビュー・QA・コードチェックを頼まれたときは `.agents/skills/final-review/SKILL.md` を読んで従う。
- worktree の作業を PR にして出すときは `.agents/skills/create-pr/SKILL.md` を読んで従う。
- AGENTS.md・skill・スクリプト・hook を追加・変更するときは `.agents/skills/agent-harness/SKILL.md` を読んで従う。

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
