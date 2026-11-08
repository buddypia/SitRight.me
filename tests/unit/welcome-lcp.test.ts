import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/components/App/App';
import {
  DEMO_PATTERNS,
  resolveDemoTarget,
} from '@/components/PostureScene/PostureScene';
import { SettingsSheet } from '@/components/Settings/SettingsSheet';
import {
  runWelcomeTransition,
  scheduleEnginePrewarm,
  Welcome,
} from '@/components/Welcome/Welcome';
import { watchCameraPermission } from '@/engine/camera';
import { yieldToMain } from '@/engine/vision';
import { IDEAL_RIG } from '@/core/rig';
import {
  DEFAULT_LOCALE,
  MESSAGES,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/i18n/messages';
import { useAppStore } from '@/stores/appStore';

function setTestLocale(locale: Locale) {
  useAppStore.getInitialState().settings.locale = locale;
  useAppStore.setState({
    settings: { ...useAppStore.getState().settings, locale },
  });
}

describe('Welcome interactive 3D demo & LCP / engine pre-warm', () => {
  afterEach(() => {
    setTestLocale(DEFAULT_LOCALE);
    useAppStore.getInitialState().hydrated = false;
    useAppStore.getInitialState().phase = 'welcome';
    useAppStore.setState({ hydrated: false, phase: 'welcome' });
  });

  it('exposes all 5 selectable demo patterns and resolves pinned or auto-cycled targets', () => {
    expect(DEMO_PATTERNS).toEqual([
      'ideal',
      'straight_neck',
      'text_neck',
      'slouch',
      'lean',
    ]);
    for (const pattern of DEMO_PATTERNS) {
      const res = resolveDemoTarget(pattern, 0);
      expect(res.pattern).toBe(pattern);
      const total =
        res.sev.forward + res.sev.down + res.sev.slump + res.sev.lean;
      if (pattern === 'ideal') {
        expect(res.rig).toEqual(IDEAL_RIG);
        expect(total).toBe(0);
      } else {
        expect(total).toBeGreaterThan(0);
      }
    }
    expect(resolveDemoTarget(null, 100).pattern).toBe('ideal');
    expect(resolveDemoTarget(null, 2700).pattern).toBe('straight_neck');
  });

  it.each(SUPPORTED_LOCALES)(
    'renders interactive demo pattern buttons and posture preview in Welcome (%s)',
    (locale) => {
      setTestLocale(locale);
      useAppStore.setState({ hydrated: true, phase: 'welcome' });
      const t = MESSAGES[locale];
      const html = renderToString(React.createElement(Welcome));

      for (const expected of [
        t.statusGood,
        t.pattern.straight_neck.name,
        t.pattern.text_neck.name,
        t.pattern.slouch.name,
        t.pattern.lean.name,
        t.alignmentBalanced,
      ]) {
        expect(html).toContain(expected);
      }
      expect(html).not.toContain(t.privacyTitle);
      expect(html).not.toContain(t.privacyBody);
    }
  );

  it.each(SUPPORTED_LOCALES)(
    'renders the local-processing privacy summary inside SettingsSheet instead of Welcome (%s)',
    (locale) => {
      setTestLocale(locale);
      const t = MESSAGES[locale];
      const html = renderToString(
        React.createElement(SettingsSheet, { open: true, onClose: () => {} })
      );

      expect(html).toContain(t.privacyTitle);
      expect(html).toContain(t.privacyBody);
    }
  );

  it('keeps Welcome hero h1 mounted even when hydrated is false to prevent LCP re-paint delay', () => {
    setTestLocale('en');
    useAppStore.getInitialState().hydrated = false;
    useAppStore.setState({ hydrated: false, phase: 'welcome' });
    const html = renderToString(React.createElement(App));
    expect(html).toContain(MESSAGES.en.welcomeTitle.split('\n')[0]);
    expect(html).toContain(MESSAGES.en.welcomeBody);
  });

  it('schedules MediaPipe Vision engine pre-warming on idle or timeout fallback', () => {
    const ensureEngine = vi.fn(() => Promise.resolve());
    const callbacks: (() => void)[] = [];
    const cancelled: number[] = [];

    const cleanup = scheduleEnginePrewarm(ensureEngine, {
      requestIdleCallback: (cb: () => void) => (callbacks.push(cb), 42),
      cancelIdleCallback: (id: number) => void cancelled.push(id),
    });
    expect(ensureEngine).not.toHaveBeenCalled();
    callbacks[0]();
    expect(ensureEngine).toHaveBeenCalledTimes(1);
    cleanup();
    expect(cancelled).toEqual([42]);

    vi.useFakeTimers();
    try {
      const fallbackEnsure = vi.fn(() => Promise.resolve());
      const fallbackCleanup = scheduleEnginePrewarm(fallbackEnsure, {});
      vi.advanceTimersByTime(600);
      expect(fallbackEnsure).toHaveBeenCalledTimes(1);
      fallbackCleanup();
    } finally {
      vi.useRealTimers();
    }
  });

  it('starts camera immediately on Welcome -> Setup transition to eliminate double-click friction', () => {
    const startCamera = vi.fn(() => Promise.resolve());
    const setPhase = vi.fn();
    const unlock = vi.fn();

    runWelcomeTransition('setup', { setPhase, startCamera, unlock });
    expect(unlock).toHaveBeenCalledTimes(1);
    expect(setPhase).toHaveBeenCalledWith('setup');
    expect(startCamera).toHaveBeenCalledTimes(1);

    startCamera.mockClear();
    setPhase.mockClear();
    unlock.mockClear();

    runWelcomeTransition('monitor', { setPhase, startCamera, unlock });
    expect(unlock).toHaveBeenCalledTimes(1);
    expect(setPhase).toHaveBeenCalledWith('monitor');
    expect(startCamera).not.toHaveBeenCalled();
  });

  it('watches camera permission changes and triggers recovery callback when granted', async () => {
    const statusMock: {
      state: PermissionState;
      onchange: (() => void) | null;
    } = {
      state: 'denied',
      onchange: null,
    };
    const query = vi.fn(() => Promise.resolve(statusMock));
    const onGranted = vi.fn();

    const cleanup = watchCameraPermission(onGranted, {
      permissions: { query } as unknown as Permissions,
    });
    await Promise.resolve();

    expect(query).toHaveBeenCalledWith({ name: 'camera' });
    expect(onGranted).not.toHaveBeenCalled();

    statusMock.state = 'granted';
    statusMock.onchange?.();
    expect(onGranted).toHaveBeenCalledTimes(1);

    cleanup();
    expect(statusMock.onchange).toBeNull();
  });

  it('yields to the main thread via scheduler.yield or setTimeout fallback for INP responsiveness', async () => {
    const yieldFn = vi.fn(() => Promise.resolve());
    await yieldToMain({ scheduler: { yield: yieldFn } });
    expect(yieldFn).toHaveBeenCalledTimes(1);

    await expect(yieldToMain({})).resolves.toBeUndefined();
  });
});
