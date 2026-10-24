# タスクごとの実装 subagent（SDD）を既定から外し、主ループの inline TDD を既定にする

- 領域: subagent
- 日付: 2026-10-25
- 出典: Anthropic「Building agents: When to fold subagents into your main agent loop」、このリポジトリの Claude Code セッション 19 件（2026-10-08〜10-24）

## 部品ごとの変更と観察

| 部品 | 変更 | 観察 | 判定 |
|---|---|---|---|
| `feature-implementer`（SKILL.md・`references/implementation-protocol-details.md`） | SDD の起動条件を「PLAN.md に独立タスクが 3 つ以上」から「`write_scope` の重ならない並列レーン」か「この機能の作業中に文脈の膨張で劣化が出た」に絞り、既定を inline TDD にした。Task Reviewer は残した | 変更前の 19 セッションで subagent は 11 回呼ばれ、10 回が独立レビュー・検証、1 回が翻訳で、SDD の実装 subagent は 0 回。変更後に SDD の条件に当たる作業はまだ無く、挙動の違いは見ていない | 切り分け不能 |
| `engineering-plan-writer`（呼び出し図） | 「subagent per task + 2-stage review」を新しい条件と Task Reviewer に合わせた | 図だけの変更で、試す場面が無い | 切り分け不能 |
| `agent-harness`（「Subagent を足す・残す・畳む」） | subagent にしてよい 3 条件、小さく返させること、1 つずつ畳んで結果の変わった作業を見ることを足した | 次に subagent を足す・畳む作業でまだ使われていない | 切り分け不能 |

## 持ち越す教訓

- **きっかけ**: skill が、タスクの数や作業の種類（設計・実装・テスト）を理由に subagent を自動で起動するよう書かれている
- **教訓**: 起動条件を「並列にでき互いの結果をほとんど要らない」「書いた本人でない目の検証」「主ループで文脈の膨張が実際に出た」に絞り、既定は主ループで続ける。検証用の subagent は残す。変えたあとは同じ作業を 2 回以上やり、結果の変わった作業を見る
- **根拠**: どの行も 切り分け不能。subagent の使用実績（11 回中 10 回が検証、実装 subagent 0 回）は、検証用を残し実装用を既定から外しても現状の使い方が変わらないことだけを支える
- **確度**: 低 — 変更後の実行を見ていない。SDD の条件に当たる機能開発で、inline と SDD のどちらを選んだかと結果を次のエントリに残す
