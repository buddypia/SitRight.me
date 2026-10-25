# feature-pilot の指示の食い違いを、複数プロジェクトの実行記録と静的な検査で見つけて揃える

- 領域: feature-pilot
- 日付: 2026-10-25
- 出典: 8 プロジェクトの Claude Code セッション 90 件（feature-pilot を読んだもの。うち Skill で起動した開発依頼 51 件）、brief2dev HEAD 20c7fafb の静的検査、brief2dev への上流 PR

## 部品ごとの変更と観察

| 部品 | 変更 | 観察 | 判定 |
|---|---|---|---|
| `feature-pilot`（SKILL.md・`references/feature-pilot-protocol-details.md`） | worktree を作る時点を PF-008（最初のファイル編集の前。SPEC と文書も含む）に揃え、ルーティング表と Step 7・Step 3.6 の「Readiness Gate のあと」を外した | 変更前は両方の順番が見えた 34 件のうち 31 件が SPEC より前、3 件が後に worktree を作っていた。変更後の実行はまだ見ていない | 切り分け不能 |
| `feature-pilot`（`references/feature-pilot-protocol-details.md`） | Step 3.5 の「3 タスク以上で SDD を自動起動」を #91 の `feature-implementer` § SDD Mode に合わせ、Step 3.6 の PLAN を worktree 直下ではなく `.tmp/worktree-<safeBranch>/PLAN.md` にした | #91 で直し漏れた食い違いを静的な検査で見つけた。実行では確かめていない | 切り分け不能 |

## 持ち越す教訓

- **きっかけ**: brief2dev から移植した skill を監査したいが、このリポジトリでその skill を読んだセッションが少ない
- **教訓**: 同じ skill を移植した全プロジェクトの `~/.claude/projects/*/*.jsonl` から、Skill で起動したセッションだけを数える（AGENTS.md のトリガー行は毎セッション注入されるので、パスの文字列検索では数えない）。あわせて、参照先の実在と記述同士の食い違いを静的に検査し、直すのは `managed` なので上流（brief2dev）と同じ文面にする
- **根拠**: どちらの行も `切り分け不能`。31 件対 3 件の分かれと静的検査の食い違いは、直す箇所を選んだ根拠にはなるが、直した効果は支えない
- **確度**: 低 — 変更後の実行を見ていない。次に feature-pilot を使う開発依頼で、SPEC を書く前に worktree を作ったかを確かめる
