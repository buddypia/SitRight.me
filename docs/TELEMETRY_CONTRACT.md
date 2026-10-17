# SitRight Telemetry & Privacy Engineering Contract

> **Target Audience:** Human Contributors & AI Coding Assistants (Codex, Claude Code, Antigravity, Gemini).  
> **Status:** Active Standard SSOT  
> **Last Updated:** 2026-10-12

---

## 1. Core Architecture Philosophy
SitRight is built upon the promise of **100% in-browser computer vision privacy**.  
To preserve user trust, satisfy global privacy regulations (Korea PIPA, Japan Telecommunications Business Act, EU GDPR, US CCPA), and maintain system stability, all telemetry work must strictly adhere to this contract.

```
┌────────────────────────────────┐
│  Browser (Client)              │
│  - MediaPipe (Local WASM)      │ ──> Camera frames & 3D landmarks (100% ephemeral in RAM)
│  - localStorage (Local State)  │ ──> Calibration baseline & stats (Device only)
│  - sendTelemetry() (Engine)    │ ──> Same-Origin POST /api/telemetry (Non-blocking beacon)
└────────────────────────────────┘
                │
                ▼ (Same-Origin Only: connect-src 'self')
┌────────────────────────────────┐
│  Cloudflare Pages Function     │
│  (/functions/api/telemetry.ts) │ ──> Drops IP immediately
│  - Workers Analytics Engine    │ ──> Aggregate event counters & durations
└────────────────────────────────┘
```

---

## 2. The Four Inviolable Rules (AI Guardrails)

### Rule 1: Strict Zero Third-Party Trackers (CSP Integrity & Complete Telemetry Elimination)
- **Do NOT** install third-party analytics libraries (`@vercel/analytics`, `mixpanel-browser`, Google Analytics, Segment, etc.).
- **Do NOT** add external domains to `connect-src` or `script-src` in `scripts/postbuild.mjs`.
- All telemetry MUST be first-party (`/api/telemetry`).
- Any embedded third-party telemetry (e.g. MediaPipe Google ODML logging to `odml.pa.googleapis.com`) MUST be completely eliminated:
  1. **Build-Time Neutralization (`scripts/disable-third-party-telemetry.mjs`)**: MediaPipe distribution bundles are patched so the 60s `setInterval` flush timer is removed, log entries are never buffered, and the endpoint URL is stripped.
  2. **Runtime Blocker Guard (`src/engine/telemetry.ts:installThirdPartyTelemetryBlocker`)**: Any non-first-party telemetry network attempts via `fetch` or `sendBeacon` are intercepted and fail exactly like a CSP block (`fetch` rejects with `TypeError`, `sendBeacon` returns `false`), so nothing is ever reported as delivered.


### Rule 2: Strict Zero Biometric & Posture Score Exfiltration
- **Do NOT** transmit video frames, screenshots, image blobs, canvas pixels, or raw skeletal/facial landmark coordinates.
- **Do NOT** transmit personal posture evaluation scores or alert histories (e.g. good-posture percentages, slouch alert counts, or posture timelines). Those belong strictly in local device storage (`localStorage`).
- **Do NOT** generate or transmit unique biometric templates or covert hardware/device fingerprints.
- Telemetry payloads are strictly limited to discrete enum events, operational diagnostics (setup step, session/load duration, error code, UI locale), and resettable random anonymous identifiers (`clientId` / `sessionId`):
  ```ts
  interface AllowedTelemetryPayload {
    event: 'session_start' | 'step_transition' | 'session_end' | 'camera_permission' | 'model_loaded' | 'error';
    step?: string;          // e.g. 'welcome' | 'setup' | 'calibrate' | 'monitor'
    durationSec?: number;   // e.g. 180
    errorCode?: string;     // e.g. 'camera_denied' | 'model_timeout'
    locale?: string;        // e.g. 'en' | 'ja' | 'ko'
    clientId?: string;      // Resettable random UUID v4 in localStorage ('sitright.cid')
    sessionId?: string;     // Ephemeral in-memory random UUID v4 per visit
    ts?: number;
  }
  ```

### Rule 3: Offline-Safe & Silent Fail-Open
- SitRight must function 100% offline (`tests/e2e/offline.spec.ts`).
- Telemetry calls MUST never throw unhandled promise rejections or block UI threads.
- Always use `src/engine/telemetry.ts`'s `sendTelemetry()`. It checks `navigator.onLine`, prefers `navigator.sendBeacon`, and silently catches network failures.

### Rule 4: Mandatory Respect for User Opt-Out & Reset
- All telemetry events MUST check `useAppStore.getState().settings.telemetry`.
- When `settings.telemetry === false` or `resetAll()` is called, zero network packets may be sent and `sitright.cid` MUST be cleared immediately.

---

## 3. Regulatory Compliance SSOT

| Jurisdiction | Law / Regulation | Contractual Requirement |
| :--- | :--- | :--- |
| **🇰🇷 South Korea** | PIPA (개인정보 보호법) & 생체정보 보호 가이드라인 | Camera & facial pose estimation must be on-device without individual identification. Telemetry must be non-identifiable. |
| **🇯🇵 Japan** | 改正電気通信事業法（外部送信規律） / APPI | Must disclose (1) Information sent, (2) Destination (`SitRight/Cloudflare`), (3) Purpose in `PRIVACY.md` and in-app modal. |
| **🇪🇺 EU / UK** | GDPR (Recital 26) & ePrivacy Directive | No cross-site tracking; zero persistent PII; local storage used solely for strictly necessary service features; opt-out provided. |
| **🇺🇸 US / CA** | CCPA / CPRA & FTC Biometric Standards | Zero sale/sharing of consumer personal or biometric information; no facial recognition. |

---

## 4. Anti-Overengineering Rule
Do not build complex event queues, local SQLite persistence for telemetry, retry managers, or full-blown tracking systems. Keep `src/engine/telemetry.ts` and `functions/api/telemetry.ts` under 50 lines each.
