# SitRight

[English](README.md) | [日本語](README.ja.md) | **한국어**

노트북 웹캠만으로 **일자목·스마트폰 목·거북목·굽은 등** 자세를 측정하고,
정면 카메라로는 볼 수 없는 '옆에서 본 자세'를 3D로 보여 주며, 나쁜 자세가 계속될 때만 알려 주는 웹앱입니다.
영상은 브라우저 밖으로 나가지 않습니다(MediaPipe를 브라우저 안에서 실행).

**바로 사용해 보기:** https://sitright.pages.dev

> 의료기기가 아니며 진단을 하지 않습니다.

![시작 화면](docs/screenshots/ko-welcome.webp)

| 모니터링(영어 표시) | 설정(영어 표시) |
| --- | --- |
| ![거북목 알림이 표시된 모니터링 화면](docs/screenshots/en-monitor.webp) | ![설정](docs/screenshots/en-settings.webp) |

화면 언어는 한국어·영어·일본어를 지원합니다(브라우저 언어에 따라 자동으로 선택되며, 설정에서 바꿀 수 있습니다).

## 사용 방법

1. **카메라 위치 확인** — 얼굴·양쪽 어깨·정면 방향, 세 가지가 모두 갖춰질 때까지 안내
2. **기준 자세 기록(3초)** — 좋은 자세를 유지하면 그 중앙값을 '나의 기준'으로 저장
3. **모니터링** — 기준에서 벗어난 정도를 cm·각도로 표시하고, 설정한 시간(기본 20초) 이상 자세가 무너지면 알림

## 판정 방식

정면 카메라의 한 프레임에서 다음 값을 구하고(`src/core/metrics.ts`), 본인의 기준 자세와 비교합니다(`src/core/assessment.ts`).

| 측정값 | 계산 방법 | 주로 나타내는 자세 |
| --- | --- | --- |
| 머리 앞쪽 돌출(cm) | 얼굴 너비/어깨 너비 비율의 변화와, 얼굴 변환 행렬에서 얻은 머리까지의 거리 D로 `D·(1 − r0/r)` | 일자목·거북목 |
| 고개 숙임(°) | 얼굴 메트릭 변환 행렬의 피치 | 스마트폰 목 |
| 등 처짐(%) | 어깨~귀 높이/어깨 너비의 감소(고개 숙임 보정) + 어깨 하강 | 굽은 등·거북목 |
| 좌우 기울기(°) | 어깨선의 각도 | 몸의 기울어짐 |

- 몸 전체가 앞뒤로 움직여도 비율은 변하지 않으므로 **화면에 가까이 다가가기만 해서는 오판정하지 않습니다**
- 양쪽 어깨가 보이지 않거나, 옆을 보고 있거나, 몸이 비스듬한 **신뢰할 수 없는 프레임은 판정에 쓰지 않습니다**
- 잠깐 몸을 숙이는 정도로는 울리지 않도록 누적(감쇠 포함)·히스테리시스·쿨다운으로 알림을 제어합니다(`src/core/alerts.ts`)
- 목 부담(kg)은 목의 전방 기울기 각도로 Hansraj (2014)의 값을 보간한 추정치입니다

## 개인정보와 보안

- 모든 처리는 브라우저 안에서 이뤄지며, 녹화나 업로드를 하지 않습니다. 설정·기준 자세·일별 통계는 `localStorage`에만 저장합니다.
- 프로덕션은 정적 빌드이며, 엄격한 Content Security Policy(`connect-src 'self'`, 인라인 스크립트는 해시로 허용, `frame-ancestors 'none'`)와 HSTS·`Permissions-Policy`·`Referrer-Policy: no-referrer`·COOP를 붙여 배포합니다(`scripts/postbuild.mjs`가 `out/_headers`를 생성).
  MediaPipe 1.x는 60초마다 Google로 사용 통계를 보내지만 CSP가 차단합니다. E2E 테스트에서도 오리진 밖으로 나가는 요청이 없는지 확인합니다.
