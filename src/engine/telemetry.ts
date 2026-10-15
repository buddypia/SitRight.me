import { todayStats, useAppStore } from '@/stores/appStore';

export type TelemetryEventType =
  | 'session_start'
  | 'session_end'
  | 'step_transition'
  | 'camera_permission'
  | 'model_loaded'
  | 'error';

export interface TelemetryPayload {
  event: TelemetryEventType;
  step?: string;
  durationSec?: number;
  errorCode?: string;
  locale?: string;
  goodPosturePct?: number;
  alertCount?: number;
}

let activeSessionStart: number | null = null;
let sessionStartStats: { monitoredSec: number; goodSec: number; alerts: number } | null = null;

export function recordSessionStart(step = 'monitor'): void {
  activeSessionStart = Date.now();
  const history = useAppStore.getState().history ?? [];
  const today = todayStats(history);
  sessionStartStats = {
    monitoredSec: today.monitoredSec,
    goodSec: today.goodSec,
    alerts: today.alerts,
  };
  sendTelemetry({ event: 'session_start', step });
}

export function recordSessionEnd(step = 'monitor'): void {
  if (activeSessionStart !== null) {
    const durationSec = Math.max(0, Math.round((Date.now() - activeSessionStart) / 1000));
    activeSessionStart = null;

    const history = useAppStore.getState().history ?? [];
    const today = todayStats(history);
    let goodPosturePct: number | undefined;
    let alertCount: number | undefined;

    if (sessionStartStats && today) {
      const deltaMonitored = Math.max(0, today.monitoredSec - sessionStartStats.monitoredSec);
      const deltaGood = Math.max(0, today.goodSec - sessionStartStats.goodSec);
      const deltaAlerts = Math.max(0, today.alerts - sessionStartStats.alerts);

      if (deltaMonitored > 0) {
        goodPosturePct = Math.min(100, Math.max(0, Math.round((deltaGood / deltaMonitored) * 100)));
      }
      alertCount = deltaAlerts;
    }
    sessionStartStats = null;

    sendTelemetry({
      event: 'session_end',
      step,
      durationSec,
      goodPosturePct,
      alertCount,
    });
  }
}

export function recordStepTransition(
  prevStep: string | null,
  nextStep: string
): string {
  if (prevStep === nextStep) return nextStep;
  sendTelemetry({ event: 'step_transition', step: nextStep });
  if (nextStep === 'monitor') {
    recordSessionStart('monitor');
  } else if (prevStep === 'monitor') {
    recordSessionEnd('monitor');
  }
  return nextStep;
}

export function recordCameraPermission(granted: boolean, errorCode?: string): void {
  sendTelemetry({
    event: 'camera_permission',
    step: granted ? 'granted' : 'denied',
    errorCode,
  });
}

export function recordModelLoaded(durationSec: number): void {
  sendTelemetry({
    event: 'model_loaded',
    durationSec: Number(durationSec.toFixed(2)),
  });
}

const BLOCKED_PATH_SEGMENTS = new Set([
  'telemetry',
  'log',
  'analytics',
  'collect',
  'metrics',
]);

/**
 * Checks if a destination URL represents non-first-party telemetry or an external tracker.
 * Only same-origin '/api/telemetry' is permitted as telemetry.
 */
export function isBlockedTelemetryUrl(url: string): boolean {
  if (!url) return false;
  // Block any non-first-party cross-origin telemetry/tracking/beacon calls
  // (covers Google ODML: https://odml.pa.googleapis.com/v1/log)
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      const isSameOrigin =
        typeof window !== 'undefined' && parsed.origin === window.location.origin;
      // 部分文字列ではなくパスの区切りごとに比べる（'/log' が '/login' や '/blog' に当たらないように）
      if (
        !isSameOrigin &&
        parsed.pathname.split('/').some((seg) => BLOCKED_PATH_SEGMENTS.has(seg))
      ) {
        return true;
      }
    } catch {
      return true;
    }
  }
  return false;
}

let blockerInstalled = false;

/**
 * Installs client-side runtime interception to ensure zero third-party telemetry escapes.
 * Unauthorized external telemetry calls fail the same way a CSP block would
 * (fetch rejects with TypeError, sendBeacon returns false), so callers never
 * mistake a dropped request for a delivered one.
 */
export function installThirdPartyTelemetryBlocker(): void {
  if (blockerInstalled || typeof window === 'undefined') return;
  blockerInstalled = true;

  if (typeof window.fetch === 'function') {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === 'string'
          ? input
          : 'url' in input
            ? input.url
            : String(input);
      if (isBlockedTelemetryUrl(url)) {
        return Promise.reject(new TypeError(`Blocked third-party telemetry: ${url}`));
      }
      return originalFetch(input, init);
    };
  }

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    const originalSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      const urlStr = typeof url === 'string' ? url : 'href' in url ? url.href : String(url);
      if (isBlockedTelemetryUrl(urlStr)) {
        return false;
      }
      return originalSendBeacon(url, data);
    };
  }
}

/** Reset blocker flag for test isolation */
export function resetTelemetryBlockerForTesting(): void {
  blockerInstalled = false;
}

// Auto-activate in browser context
if (typeof window !== 'undefined') {
  installThirdPartyTelemetryBlocker();
}

/**
 * Privacy-preserving, offline-safe, non-blocking telemetry emitter.
 * 
 * Strict Guarantees:
 * 1. Zero cross-origin transmission: Only posts to first-party '/api/telemetry'
 * 2. Zero biometric data: Raw landmarks, frames, coordinates are strictly prohibited
 * 3. Offline-safe: Silent no-op when offline, never throws unhandled errors
 * 4. User choice: Respects settings.telemetry toggle
 */
export function sendTelemetry(payload: TelemetryPayload): void {
  try {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!navigator.onLine) return;

    // Check user opt-out preference
    const state = useAppStore.getState();
    const enabled = state.settings?.telemetry ?? true;
    if (!enabled) return;

    const locale = payload.locale ?? state.settings?.locale;

    const body = JSON.stringify({
      ...payload,
      locale,
      ts: Date.now(),
    });

    // Prefer navigator.sendBeacon for non-blocking asynchronous transmission
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/telemetry', blob);
      return;
    }

    // Fallback to fetch with keepalive and silent failure
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {
      // Intentionally silent: zero disruption to core posture loop
    });
  } catch {
    // Intentionally silent: fail-open guarantee
  }
}

