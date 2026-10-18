# AI姿勢判定Webシステム アーキテクチャ設計

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
