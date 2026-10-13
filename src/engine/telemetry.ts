import { useAppStore } from '@/stores/appStore';

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
}

let activeSessionStart: number | null = null;

export function recordSessionStart(step = 'monitor'): void {
  activeSessionStart = Date.now();
  sendTelemetry({ event: 'session_start', step });
}

export function recordSessionEnd(step = 'monitor'): void {
  if (activeSessionStart !== null) {
    const durationSec = Math.max(0, Math.round((Date.now() - activeSessionStart) / 1000));
    activeSessionStart = null;
    sendTelemetry({ event: 'session_end', step, durationSec });
  }
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

/**
 * Checks if a destination URL represents non-first-party telemetry or an external tracker.
 * Only same-origin '/api/telemetry' is permitted as telemetry.
 */
export function isBlockedTelemetryUrl(url: string): boolean {
  if (!url) return false;
  // Explicitly block Google ODML (MediaPipe internal logger)
  if (url.includes('odml.pa.googleapis.com') || url.includes('googleapis.com/v1/log')) {
    return true;
  }
  // Block any non-first-party cross-origin telemetry/tracking/beacon calls
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      const isSameOrigin =
        typeof window !== 'undefined' && parsed.origin === window.location.origin;
      if (!isSameOrigin) {
        if (
          parsed.pathname.includes('/telemetry') ||
          parsed.pathname.includes('/log') ||
          parsed.pathname.includes('/analytics') ||
          parsed.pathname.includes('/collect') ||
          parsed.pathname.includes('/metrics')
        ) {
          return true;
        }
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
 * Silently drops any unauthorized external telemetry calls with 204 No Content or true,
 * preventing CSP errors, network requests, and promise rejections.
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
        return Promise.resolve(new Response(null, { status: 204 }));
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
        return true;
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
    const enabled = useAppStore.getState().settings?.telemetry ?? true;
    if (!enabled) return;

    const body = JSON.stringify({
      ...payload,
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

