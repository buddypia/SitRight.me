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
