---
name: agent-harness
description: AGENTS.md・CLAUDE.md・skill・スクリプト・subagent・hook（.codex/hooks.json / .claude/settings.json）を追加・変更するときの置き場所と書き方。Google Research の Harness² が harness の採否に使う規則をこのリポジトリ向けにしたもの。「AGENTS.md に追記して」「skill を作って」「hook を足して」「エージェントが指示を守らない」で使う。
---

# エージェント向け指示（harness）の置き場所と書き方

出典は Harness²（Google Research, arXiv:2610.14224）の `harness2/core/prompts.py`（`_SURFACE_CODEX`）と `harness2/core/tree.py`（`validate`）。下の「検査で落ちること」は `npm run check:harness` が確かめ、CI と PostToolUse hook（`agent-harness-check`）でも走る。

## 部品ごとのコスト

| 置き場所 | 中身 | いつ文脈に載るか |
|---|---|---|
| `AGENTS.md`（`CLAUDE.md` は `@AGENTS.md` の 1 行だけ） | 全作業に効く短い規則と、このリポジトリで確かめた事実 | 常時。毎ターン丸ごと注入され、エージェントの出力トークンと取り合う |
| `.claude/skills/<name>/SKILL.md`（`.agents/skills/<name>` はその symlink） | きっかけのはっきりした手順 | name と description だけ常時、本文は読んだときだけ |
| `scripts/*.mjs`、`.claude/skills/<name>/scripts/*` | 決まった処理 | 実行したときだけ |
| `.claude/agents/<name>.md`（subagent） | 入力が大きく答えが小さい調べもの | 別の文脈で動き、テキストだけ返す |
| `.cli/hooks/<id>.mjs` | 機械的に守らせたいこと | 該当するツール呼び出しのたびに動き、読み飛ばせない |

## 知識を足す順番

1. **Skill** — きっかけ（文書や作業の種類、繰り返す状況）があるものは、まずこれ。
2. **スクリプト** — 毎回手でやって間違える、または遅い決まった処理。
3. **Subagent** — 入力が大きく答えが小さい、範囲の決まった調査。出力が入力と同じくらい大きいなら割に合わない。
4. **Hook** — 注意書きを書いても守られないこと。繰り返すエラーに直し方を添える、既知の誤操作を理由つきで止める、書き込みの直後に検証する。
5. **AGENTS.md** — 最後の手段。全作業に効く短い規則だけ。足したら同じだけ削る（上限 8,000 字）。

常駐の文章が増えるほど、考えているうちに出力トークンを使い切って何も出さずに終わる失敗が増える。注意書きを守らないエージェントには、文章を足すのではなく hook で止める。

## 検査で落ちること

- skill を作ったら、同じ変更で AGENTS.md にトリガー行を足す: ``- <場面>ときは `.agents/skills/<name>/SKILL.md` を読んで従う。``。名前の出てこない skill は開かれない。
- skill の本体は `.claude/skills/<name>/` に置き、`ln -s ../../.claude/skills/<name> .agents/skills/<name>` で Codex からも見えるようにする。
- frontmatter に `description:` が要る（無いと黙って読み込まれない）。`name:` を書くならディレクトリ名と同じにする。
- AGENTS.md や SKILL.md が `node` / `python3` で呼ぶスクリプトは、同じ変更で実在させる。skill 専用なら `.claude/skills/<name>/scripts/` に置く。AGENTS.md が指すファイルも実在させる。
- AGENTS.md は 8,000 字まで。空にも削除もしない。削って収める。
- hook 設定は `{"hooks": {"<Event>": [{"matcher": ..., "hooks": [{"type": "command", "command": ...}]}]}}` の形で、呼ぶモジュールが実在する。

## Hook の足し方

- 本体は `.cli/hooks/<id>.mjs`。`run(data)` を export し、`.cli/lib/hook-output.mjs` の `HookOutput` で返す。PostToolUse の `HookOutput.block(reason)` は理由をモデルに返し、PreToolUse の `HookOutput.deny(reason)` は呼び出しを止める。理由には直し方まで書く。
- 同じ id で 3 か所に登録する。どれが欠けても黙って動かない。
  - `.claude/config/hook-registry.local.json` — ここに無い id は `safeHookMainWithProfile` が無効扱いにする。brief2dev の再移植でも残る。
  - `.claude/settings.json` — `node "${CLAUDE_PROJECT_DIR}/.cli/hooks/<id>.mjs"`。
  - `.codex/hooks.json` — `.cli/_cli-dispatch.mjs <module> codex <Event> <id>`。Codex のファイル編集は `apply_patch` なので matcher に含める。このファイルは再移植で作り直されるが、上の overlay から再生成される。
- 編集されたファイルは `.cli/lib/edited-files.mjs` の `editedFiles(data)` で取る（Codex の `apply_patch` も扱える）。
- コマンドは速く、対話なしにする。重い処理はスクリプトに出して hook から呼ぶ。
- Antigravity の PostToolUse には対象ファイルが届かない。編集後の検査は CI（ESLint、`npm run check:harness`）でも拾えるようにする。

## 中身の書き方

- このリポジトリで確かめた事実（コマンド、パス、対応関係）は、手順ではなく事実そのものを書く。確かめていない推測は書かない。
- 手順は、このリポジトリのほかの作業にも通じる形で書く。「丁寧に」のような、行動の変わらない言葉は書かない。
- 成果物の形（ファイル名、列、見出し、順番）は依頼が決める。harness の側で変えない。
