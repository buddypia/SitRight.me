import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installThirdPartyTelemetryBlocker,
  isBlockedTelemetryUrl,
  resetTelemetryBlockerForTesting,
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
  });

  describe('installThirdPartyTelemetryBlocker', () => {
    it('intercepts third-party fetch and silently returns 204 without calling original fetch', async () => {
      const originalFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
      vi.stubGlobal('window', {
        location: { origin: 'http://localhost:3000' },
        fetch: originalFetch,
      });

      installThirdPartyTelemetryBlocker();

      const res = await window.fetch('https://odml.pa.googleapis.com/v1/log', {
        method: 'POST',
        body: '{}',
      });

      expect(res.status).toBe(204);
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

    it('intercepts third-party sendBeacon and returns true without dispatching', () => {
      const originalSendBeacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
      vi.stubGlobal('navigator', { sendBeacon: originalSendBeacon });

      installThirdPartyTelemetryBlocker();

      const result = navigator.sendBeacon('https://odml.pa.googleapis.com/v1/log', '{}');
      expect(result).toBe(true);
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
});