- 페이지를 불러온 뒤에는 네트워크가 끊겨도 측정을 계속합니다(`tests/e2e/offline.spec.ts`).
- CI에서 CodeQL·gitleaks(시크릿 탐지)·dependency review·`npm audit`를 실행하고, Dependabot이 의존성과 SHA로 고정한 GitHub Actions를 업데이트합니다.
- API 키나 시크릿은 사용하지 않습니다.

취약점 신고는 [SECURITY.md](SECURITY.md)를 참고해 주세요.

## 구성

```
src/
  core/        판정 로직(순수 함수, 단위 테스트 대상)
  engine/      MediaPipe·카메라·알림·루프 제어(controller.ts가 전체를 관리)
  stores/      Zustand(설정·기준 자세·일별 통계를 localStorage에 저장)
  components/  화면(Welcome / Setup / Calibrate / Monitor)과 3D 씬
    PostureScene/  SDF 레이마칭으로 그린 인체·척추(X선 표시)·이상적인 자세 고스트
  i18n/        화면 문구(en, ja, ko)
```

## 개발

Node.js 22가 필요합니다.

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 단위 테스트(Vitest)
npm run lint && npm run type-check
npm run build        # out/에 정적 빌드(_headers 포함)
npm run preview      # out/을 Cloudflare Pages 환경으로 로컬 배포(http://localhost:3011)
```

- MediaPipe wasm은 `dev`·`build` 전에 `node_modules`에서 `public/mediapipe/wasm`으로 복사됩니다. 모델은 `public/mediapipe/models`에 있습니다.
- `/lab?f=6&p=10&s=20`에서 3D 씬만 따로 확인할 수 있습니다(개발 시에만)
- 녹화한 영상으로 전체 흐름을 확인하려면 `tests/e2e/fixtures/generate.sh`로 영상을 만들고,
  개발 서버에서 `/?source=/dev/posture.mp4`를 열면 카메라 대신 사용됩니다(개발 시에만)
- E2E: `tests/e2e/fixtures/generate.sh` 실행 후 `npm run test:e2e`(Playwright가 빌드하고 가짜 카메라를 단 Chromium을 실행합니다)
- 백그라운드 동작: `node tests/e2e/serve-out.mjs 3011`을 실행한 상태에서 `node tests/e2e/background-check.mjs [초]`.
  가짜 카메라로 기준 자세를 기록한 뒤 다른 탭을 앞으로 가져와, 숨겨진 동안의 측정량·알림 수·CPU 사용률을 출력합니다

## 배포

`main`을 Cloudflare Pages에 배포하고 있습니다.

```bash
npx wrangler login
npm run deploy       # 빌드 후 wrangler pages deploy out --project-name sitright --branch main
```

## 브라우저

Chrome / Edge / Safari / Firefox 최신 버전(WebGL2 필수). 데스크톱 알림은 브라우저 권한이 필요합니다.
탭이 뒤로 가면 Worker 타이머와 카메라 트랙에서 직접 프레임을 가져오는 방식(Chrome의 ImageCapture)으로 측정을 계속합니다.
가짜 카메라 + 새 헤드리스 Chromium에서, 숨겨진 180초 동안 180초 분량을 측정하고 알림도 도착하며 CPU 사용률이 표시 중일 때의 약 1/4이 되는 것을 확인했습니다
(실제 카메라로 장시간 동작, Safari·Firefox[ImageCapture 미지원]에서 숨겨졌을 때의 동작은 아직 검증하지 않았습니다).

브라우저 메뉴에서 '앱 설치'(PWA)를 하면 별도 창으로 계속 띄워 둘 수 있습니다.

## 라이선스

MIT([LICENSE](LICENSE)). 함께 배포하는 MediaPipe wasm과 모델은 Apache-2.0입니다([THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES)).
