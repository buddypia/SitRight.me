# SitSmart

ノートPCのWebカメラだけで **ストレートネック・スマホ首・首猫背・猫背** の姿勢を計測し、
正面カメラでは見えない「横から見た姿勢」を3Dで可視化して、悪い姿勢が続いたときだけ通知するWebアプリです。
映像はブラウザの外に出ません（MediaPipe をブラウザ内で実行）。

> 医療機器ではなく、診断を行うものではありません。

## 使い方

1. **カメラ位置の確認** — 顔・両肩・正面向きの3項目がそろうまでガイド
2. **基準姿勢の記録（3秒）** — 良い姿勢を保ってもらい、その中央値を「あなたの基準」にする
3. **モニタリング** — 基準からのずれを cm・角度で表示。崩れが設定秒数（既定20秒）続いたら通知

## 判定の仕組み

正面カメラの1フレームから次の量を取り出し（`src/core/metrics.ts`）、本人の基準姿勢と比較します（`src/core/assessment.ts`）。

| 計測値 | 求め方 | 主に表す姿勢 |
| --- | --- | --- |
| 頭の前方突出（cm） | 顔幅/肩幅の比の変化と、顔の変換行列から得た頭までの距離 D から `D·(1 − r0/r)` | ストレートネック・首猫背 |
| うつむき（°） | 顔のメトリック変換行列のピッチ | スマホ首 |
| 背中の沈み込み（%） | 肩〜耳の高さ/肩幅の縮み（うつむき分を補正）＋肩の下降 | 猫背・首猫背 |
| 左右の傾き（°） | 肩のラインの角度 | 体の傾き |

- 体ごと前後に動いても比は変わらないため、**画面に近づいただけでは誤判定しません**
- 両肩が映っていない・横を向いている・体が斜め、などの**信頼できないフレームは判定に使いません**
- 一瞬の前かがみでは鳴らないよう、蓄積（減衰つき）・ヒステリシス・クールダウンで通知を制御（`src/core/alerts.ts`）
- 首への負担（kg）は首の前傾角から Hansraj (2014) の値を補間した目安です

## 構成

```
src/
  core/        判定ロジック（純粋関数・単体テスト対象）
  engine/      MediaPipe・カメラ・通知・ループ制御（controller.ts が全体を統括）
  stores/      Zustand（設定・基準姿勢・日次統計は localStorage に保存）
  components/  画面（Welcome / Setup / Calibrate / Monitor）と 3D シーン
    PostureScene/  SDF レイマーチングによる人体・背骨（X線表示）・理想姿勢ゴースト
  i18n/        日本語・英語・韓国語の文言（ja, en, ko）
```

## 開発

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 単体テスト（Vitest）
npm run lint && npm run type-check
```

- `public/mediapipe/` に MediaPipe の wasm とモデル（pose_landmarker_full / face_landmarker）が必要です
- `/lab?f=6&p=10&s=20` で 3D シーンを単体確認できます（開発時のみ）
- 録画した映像で通し確認する場合は `tests/e2e/fixtures/generate.sh` で動画を作り、
  開発サーバーで `/?source=/dev/posture.mp4` を開くとカメラの代わりに使われます（開発時のみ）
- E2E: `tests/e2e/fixtures/generate.sh` の後に `npm run test:e2e`（Playwright が偽カメラ付きの Chromium を起動します）
- バックグラウンド動作: `npx next start -p 3011` を起動した状態で `node tests/e2e/background-check.mjs [秒数]`。
  偽カメラで基準姿勢を記録したあと、別タブを前面に出して非表示中の計測量・通知数・CPU 使用率を出力します
  （Playwright のページは常に表示状態に固定されるため、非表示部分は生の CDP で操作しています）

## ブラウザ

Chrome / Edge / Safari / Firefox の最新版（WebGL2 必須）。デスクトップ通知はブラウザの許可が必要です。
タブを裏に回したときは Worker タイマーとカメラトラックからの直接取得（Chrome の ImageCapture）で計測を続けます。
偽カメラ＋新ヘッドレス Chromium では、非表示の 180 秒間で 180 秒分を計測し通知も届くこと、CPU 使用率が表示中の約 1/4 になることを確認済みです
（実カメラでの長時間動作と、Safari・Firefox〔ImageCapture 非対応〕での非表示時の動作は未検証）。

ブラウザのメニューから「アプリとしてインストール」すると（PWA）、独立したウィンドウで常駐できます。

## ライセンス

MIT（[LICENSE](LICENSE)）。同梱している MediaPipe の wasm とモデルは Apache-2.0 です（[THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES)）。
