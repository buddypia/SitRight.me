# AI姿勢判定Webシステム 設計ドキュメント

本ドキュメントは、ブラウザ上でリアルタイムに動作するAI姿勢判定システムの設計について定義します。デスクトップアプリケーションではなく、Webアプリケーションとしての特性を考慮したアーキテクチャとワークフローを採用します。

## 1. アーキテクチャ設計 (Architecture Design)

### 1.1. 設計思想

本システムは、**完全クライアントサイド処理**を基本方針とします。ユーザーのプライバシーを最大限に保護し（映像データは外部サーバーに送信しない）、サーバーコストを最小化し、リアルタイム性を確保することが目的です。

* **実行環境**: モダンブラウザ (Chrome, Firefox, Safari, Edge)
* **フレームワーク**: シングルページアプリケーション (SPA)
* **AI処理**: JavaScript/WebAssembly を利用してブラウザ内で完結

### 1.2. システム構成図 (Architecture Diagram)

```mermaid
graph TD
    subgraph User's Browser
        A[UI/UX<br>(React/Vue Component)]
        B{カメラ制御モジュール<br>(WebRTC API)}
        C{AI処理モジュール<br>(MediaPipe for Web)}
        D{姿勢判定ロジック<br>(TypeScript/JS)}

        A -- "カメラ起動" --> B
        B -- "映像ストリーム" --> A & C
        C -- "骨格データ" --> D
        D -- "判定結果" --> A
    end

    subgraph Hosting/Deployment (e.g., Vercel, Netlify)
        E[静的ファイル<br>(HTML, CSS, JS Bundle)]
    end

    F[ユーザー] -- "アクセス" --> E
    E -- "Webページ配信" --> User's Browser

    style F fill:#f9f,stroke:#333,stroke-width:2px
```

### 1.3. 技術スタック (Tech Stack)

| カテゴリ | 役割 | 主要技術・ライブラリ |
| :--- | :--- | :--- |
| **フロントエンド** | アプリケーションのUI/UX構築と全体制御 | **React (Next.js)**, **TypeScript** |
| **カメラ制御** | ブラウザでのカメラデバイスへのアクセス | **WebRTC API** (`navigator.mediaDevices.getUserMedia`) |
| **AI/骨格推定** | 映像からリアルタイムで骨格を推定 | **MediaPipe for Web** (Vision Task) / **TensorFlow.js** |
| **状態管理** | アプリケーション全体の状態管理 | **Zustand** (React) |

### 1.4. データフロー (Data Flow)

1.  **ページロード**: ユーザーがWebサイトにアクセスすると、ホスティングサーバーから静的ファイル（HTML, CSS, JS）がブラウザに読み込まれる。
2.  **カメラ許可**: UI上のボタン操作により、ユーザーにカメラへのアクセス許可を要求する。
3.  **映像ストリーミング**: ユーザーが許可すると、WebRTC APIを通じてカメラ映像が取得され、HTMLの`<video>`要素に表示される。
4.  **リアルタイム処理ループ**:
    * `requestAnimationFrame` を使用して、ディスプレイのリフレッシュレートに合わせたループ処理を開始する。
    * ループ内で、`<video>`要素の現在のフレームをキャプチャする。
    * キャプチャしたフレームを非同期でAI処理モジュール（MediaPipe）に渡し、骨格の3D座標（ランドマーク）を取得する。
5.  **姿勢判定**: 取得した骨格データから、主要な関節の角度や位置関係を計算し、「正しい姿勢」「猫背」などの状態を判定する。
6.  **UI更新**: 判定結果に基づき、UIをリアルタイムに更新する。
    * `<canvas>`要素に骨格を重ねて描画する。
    * 「背中が丸まっています」などのテキストフィードバックを表示する。
    * 姿勢スコアをグラフで表示する。

---

## 2. コーディング規則 (Coding Standards)

Webフロントエンド開発における品質と一貫性を保つための規則です。

### 2.1. 基本方針

* **言語**: **TypeScript 5.x** を採用し、静的型付けによる堅牢な開発を行う。
* **自動フォーマッタ/リンター**:
    * **Prettier**: コードフォーマットを自動で統一する。
    * **ESLint**: コーディングスタイルや潜在的なバグを静的解析で検出する。`Airbnb JavaScript Style Guide` をベースにカスタマイズする。

### 2.2. 命名規則

| 対象 | 規則 | 例 |
| :--- | :--- | :--- |
| 変数、関数 | キャメルケース (`camelCase`) | `videoElement`, `calculatePose()` |
| クラス、React/Vueコンポーネント | パスカルケース (`PascalCase`) | `PoseCanvas`, `SettingsPanel.tsx` |
| 型、インターフェース | パスカルケース (`PascalCase`) | `type PoseResult`, `interface ICameraProps` |
| CSSクラス（BEM記法を推奨） | `block__element--modifier` | `pose-viewer__canvas--warning` |

### 2.3. コンポーネント設計

* **関心の分離**: UI（見た目）とロジック（振る舞い）を分離する。ReactではPresentational ComponentとCustom Hooksに分離するなどの手法を用いる。
* **ファイル構成**: コンポーネントごとにフォルダを作成し、関連ファイル（`Component.tsx`, `Component.module.css`, `index.ts`）をまとめる。

```
/components
  /PoseViewer
    - PoseViewer.tsx
    - PoseViewer.module.css
    - index.ts
```

### 2.4. その他

* **非同期処理**: `Promise`ベースの処理には、可読性の高い `async/await` を第一選択とする。
* **環境変数**: APIキーなどの機密情報は `.env` ファイルで管理し、ビルドプロセスを通じて安全に組み込む。

---

## 3. 共通ワークフロー (Common Workflow)

チームでの効率的な開発・デプロイを実現するための手順です。

### 3.1. バージョン管理

* **システム**: Git
* **ホスティング**: GitHub
* **ブランチ戦略**: **GitHub Flow** を採用。`main`ブランチが常に本番環境を表す。

### 3.2. パッケージ管理

* **パッケージマネージャ**: **npm** または **pnpm** を使用。
* `package-lock.json` または `pnpm-lock.yaml` は必ずリポジトリにコミットし、全開発者の依存関係を一致させる。

### 3.3. 開発プロセス

1.  **Issue作成**: GitHub Issuesにタスクを起票。
2.  **ブランチ作成**: `main`から `feature/ISSUE#-description` 形式でブランチを作成。
3.  **ローカル開発**:
    * `npm install` で依存パッケージをインストール。
    * `npm run dev` でローカル開発サーバーを起動。
4.  **Pull Request (PR)**:
    * 開発完了後、`main`ブランチへのPRを作成。
    * Vercel/Netlifyと連携し、**PRごとにプレビュー環境が自動で生成される**ように設定する。レビュアーは実際の動作をこの環境で確認できる。
5.  **CIとコードレビュー**:
    * PRが作成されると、GitHub Actionsが自動で起動し、**Lint/Typeチェック、ユニットテスト**を実行する。
    * チームメンバーがコードとプレビュー環境を確認し、承認する。
6.  **マージとデプロイ**:
    * PRが承認されると、`main`ブランチにマージされる。
    * `main`ブランチへのマージをトリガーに、**本番環境への自動デプロイ**が実行される。