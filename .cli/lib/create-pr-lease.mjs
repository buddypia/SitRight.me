/**
 * create-pr-lease.mjs — `.tmp/create-pr-active` 판정 SSOT
 *
 * 배경 (실증된 결함, 2026-08-23): `/create-pr` 가 SIGKILL 로 죽어 남긴 플래그 파일 하나가
 * **3일간** main 직접 커밋 차단을 무력화하고 있었다. 실제 hook 에 페이로드를 주입해 확인:
 *   - 유물 플래그 존재 → `commit-guard` 가 `{}` (passthrough)
 *   - 같은 페이로드, 플래그 제거 → `deny`
 *
 * 근본 원인: 이 파일은 **시한부 권한(lease)** 인데 소비자 4곳이 3가지로 읽고 있었다.
 *   - `worktree-shipping-guard`: `isFresh(flag, CREATE_PR_ACTIVE_TTL_MS)` — TTL 준수
 *   - `destructive-git-guard`:   자체 `isFreshCreatePrFlag` + TTL 상수 **중복 정의** — TTL 준수
 *   - `commit-guard`:            `existsSync(flag)` — 영구 플래그로 오독
 *   - `worktree-session-owner-guard`: `existsSync(flag)` — 영구 플래그로 오독
 *
 * trunk-branch.mjs 와 같은 병이다(하나의 개념이 여러 hook 에 제각기 구현 → 일부만 작동 →
 * 사용자는 보호받고 있다고 믿는다). 같은 처방을 쓴다: 단일 진입점 + 전 호출부 전환 +
 * `tests/unit/create-pr-lease-ssot.test.mjs` 의 재발 차단 스캔.
 *
 * **왜 TTL 이 정답인가**: 종료 시 정리(trap/finally)는 SIGKILL 을 못 덮는다 — 이번 유출이
 * 정확히 그 경우였다. 임대는 프로세스 생사와 무관하게 스스로 만료하므로 정리 실패가
 * 영구 구멍이 되지 않는다.
 *
 * **왜 30분인가**: 새 숫자가 아니라 기존 두 구현이 이미 쓰던 값을 그대로 승격했다.
 * ship 1회(전체 게이트 약 10분)를 여유 있게 덮으면서, 유출 시 노출 창을 제한한다.
 *
 * R-CM-028 경계: boundary-uniform. 관점 2 는 `.cli/` 를 import 할 수 없어
 * `project-scaffolder/templates/scripts/lib/create-pr-lease.mjs` 에 독립 사본을 두고,
 * 동작 동등성은 위 테스트가 강제한다 (trunk-branch.mjs 와 동일한 관행).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** 임대 유효 기간. 기존 두 hook 구현이 각자 정의하던 값을 단일화한 것. */
export const CREATE_PR_ACTIVE_TTL_MS = 30 * 60 * 1000;

/** 임대 파일 경로. 경로 리터럴이 흩어지면 오타가 조용한 무동작이 된다. */
export function createPrLeasePath(projectDir) {
  return join(projectDir || '', '.tmp', 'create-pr-active');
}

/**
 * 임대 파일의 내용. 쓰는 쪽은 그 세션을 적는다(`CLAUDE_CODE_SESSION_ID`, 없으면 null). 시각은 적지 않는다 —
 * 만료는 파일의 mtime 으로 본다. 예전 형식(타임스탬프 숫자 하나)과 세션을 모르는 기록은 session null 이다.
 */
export function createPrLeaseContent({ session = process.env.CLAUDE_CODE_SESSION_ID || null } = {}) {
  return JSON.stringify({ session });
}

// 읽은 내용에서 세션을 꺼낸다. 형식이 맞지 않으면(예전 형식 · 빈 내용) null — 모든 세션에 적용된다.
function leaseHolder(raw) {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.session === 'string' && parsed.session ? parsed.session : null;
  } catch {
    return null;
  }
}

function heldByOther(raw, sessionId) {
  const holder = leaseHolder(raw);
  return Boolean(holder && sessionId && holder !== sessionId);
}

/**
 * 임대가 아직 유효한가. 부재·만료·stat 실패는 모두 false —
 * 판정 불능일 때 가드를 여는 쪽으로 기울지 않는다 (fail-safe: 의심스러우면 보호한다).
 *
 * 임대는 그것을 잡은 세션의 권한이다 (design-lookbook 2026-10-19 발견). 파일이 저장소에 하나뿐이라
 * 한 세션의 create-pr 가 잡은 임대가 30분 동안 **다른 모든 세션**의 commit·owner·shipping 가드와
 * git hook 을 풀고 있었다 — worktree 마다 AI 가 병렬로 일하는 저장소에서 그것은 다른 세션의 main
 * commit 과 남의 worktree 조작을 통과시킨다. 묻는 쪽이 자기 세션을 알고(`sessionId`) 임대도 세션을
 * 적었으면 둘이 같을 때만 유효하다. 어느 한쪽이 모르면 예전처럼 본다.
 */
export function isCreatePrLeaseActive(projectDir, { now = Date.now(), sessionId = null } = {}) {
  const path = createPrLeasePath(projectDir);
  try {
    if (!existsSync(path)) return false;
    if (now - statSync(path).mtimeMs > CREATE_PR_ACTIVE_TTL_MS) return false;
    // 읽지 못하면 throw → false. "세션 없음 = 전역" 으로 읽으면 판정 불능이 가드를 연다.
    return !heldByOther(readFileSync(path, 'utf-8'), sessionId);
  } catch {
    return false;
  }
}

/**
 * 임대가 묻는 세션이 아닌 다른 세션의 것인가 — 둘 다 알 때만 true. 신선도는 보지 않는다.
 * 읽지 못하면 false(소유자 없음). 신선도를 스스로 재는 Stop 알림(worktree-shipping-guard)용이라,
 * 차단하는 가드는 이것 대신 `isCreatePrLeaseActive` 를 쓴다.
 */
export function createPrLeaseHeldByOther(projectDir, sessionId) {
  try {
    return heldByOther(readFileSync(createPrLeasePath(projectDir), 'utf-8'), sessionId);
  } catch {
    return false;
  }
}
