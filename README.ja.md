# SitRight

[English](README.md) | **日本語** | [한국어](README.ko.md)

ノートPCのWebカメラだけで **ストレートネック・スマホ首・首猫背・猫背** の姿勢を計測し、
正面カメラでは見えない「横から見た姿勢」を3Dで可視化して、悪い姿勢が続いたときだけ通知するWebアプリです。
映像はブラウザの外に出ません（MediaPipe をブラウザ内で実行）。

**すぐに試す:** https://sitright.pages.dev

> 医療機器ではなく、診断を行うものではありません。

![ようこそ画面](docs/screenshots/ja-welcome.webp)

| モニタリング（英語表示） | 設定（英語表示） |
| --- | --- |
| ![首猫背の通知が出ているモニタリング画面](docs/screenshots/en-monitor.webp) | ![設定](docs/screenshots/en-settings.webp) |

表示言語は日本語・英語・韓国語に対応しています（ブラウザの言語から自動で選び、設定で変更できます）。

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

## プライバシーとセキュリティ

- 処理はすべてブラウザ内で行い、録画もアップロードもしません。設定・基準姿勢・日々の統計は `localStorage` にだけ保存します。
- 本番は静的書き出しで、厳しい Content Security Policy（`connect-src 'self'`、インラインスクリプトはハッシュで許可、`frame-ancestors 'none'`）と HSTS・`Permissions-Policy`・`Referrer-Policy: no-referrer`・COOP を付けて配信します（`scripts/postbuild.mjs` が `out/_headers` を出力）。
  MediaPipe 1.x は60秒ごとに Google へ利用統計を送りますが、CSP で止まります。E2E テストでも、オリジンの外へ出る通信がないことを確認しています。
- ページを読み込んだあとは、ネットワークが切れても計測を続けます（`tests/e2e/offline.spec.ts`）。
- CI で CodeQL・gitleaks（シークレットの検出）・dependency review・`npm audit` を実行し、Dependabot が依存関係と SHA で固定した GitHub Actions を更新します。
- API キーやシークレットは使っていません。

脆弱性の報告は [SECURITY.md](SECURITY.md) を参照してください。

## 構成

```
src/
  core/        判定ロジック（純粋関数・単体テスト対象）
  engine/      MediaPipe・カメラ・通知・ループ制御（controller.ts が全体を統括）
  stores/      Zustand（設定・基準姿勢・日次統計は localStorage に保存）
  components/  画面（Welcome / Setup / Calibrate / Monitor）と 3D シーン
    PostureScene/  SDF レイマーチングによる人体・背骨（X線表示）・理想姿勢ゴースト
  i18n/        表示文言（en, ja, ko）
```

## 開発

Node.js 22 が必要です。

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 単体テスト（Vitest）
npm run lint && npm run type-check
npm run build        # out/ に静的書き出し（_headers つき）
npm run preview      # out/ を Cloudflare Pages の環境で配信（http://localhost:3011）
```

- MediaPipe の wasm は `dev`・`build` の前に `node_modules` から `public/mediapipe/wasm` へコピーされます。モデルは `public/mediapipe/models` にあります。
- `/lab?f=6&p=10&s=20` で 3D シーンを単体確認できます（開発時のみ）
- 録画した映像で通し確認する場合は `tests/e2e/fixtures/generate.sh` で動画を作り、
  開発サーバーで `/?source=/dev/posture.mp4` を開くとカメラの代わりに使われます（開発時のみ）
- E2E: `tests/e2e/fixtures/generate.sh` の後に `npm run test:e2e`（Playwright が build し、偽カメラ付きの Chromium を起動します）
- バックグラウンド動作: `node tests/e2e/serve-out.mjs 3011` を起動した状態で `node tests/e2e/background-check.mjs [秒数]`。
  偽カメラで基準姿勢を記録したあと、別タブを前面に出して非表示中の計測量・通知数・CPU 使用率を出力します

## デプロイ

`main` を Cloudflare Pages に公開しています。

```bash
npx wrangler login
npm run deploy       # build と wrangler pages deploy out --project-name sitright --branch main
```

## ブラウザ

Chrome / Edge / Safari / Firefox の最新版（WebGL2 必須）。デスクトップ通知はブラウザの許可が必要です。
タブを裏に回したときは Worker タイマーとカメラトラックからの直接取得（Chrome の ImageCapture）で計測を続けます。
偽カメラ＋新ヘッドレス Chromium では、非表示の 180 秒間で 180 秒分を計測し通知も届くこと、CPU 使用率が表示中の約 1/4 になることを確認済みです
（実カメラでの長時間動作と、Safari・Firefox〔ImageCapture 非対応〕での非表示時の動作は未検証）。

ブラウザのメニューから「アプリとしてインストール」すると（PWA）、独立したウィンドウで常駐できます。

## ライセンス

MIT（[LICENSE](LICENSE)）。同梱している MediaPipe の wasm とモデルは Apache-2.0 です（[THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES)）。
