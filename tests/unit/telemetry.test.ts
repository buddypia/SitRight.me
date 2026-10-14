import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installThirdPartyTelemetryBlocker,
  isBlockedTelemetryUrl,
  resetTelemetryBlockerForTesting,
  recordCameraPermission,
  recordModelLoaded,
  recordSessionEnd,
  recordSessionStart,
  recordStepTransition,
  sendTelemetry,
} from '@/engine/telemetry';
import { useAppStore } from '@/stores/appStore';

describe('telemetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetTelemetryBlockerForTesting();
    vi.stubGlobal('window', {
      location: { origin: 'http://localhost:3000' },
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    });
    useAppStore.setState({
      settings: {
        ...useAppStore.getState().settings,
        telemetry: true,
      },
    });
  });

  describe('isBlockedTelemetryUrl', () => {
    it('blocks Google ODML telemetry endpoints', () => {
      expect(isBlockedTelemetryUrl('https://odml.pa.googleapis.com/v1/log')).toBe(true);
      expect(isBlockedTelemetryUrl('https://other.googleapis.com/v1/log')).toBe(true);
    });

    it('blocks external third-party telemetry and tracking domains', () => {
      expect(isBlockedTelemetryUrl('https://analytics.example.com/log')).toBe(true);
      expect(isBlockedTelemetryUrl('https://tracker.org/telemetry')).toBe(true);
      expect(isBlockedTelemetryUrl('https://metrics.cloud.com/collect')).toBe(true);
    });

    it('allows same-origin first-party telemetry (/api/telemetry)', () => {
      expect(isBlockedTelemetryUrl('/api/telemetry')).toBe(false);
      expect(isBlockedTelemetryUrl('http://localhost:3000/api/telemetry')).toBe(false);
    });

    it('allows local static and wasm assets', () => {
      expect(isBlockedTelemetryUrl('/mediapipe/wasm/vision_wasm_internal.wasm')).toBe(false);
      expect(isBlockedTelemetryUrl('/models/avatar.glb')).toBe(false);
      expect(isBlockedTelemetryUrl('blob:http://localhost:3000/123-abc')).toBe(false);
    });

    it('matches whole path segments, not substrings', () => {
      expect(isBlockedTelemetryUrl('https://cdn.example.com/login')).toBe(false);
      expect(isBlockedTelemetryUrl('https://cdn.example.com/blog/logo.png')).toBe(false);
    });
  });

  describe('installThirdPartyTelemetryBlocker', () => {
    it('intercepts third-party fetch and rejects like a CSP block without calling original fetch', async () => {
      const originalFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('window', {
        location: { origin: 'http://localhost:3000' },
        fetch: originalFetch,
      });

      installThirdPartyTelemetryBlocker();

      await expect(
        window.fetch('https://odml.pa.googleapis.com/v1/log', { method: 'POST', body: '{}' })
      ).rejects.toThrow(TypeError);
      expect(originalFetch).not.toHaveBeenCalled();
    });

    it('passes first-party /api/telemetry fetch to original fetch', async () => {
      const originalFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('window', {
        location: { origin: 'http://localhost:3000' },
        fetch: originalFetch,
      });

      installThirdPartyTelemetryBlocker();

      await window.fetch('/api/telemetry', { method: 'POST', body: '{}' });
      expect(originalFetch).toHaveBeenCalledTimes(1);
    });

    it('intercepts third-party sendBeacon and returns false without dispatching', () => {
      const originalSendBeacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
      vi.stubGlobal('navigator', { sendBeacon: originalSendBeacon });

      installThirdPartyTelemetryBlocker();

      const result = navigator.sendBeacon('https://odml.pa.googleapis.com/v1/log', '{}');
      expect(result).toBe(false);
      expect(originalSendBeacon).not.toHaveBeenCalled();
    });
  });

  describe('sendTelemetry', () => {
    it('does not send when navigator is offline', () => {
      const sendBeacon = vi.fn();
      vi.stubGlobal('navigator', { onLine: false, sendBeacon });
      sendTelemetry({ event: 'session_start' });
      expect(sendBeacon).not.toHaveBeenCalled();
    });

    it('does not send when telemetry setting is disabled (opt-out)', () => {
      const sendBeacon = vi.fn();
      vi.stubGlobal('navigator', { onLine: true, sendBeacon });
      useAppStore.setState({
        settings: {
          ...useAppStore.getState().settings,
          telemetry: false,
        },
      });

      sendTelemetry({ event: 'session_start' });
      expect(sendBeacon).not.toHaveBeenCalled();
    });

    it('sends via sendBeacon when available and enabled', () => {
      const sendBeacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', { onLine: true, sendBeacon });

      sendTelemetry({ event: 'step_transition', step: 'calibrate' });
      expect(sendBeacon).toHaveBeenCalledTimes(1);
      expect(sendBeacon.mock.calls[0][0]).toBe('/api/telemetry');
    });

    it('silently recovers from unexpected network exceptions without throwing', () => {
      vi.stubGlobal('navigator', {
        onLine: true,
        sendBeacon: () => {
          throw new Error('Simulated network crash');
        },
      });

      expect(() => {
        sendTelemetry({ event: 'error', errorCode: 'test_error' });
      }).not.toThrow();
    });
  });

  it('records session start and end duration correctly', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { onLine: true, sendBeacon });

    const now = 1000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    recordSessionStart('monitor');
    expect(sendBeacon).toHaveBeenCalledTimes(1);

    // Advance 65 seconds
    vi.spyOn(Date, 'now').mockReturnValue(now + 65000);
    recordSessionEnd('monitor');

    expect(sendBeacon).toHaveBeenCalledTimes(2);
  });

  it('records camera permission and model loaded metrics', () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { onLine: true, sendBeacon });

    recordCameraPermission(true);
    expect(sendBeacon).toHaveBeenCalledTimes(1);

    recordCameraPermission(false, 'denied');
    expect(sendBeacon).toHaveBeenCalledTimes(2);

    recordModelLoaded(1.45);
    expect(sendBeacon).toHaveBeenCalledTimes(3);
  });

  it('records initial welcome step transition and full onboarding funnel without duplicate emissions', async () => {
    const payloads: Record<string, unknown>[] = [];
    const sendBeacon = vi.fn(async (_url: string, blob: Blob) => {
      payloads.push(JSON.parse(await blob.text()));
      return true;
    });
    vi.stubGlobal('navigator', { onLine: true, sendBeacon });

    const now = 2000000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    // Initial page load after hydration (prevStep = null -> 'welcome')
    let prev = recordStepTransition(null, 'welcome');
    expect(prev).toBe('welcome');

    // Duplicate re-render on 'welcome' must not re-send
    prev = recordStepTransition(prev, 'welcome');
    expect(prev).toBe('welcome');

    // Transition to setup -> calibrate -> monitor
    prev = recordStepTransition(prev, 'setup');
    prev = recordStepTransition(prev, 'calibrate');
    prev = recordStepTransition(prev, 'monitor');

    // Leave monitor after 30s
    vi.spyOn(Date, 'now').mockReturnValue(now + 30000);
    prev = recordStepTransition(prev, 'welcome');
    expect(prev).toBe('welcome');

    await vi.waitFor(() => expect(payloads).toHaveLength(7));
    expect(payloads.map((p) => ({ event: p.event, step: p.step, durationSec: p.durationSec }))).toEqual([
      { event: 'step_transition', step: 'welcome', durationSec: undefined },
      { event: 'step_transition', step: 'setup', durationSec: undefined },
      { event: 'step_transition', step: 'calibrate', durationSec: undefined },
      { event: 'step_transition', step: 'monitor', durationSec: undefined },
      { event: 'session_start', step: 'monitor', durationSec: undefined },
      { event: 'step_transition', step: 'welcome', durationSec: undefined },
      { event: 'session_end', step: 'monitor', durationSec: 30 },
    ]);
  });
});

