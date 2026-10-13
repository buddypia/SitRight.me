# Privacy & Data Policy (개인정보 처리 및 데이터 정책 / プライバシーと外部送信に関する方針)

[English](#english) | [日本語](#日本語) | [한국어](#한국어)

---

## English

### 1. Zero Video Transmission & No Facial Recognition
- **On-Device Processing:** All webcam video streams and pose estimation (using MediaPipe) run **100% locally within your browser**.
- **No Video Recording or Uploading:** Video feeds, captured frames, and raw skeletal landmarks are never recorded, saved, or uploaded to any server.
- **No Biometrics:** SitRight does not perform facial recognition, does not create biometric templates, and does not identify individuals.

### 2. Local Storage (`localStorage`)
- Your calibrated posture baseline, custom preferences, and daily stats are stored strictly inside your browser's `localStorage` to deliver core functionality.
- This data remains on your physical device and can be wiped instantly at any time via Settings (`Delete all history and baseline`).

### 3. Diagnostics & Telemetry (External Transmission Notice)
To maintain service reliability, monitor technical errors, and optimize onboarding retention, SitRight may transmit minimal, privacy-preserving first-party telemetry:
- **Information Sent:** Session duration, onboarding step completion, performance benchmarks (e.g., model load latency, frame processing rate), and non-identifiable error codes. IP addresses are dropped or anonymized at the edge immediately upon receipt.
- **Destination:** First-party infrastructure operated by SitRight on Cloudflare (Cloudflare Pages / Workers). No third-party tracking or advertising networks are used.
- **Purpose:** Error diagnostics, service reliability monitoring, and product improvement.

### 4. User Choice & Controls (GDPR / CCPA)
- You can opt out of sending anonymous telemetry at any time in **Settings → Data & Privacy → Send anonymous diagnostics**.
- SitRight does not sell, rent, or share personal or biometric information with third parties.

### 5. Contact
For questions, feedback, or data privacy inquiries, please contact us at **contact@buddypia.com**.

---

## 日本語

### 1. 映像のローカル処理と生体情報非取得の方針
- **オンデバイス処理:** ウェブカメラの映像取得および骨格・姿勢推定（MediaPipe）は、**すべて利用者のブラウザ内（ローカル）で完結**して実行されます。
- **録画・送信の禁止:** カメラ映像、キャプチャ画像、骨格ランドマークの生座標が外部サーバーへ送信されたり、録画・保存されることはありません。
- **生体認証非該当:** 本サービスは顔認識による個人特定や生体テンプレートの作成を行いません。

### 2. 端末内保存（`localStorage`）について
- 基準姿勢、個人設定、日々の統計データは、本サービスの基本機能を提供するために端末内の `localStorage` にのみ保存されます。
- 設定画面の「記録と基準をすべて削除」からいつでもワンクリックで全データを完全消去できます。

### 3. 電気通信事業法に基づく外部送信規律に関する表示
サービス品質の向上および障害分析を目的として、以下の通り利用者の端末から外部（自社インフラ）へ情報を送信する場合があります。
- **送信される利用者に関する情報:** セッション継続時間、オンボーディング完了状況、ブラウザおよび性能指標（モデル読込時間等）、エラーコード。（※IPアドレスは受信時に即座に破棄・匿名化され、カメラ映像や骨格座標は一切含まれません）
- **情報の送信先:** SitRight 自社インフラ（Cloudflare Pages / Workers）。第三者の広告配信事業者やトラッカーへの送信はありません。
- **利用目的:** 不具合の早期検知・修正、サービスの安定運用およびオンボーディング体験の改善。

### 4. 利用者の選択とコントロール
- 設定画面（「データとプライバシー」）から、いつでも「匿名診断データの送信」をオフ（オプトアウト）に設定できます。

### 5. お問い合わせ窓口
本ポリシーまたはプライバシーに関するご質問・ご要望は、**contact@buddypia.com** までお問い合わせください。

---

## 한국어

### 1. 카메라 영상의 100% 로컬 처리 및 안면 인식 비수집 원칙
- **온디바이스 실시간 연산:** 웹캠을 통한 영상 획득 및 3D 자세 추정(MediaPipe)은 **전적으로 이용자의 웹 브라우저 내부에서만 실시간으로 처리**됩니다.
- **영상 저장 및 전송 원천 차단:** 카메라 영상 원본, 캡처된 이미지 및 얼굴·골격 랜드마크 원시 좌표는 절대로 외부 서버로 전송되거나 저장·녹화되지 않습니다.
- **생체정보 미수집:** SitRight는 안면 인식을 통한 특정 개인 식별이나 생체 인식 템플릿 생성을 일체 수행하지 않습니다.

### 2. 로컬 저장소(`localStorage`) 안내
- 이용자의 기준 자세(캘리브레이션 값), 개인 환경설정 및 일별 통계는 서비스의 정상적인 동작을 위해 이용자 기기의 `localStorage`에만 보관됩니다.
- 이용자는 설정 메뉴의 "기록과 기준 모두 삭제"를 통해 언제든지 모든 데이터를 즉시 영구 삭제할 수 있습니다.

### 3. 서비스 진단 및 텔레메트리 (외부 전송 안내)
서비스 안정성 확보, 오류 해결 및 온보딩 이탈률 개선을 위해 최소한의 비식별 통계 정보가 자사 서버로 전송될 수 있습니다.
- **수집·전송 항목:** 세션 지속 시간, 셋업 단계 전환 여부, 브라우저 성능 지표(모델 로딩 속도 등), 비식별 에러 코드. (※ IP 주소는 수신 즉시 파기·익명화되며, 개인을 식별할 수 있는 정보는 일체 수집하지 않습니다)
- **수집·전송처:** SitRight 자체 인프라 (Cloudflare Pages / Workers). 제3자 광고·추적 네트워크에는 일체 제공되지 않습니다.
- **이용 목적:** 서비스 장애 모니터링, 알고리즘 및 온보딩 개선, 웹앱 호환성 진단.

### 4. 이용자의 권리 및 데이터 제어 (옵트아웃)
- 이용자는 설정 화면의 **데이터 및 개인정보 → "익명 진단 데이터 전송"** 스위치를 통해 언제든지 텔레메트리 수집을 거부(옵트아웃)할 수 있습니다.
- SitRight는 개인정보 보호법, GDPR, CCPA 등 관련 법령을 엄격히 준수하며 이용자의 개인정보를 판매·공유하지 않습니다.

### 5. 문의처
본 개인정보 처리방침 또는 데이터 처리에 관한 문의 및 의견은 **contact@buddypia.com** 으로 연락해 주시기 바랍니다.
