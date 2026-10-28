# 全体検査が通っても、入力の同一性と検査対象の反例を試す

- 領域: verification
- 日付: 2026-10-28
- 出典: ユーザーの最終点検依頼、独立 reviewer /root/final_gate_audit、f299919、tests/unit/verify-gate.test.ts

## 部品ごとの変更と観察

| 部品 | 変更 | 観察 | 判定 |
|---|---|---|---|
| type-check の変更分類 | JS / JSX / MJS / CJS を含める | mjs の戻り値を string から number に変えたとき、旧 gate は skipped/pass、実際の tsc は TS2322。回帰テストは修正前 RED、修正後は gate がエラーを返す GREEN | 効いた |
| fingerprint のリンク入力 | readlink の対象文字列も hash に含める | .agents のディレクトリリンクを実在する空ディレクトリへ向けると旧 gate は cached/pass、validateHarness は不合格。修正後の回帰テストは gate が拒否 | 効いた |
| fingerprint のファイル入力 | size/mtime の永続メモを廃止し、現在の fd のバイトを毎回 hash にする | 同じ長さ・mtime の不正なソースへ復元すると旧 gate は全 stage cached/pass。修正後は Node の実際の構文検査が失敗し marker が残らない | 効いた |

## 持ち越す教訓

- **きっかけ**: 成功 cache の同一性をファイルの metadata や拡張子の一部だけで判断する gate を変える
- **教訓**: computeFilesFingerprint は link の向きと現在の内容を含め、runVerifyGate の検査対象分類を実際の依存入力と揃える。ディレクトリ link の向き変更、metadata を保った復元、TS が import する JS の型変更を実際の validator で再現する
- **根拠**: 上の 3 行の独立した制御入力。追加した 3 テストはすべて RED→GREEN、集中検査 11/11。初回の全体検査 229/229 にはこの反例が無かった
- **確度**: 中 — 決定的な欠陥を実際の tsc・validateHarness・Node 構文検査で再現。実セッションの再発防止や性能効果は未測定
