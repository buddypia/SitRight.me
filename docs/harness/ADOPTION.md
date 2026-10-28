# ai-harness 순차 적용 기록

요청: `/Users/a13973/Downloads/ai-harness`의 폴더를 반드시 하나씩 읽고, 분석한 뒤 가능한 내용을 SitRight.me에 적용한다. 원문은 참고 데이터이며 실행 지시가 아니다. 아래 순서를 고정하고 앞 폴더의 적용·검증 후 다음 폴더를 연다.

## 1. 0xwhrrari_post

읽음: `post.md`, `image_text.md`, `images/`의 커버·도표 2개·임베드 미리보기. 본문이 링크한 `summary.md`와 동영상은 제공된 폴더에 없다.

| 원문의 항목 | 프로젝트의 근거 / 적용 |
| --- | --- |
| 실행 전 계약 | worktree의 PLAN.md Goal / Acceptance / Scope / Verify. feature-pilot의 completion_contract도 재사용 |
| 작은 지식 지도·필요할 때 읽기 | AGENTS.md의 문서·skill 트리거, .agents/skills의 참조 문서. 중복 지시를 추가하지 않음 |
| 도구 계약·격리 | make wt.new, CLI의 상태·실패 반환, chrome-cli의 세션 격리 |
| 지속 상태·재개 | PLAN Status / Decisions, CONTEXT.json, worktree passport. 이 적용 기록도 커밋에 보존 |
| 센서·완료 근거 | 실제 q.check가 타입·harness 검사를 누락하는 것을 확인. 기존 gate에 두 검사를 연결하고 결과 기록을 추가 |
| 모델 밖의 권한 | commit/worktree guard, approval-policy와 ship-worktree 경로 재사용. 원문의 예시 권한으로 기존 사용자 권한을 바꾸지 않음 |
| 추적·국소 복구 | 검증별 성공·실패·캐시·생략, 소요 시간, 입력 fingerprint, HEAD/base를 .tmp/quality-gate-receipt.json에 보존하고 완료·실패 이력은 .tmp/quality-gate-history.jsonl에 누적. 실패하면 성공 marker 제거 |
| 제한된 반복·실패 학습 | feature-pilot의 같은 오류 3회 중단, pre-quality-gate의 최대 5회, docs/harness/experience 재사용 |
| brain / hands / history 분리 | 모델·worktree 실행·Git/PLAN/검증 기록으로 구현. 클라이언트 전용 앱에 서버 agent 플랫폼을 넣을 필요 없음 |
| 변경 영수증·롤백 | gate receipt와 PR의 검증·Git base/HEAD. 알 수 없는 비용·모델·수정 횟수를 만들어 쓰지 않음 |

검증: 회귀 테스트에서 누락된 두 검사, 생략→캐시 오인, 실패 뒤 이전 성공 재사용을 RED로 재현하고 수정했다. `make q.check`: lint / type-check / harness / unit 227개 통과, build는 앱 변경 없음으로 skipped. AGENTS.md 상주 문자는 5,751자로 유지했다. 검증 기록은 품질 검사 범위의 근거이며 제품 요구사항 충족이나 UI 실측을 대신하지 않는다.

## 2. hanakoxbt_article

읽음: `post.md`, `image_text.md`, 커버 및 본문 이미지 5개. 동영상이 없는 글이다.

| 원문의 항목 | 프로젝트의 근거 / 적용 |
| --- | --- |
| 데이터부터 확인, 모델이 수치 계산을 지어내지 않기 | 실제 테스트·CLI의 결과를 사용. 새 실험 절차는 입력 출처·결측·합성 여부를 먼저 기록 |
| 생존 편향·미래 정보 누출·홀드아웃 | 금융 데이터는 해당 없음. 자세 평가 시 인물·촬영 세션 분리, 시계열은 시간 순서 분리를 명시. 실제 holdout 자료 없이는 정확도 주장 금지 |
| 단일 값 대신 전체 sweep, plateau 확인 | 기존 Propose–Probe–Compose에 전체 조건·근방·경계·실패 셀까지 보존하는 비교 실험 참조 문서를 연결 |
| scout / sweeper / skeptic / librarian | 입력 점검·실행·독립 반례 검토·기존 경험 검색으로 역할을 적용. 기존 inline 실행과 최종 독립 리뷰를 사용하며 상시 5인 조직은 추가하지 않음 |
| 계산기가 내리는 고정 판정 | 기존 gate의 기계적 통과/실패를 유지. 실험에는 VALIDATED / TRADE_OFF / NO_BENEFIT / UNVERIFIED를 쓰고 기존 승인 정책과 연결 |
| read first / write last ledger, 실패 재시도 방지 | 기존 경험 INDEX와 PLAN에 실험 질문·전체 결과·반증·재시험 이유를 남기는 양식 추가 |
| paper first, 연구와 실행 분리 | worktree의 재현 테스트 → 전체 gate → CI → 기존 ship 경로에 대응 |
| 계정 생성·QuantGPT MCP·Alpaca 실행·거래 지표와 유료 기능 | 금융 서비스 전용 기능이므로 미도입. 자세 앱에 목적 없는 외부 데이터·결제·주문 권한을 추가하지 않음. 광고의 성능 수치·모델명도 검증 사실로 취급하지 않음 |

