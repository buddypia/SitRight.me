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
import { TELEMETRY_CLIENT_ID_KEY, useAppStore } from '@/stores/appStore';

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

  it('does not include personal posture evaluation metrics (goodPosturePct or alertCount) on session_end', async () => {
    let sentPayload: Record<string, unknown> | null = null;
    const sendBeacon = vi.fn(async (_url: string, blob: Blob) => {
      sentPayload = JSON.parse(await blob.text());
      return true;
    });
    vi.stubGlobal('navigator', { onLine: true, sendBeacon });

    useAppStore.setState({
      settings: {
        ...useAppStore.getState().settings,
        locale: 'ja',
      },
    });

    const startTime = 5000000;
    vi.spyOn(Date, 'now').mockReturnValue(startTime);
    recordSessionStart('monitor');

    vi.spyOn(Date, 'now').mockReturnValue(startTime + 60000);
    recordSessionEnd('monitor');

    await vi.waitFor(() => expect(sentPayload).not.toBeNull());
    expect(sentPayload).toMatchObject({
      event: 'session_end',
      step: 'monitor',
      durationSec: 60,
      locale: 'ja',
      clientId: expect.any(String),
      sessionId: expect.any(String),
    });
    expect(sentPayload).not.toHaveProperty('goodPosturePct');
    expect(sentPayload).not.toHaveProperty('alertCount');
  });

  describe('anonymous clientId & sessionId lifecycle', () => {
    it('persists clientId in localStorage across events and rotates on resetAll or opt-out', async () => {
      const store = new Map<string, string>();
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      });

      const payloads: Record<string, unknown>[] = [];
      const sendBeacon = vi.fn(async (_url: string, blob: Blob) => {
        payloads.push(JSON.parse(await blob.text()));
        return true;
      });
      vi.stubGlobal('navigator', { onLine: true, sendBeacon });

      sendTelemetry({ event: 'step_transition', step: 'welcome' });
      sendTelemetry({ event: 'step_transition', step: 'setup' });

      await vi.waitFor(() => expect(payloads).toHaveLength(2));
      const firstClientId = payloads[0].clientId as string;
      const firstSessionId = payloads[0].sessionId as string;

      expect(firstClientId).toMatch(/^[a-z0-9-]{8,64}$/i);
      expect(firstSessionId).toMatch(/^[a-z0-9-]{8,64}$/i);
      expect(payloads[1].clientId).toBe(firstClientId);
      expect(payloads[1].sessionId).toBe(firstSessionId);
      expect(store.get(TELEMETRY_CLIENT_ID_KEY)).toBe(firstClientId);

      // Resetting all data wipes sitright.cid and rotates clientId on next event
      useAppStore.getState().resetAll();
      expect(store.has(TELEMETRY_CLIENT_ID_KEY)).toBe(false);

      sendTelemetry({ event: 'step_transition', step: 'welcome' });
      await vi.waitFor(() => expect(payloads).toHaveLength(3));
      const secondClientId = payloads[2].clientId as string;
      expect(secondClientId).toMatch(/^[a-z0-9-]{8,64}$/i);
      expect(secondClientId).not.toBe(firstClientId);

      // Opting out of telemetry wipes sitright.cid immediately
      useAppStore.getState().updateSettings({ telemetry: false });
      expect(store.has(TELEMETRY_CLIENT_ID_KEY)).toBe(false);
    });
  });

  describe('onRequestPost (Cloudflare Pages Function)', () => {
    it('sanitizes and bounds operational metrics before writing to Analytics Engine', async () => {
      const { onRequestPost } = await import('../../functions/api/telemetry');
      const writeDataPoint = vi.fn();
      const mockEnv = {
        ANALYTICS_ENGINE: { writeDataPoint },
      };

      const request = new Request('http://localhost:3000/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Sec-Fetch-Site': 'same-origin',
        },
        body: JSON.stringify({
          event: 'session_end',
          step: 'monitor',
          durationSec: 120,
          locale: 'KO',
          clientId: '550e8400-e29b-41d4-a716-446655440000',
          sessionId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        }),
      });
      // Attach mock cf object
      Object.assign(request, { cf: { country: 'KR' } });

      const res = await onRequestPost({ request, env: mockEnv });
      expect(res.status).toBe(204);

      expect(writeDataPoint).toHaveBeenCalledWith({
        blobs: [
          'session_end',
          'monitor',
          '',
          'KR',
          'ko',
          '550e8400-e29b-41d4-a716-446655440000',
          '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ],
        doubles: [120],
        indexes: ['session_end'],
      });
    });

    it('rejects cross-site requests via Sec-Fetch-Site header', async () => {
      const { onRequestPost } = await import('../../functions/api/telemetry');
      const writeDataPoint = vi.fn();
      const mockEnv = {
        ANALYTICS_ENGINE: { writeDataPoint },
      };

      const request = new Request('http://localhost:3000/api/telemetry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Sec-Fetch-Site': 'cross-site',
        },
        body: JSON.stringify({ event: 'step_transition', step: 'welcome' }),
      });

      const res = await onRequestPost({ request, env: mockEnv });
      expect(res.status).toBe(403);
      expect(writeDataPoint).not.toHaveBeenCalled();
    });

    it('rejects invalid locale, malformed IDs, and out-of-range metrics gracefully', async () => {
      const { onRequestPost } = await import('../../functions/api/telemetry');
      const writeDataPoint = vi.fn();
      const mockEnv = {
        ANALYTICS_ENGINE: { writeDataPoint },
      };

      const request = new Request('http://localhost:3000/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'session_end',
          step: 'monitor',
          durationSec: -10,
          locale: 'INVALID-LONG-LOCALE-1234',
          clientId: 'bad id with spaces & symbols!',
          sessionId: 'short',
        }),
      });

      const res = await onRequestPost({ request, env: mockEnv });
      expect(res.status).toBe(204);

      expect(writeDataPoint).toHaveBeenCalledWith({
        blobs: ['session_end', 'monitor', '', '', '', '', ''],
        doubles: [0],
        indexes: ['session_end'],
      });
    });
  });

  describe('development server & MediaPipe console noise suppression', () => {
    it('skips /api/telemetry network dispatch when NODE_ENV is development (next dev)', () => {
      const sendBeacon = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', { onLine: true, sendBeacon });
      vi.stubEnv('NODE_ENV', 'development');

      try {
        sendTelemetry({ event: 'step_transition', step: 'welcome' });
        expect(sendBeacon).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('suppresses benign MediaPipe WASM glog warnings and info logs while preserving real warnings/errors', async () => {
      const {
        filterMediapipeInfoLogs,
        resetMediapipeConsoleFilterForTesting,
      } = await import('@/engine/vision');

      const originalWarn = console.warn;
      const originalError = console.error;
      const warnSpy = vi.fn();
      const errorSpy = vi.fn();
      console.warn = warnSpy;
      console.error = errorSpy;
      resetMediapipeConsoleFilterForTesting();

      try {
        filterMediapipeInfoLogs();

        console.error('INFO: Created TensorFlow Lite XNNPACK delegate for CPU.');
        console.warn(
          'W1015 15:14:25.920000 2172416 face_landmarker_graph.cc:180] Sets FaceBlendshapesGraph acceleration to xnnpack by default.'
        );
        console.warn(
          'W1015 15:14:25.944999 2172416 gl_context.cc:1135] OpenGL error checking is disabled'
        );
        console.warn(
          'W1015 15:14:26.276000 2172416 landmark_projection_calculator.cc:81] Using NORM_RECT without IMAGE_DIMENSIONS is only supported for the square ROI. Provide IMAGE_DIMENSIONS or use PROJECTION_MATRIX.'
        );

        expect(errorSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();

        console.warn('[vision] GPU delegate unavailable, falling back to CPU');
        console.error('Unexpected WebGL context loss');
        expect(warnSpy).toHaveBeenCalledWith(
          '[vision] GPU delegate unavailable, falling back to CPU'
        );
        expect(errorSpy).toHaveBeenCalledWith('Unexpected WebGL context loss');
      } finally {
        console.warn = originalWarn;
        console.error = originalError;
        resetMediapipeConsoleFilterForTesting();
      }
    });
  });

  describe('Cloudflare Web Analytics (RUM) integration', () => {
    it('allows Cloudflare Web Analytics RUM beacon and script in postbuild CSP and telemetry blocker', async () => {
      const { readFileSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      const postbuildSrc = readFileSync(
        resolve(process.cwd(), 'scripts/postbuild.mjs'),
        'utf8'
      );
      expect(postbuildSrc).toContain('https://static.cloudflareinsights.com');
      expect(postbuildSrc).toContain('https://cloudflareinsights.com');
      expect(isBlockedTelemetryUrl('https://cloudflareinsights.com/cdn-cgi/rum')).toBe(false);
      expect(isBlockedTelemetryUrl('https://static.cloudflareinsights.com/beacon.min.js')).toBe(false);
    });

    it('resolves RUM site_tag from env or default and formats RUM visits and Core Web Vitals P75 metrics', async () => {
      const { DEFAULT_RUM_SITE_TAG, resolveRumSiteTag, summarizeRumAnalytics } = await import(
        '../../scripts/cf-analytics.mjs'
      );

      expect(resolveRumSiteTag({})).toBe(DEFAULT_RUM_SITE_TAG);
      expect(resolveRumSiteTag({ CLOUDFLARE_RUM_SITE_TAG: ' custom-tag-123 ' })).toBe(
        'custom-tag-123'
      );

      const summary = summarizeRumAnalytics({
        data: {
          viewer: {
            accounts: [
              {
                rumPageloadEventsAdaptiveGroups: [
                  {
                    count: 30,
                    sum: { visits: 20 },
                    dimensions: { date: '2026-10-28', countryName: 'JP' },
                  },
                  {
                    count: 10,
                    sum: { visits: 10 },
                    dimensions: { date: '2026-10-29', countryName: 'KR' },
                  },
                ],
                rumWebVitalsEventsAdaptiveGroups: [
                  {
                    count: 40,
                    quantiles: {
                      largestContentfulPaintP75: 1250000,
                      interactionToNextPaintP75: 96000,
                      cumulativeLayoutShiftP75: 0.012,
                      firstContentfulPaintP75: 640000,
                      timeToFirstByteP75: 180000,
                    },
                  },
                ],
              },
            ],
          },
        },
      });

      expect(summary).toEqual({
        totalPageViews: 40,
        totalVisits: 30,
        byCountry: [
          { country: 'JP', visits: 20, pageViews: 30 },
          { country: 'KR', visits: 10, pageViews: 10 },
        ],
        webVitals: {
          sampleCount: 40,
          lcpMsP75: 1250,
          inpMsP75: 96,
          clsP75: 0.012,
          fcpMsP75: 640,
          ttfbMsP75: 180,
        },
      });
    });
  });
});

