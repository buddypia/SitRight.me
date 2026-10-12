import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendTelemetry } from '@/engine/telemetry';
import { useAppStore } from '@/stores/appStore';

describe('sendTelemetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('window', {});
    useAppStore.setState({
      settings: {
        ...useAppStore.getState().settings,
        telemetry: true,
      },
    });
  });

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