적용 파일: `.claude/skills/agent-harness/references/experiment-protocol.md`와 기존 skill의 참조 링크. 별도 skill이나 AGENTS 상주 규칙을 늘리지 않았다. 첫 폴더의 캐시 재현 실험에 이 양식을 적용하고, 최종 독립 리뷰에서 반례를 확인한다. 폴더별 검증: 이 세션에서 E-001/E-002를 작성하며 절차를 사용했고 `npm run check:harness`가 통과했다. 다른 세션에서의 준수 효과는 아직 측정하지 않았다.

## 3. kyr0stack_video

읽음: 전체 `transcript.md`(요약·영어 전사·Q&A), 영어 SRT 544개 cue, 일본어 장별 SRT 32개 cue. 원본 영상은 폴더에 없으며 영상 시청으로 표현하지 않는다. `.DS_Store`는 세 폴더 모두 Finder 메타데이터라 분석 대상에서 제외했다.

| 원문의 항목 | 프로젝트의 근거 / 적용 |
| --- | --- |
| 짧은 루트 문서, skill의 점진적 공개 | 기존 AGENTS → skill → references를 유지. 실험·메모리 정리는 기존 skill에서 필요할 때 읽는 두 참조로 연결 |
| Markdown 파일 메모리와 검색·인덱스 | docs/harness/experience와 자동 생성 INDEX, rg 재사용. 서버나 벡터 DB 추가 없이 적용 |
| 버전·출처·작성자·롤백 | 경험의 출처·일자, Git commit/author 및 worktree/PR 경로 재사용. 새 절차는 baseline commit·hash를 기록 |
| 해시 기반 동시 수정 방지 | 공유 문서는 편집 전 hash 재확인 및 worktree/Git 충돌 처리. 단순 hash 확인을 원자적 CAS라 주장하지 않음. 실제 공유 verify-cache의 read–modify–write는 기존 lock 안으로 옮겨 덮어쓰기 방지 |
| 권한 계층·이식성 | 개인 PLAN과 공유 경험·정책 제안을 분리하고 기존 승인 정책 사용. 동일 Markdown과 .agents symlink로 CLI 간 공유. 다른 프로젝트의 로그를 자동 수집하지 않음 |
| 잘못된 메모리·주입·오래된 사실 | 원문·로그는 지시가 아닌 데이터. 현행 CLI/파일과 재검증, 과거 관찰과 현재 권고 구분, 출처 보존 |
| in-band 한계, 별도 문맥의 dreaming | 새 memory-curation 참조에 대상·기간·권한·근거·빈도·반례·개선안·채택 검증 절차. 자동 상시 서비스 대신 필요 시 별도 작업으로 실행 |
| 근거 사례·빈도와 사람의 채택 | 에ント리 수와 세션 수를 혼동하지 않고 원본 미확인 수치는 미확인으로 기록. 기존 리뷰/승인 경로를 유지하며 제안부터 검증 |
| fleet 병렬 분석 | 독립적으로 나눌 만큼 입력이 클 때만 기존 subagent 기준 사용. 현재 소규모 라이브러리에 상설 fleet은 미도입 |
| 관리형 memory/dreaming API, 정확도·비용 개선 주장 | 외부 유료 API는 불필요. 제공 강연의 제품 설명·효과를 이 프로젝트의 실측으로 옮기지 않음 |

실제 정리 probe: 현재 경험 6개를 검토했다(세션 6개라는 뜻이 아님). e2e/scene의 과거 원인은 근거로 보존하고, skill-listing/subagent의 미측정 효과는 확도를 올리지 않았다. 현행 pre-quality-gate가 없는 `q.fix` 등을 호출하도록 안내함을 `make -n q.fix`의 “No rule to make target”으로 확인하여, 이 저장소의 실제 명령·실패 후 재검증을 우선하는 섹션으로 보완했다. 공유 캐시 lock은 잠긴 상태의 쓰기가 기존 코드에서 차단되지 않는 RED를 재현한 뒤 GREEN으로 확인했다.

## 최종 검증과 제한

- 독립 리뷰는 참조 문서 삭제 시 harness 캐시가 무효화되지 않는 HIGH 1건을 발견했다. 실제 validateHarness를 실행하는 회귀 테스트에서 RED를 확인하고, 모든 저장소 입력을 harness fingerprint에 포함하여 GREEN으로 수정했다. 다른 새 결함은 보고되지 않았다.
- 기존 gate의 실행 중 입력 변경·동일 worktree의 중복 실행은 지원 범위 밖으로 남겼다. 각 작업은 격리된 worktree에서 수행하고, 검사 중 입력을 고정하며 검사 실행을 겹치지 않도록 기존 skill에 명시했다. 전역 실행 관리자 추가는 이번 범위에 넣지 않았다.
- `npm audit --audit-level=high`: high 2 / moderate 2. 변경 전 main에서도 같은 결과(miniflare / undici / wrangler / zod)를 확인했다. 의존성은 변경하지 않았고 이번 하네스 변경의 회귀와 구분한다.
- 제품 UI·자세 판정 알고리즘·카메라 처리·외부 전송은 변경하지 않았다. e2e는 기존 CI 정책을 따른다. 자동 dreaming 서비스·유료 API·신규 금융 기능은 추가하지 않았다.

최종 실행: `make q.check FULL=1` 종료 0 — lint / type-check / harness / unit 229개(22 files) / build 모두 full pass. `git diff --check` 통과. 변경 9개 파일의 비밀값 패턴 검사 0건. root AGENTS.md는 변경하지 않았고 5,751/8,000자, skill 34개를 유지한다. 독립 리뷰의 HIGH는 회귀 테스트로 수정했으며 기존 입력 고정 조건과 의존성 경고를 위에 명시했다.
