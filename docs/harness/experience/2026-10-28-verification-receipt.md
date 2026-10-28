# 検証の省略を成功キャッシュにせず、段階ごとの実行証拠を残す

- 領域: verification
- 日付: 2026-10-28
- 出典: ai-harness 順次適用セッション、ローカル資料 `0xwhrrari_post/post.md`、`tests/unit/verify-gate.test.ts`

## 部品ごとの変更と観察

| 部品 | 変更 | 観察 | 判定 |
|---|---|---|---|
| `scripts/verify-gate.mjs` のキャッシュ | diff による省略を pass として記録しない。失敗で以前の pass を無効化する | 文書変更で省略した後に同じ入力でコード検査が必要になる fixture は旧実装で ESLint を呼ばず失敗、修正後は呼び出す。強制検査が失敗した後の同じ入力の再検査も実行する | 効いた |
| `scripts/verify-gate.mjs` の検証と receipt | type-check・harness を既存 gate に接続し、stage・mode・status・入力 hash・時刻・HEAD/base を記録。失敗時は成功 marker を除く | 旧 gate は 3 段階のみ。新 gate の実行では lint・type-check・harness・228 unit tests（独立レビュー修正前） が通過、build は影響なしとして skipped。失敗 fixture は前の成功 marker を除き、失敗 stage を保存した | 効いた |
| `agent-harness` skill | receipt を読んで full/cached/skipped を区別する手順を追加 | このセッションでは主ループが receipt を読むが、別セッションでの挙動は未検証 | 切り分け不能 |

| `scripts/verify-gate.mjs` の共有 verdict 更新 | lock を取得した内側で読み直してマージし、取得不能なら書かない | live owner の lock がある fixture は変更前に書き込みを止めず RED、変更後は timeout error と元内容保持を確認。解放後は両 stage の verdict を保持 | 効いた |
| harness 検査の入力範囲 | 全 repository 入力の fingerprint を使い、通常文書の変更も harness 検査の対象にする | 独立 reviewer が参照先文書の削除で cached/pass になる反例を確認。実際の validateHarness を呼ぶ回帰テストが RED、修正後 GREEN | 効いた |
| `pre-quality-gate` skill | この repository の実在するコマンドを優先する節を追加 | `make -n q.fix` は No rule to make target。本文修正後の別セッションでの挙動は未検証 | 切り分け不能 |

## 持ち越す教訓

- **きっかけ**: 差分で検査を省略する gate が、同じ場所に成功キャッシュも保存する
- **教訓**: `runVerifyGate` では未実行をキャッシュへ昇格させず、失敗時の過去の成功を無効化する。成功→強制失敗→通常再実行と、diff省略→必要な検査への遷移を実際に走らせ、receipt と実行 command を確かめる
- **根拠**: `verify-gate.test.ts` の省略後再実行・失敗後再実行 fixture が修正前 RED、修正後 GREEN。全文字の規則追加による効果はまだ分からない
- **確度**: 中 — 実際の gate と制御入力で再現した。別セッションでの文章遵守、CI での実行は未検証
