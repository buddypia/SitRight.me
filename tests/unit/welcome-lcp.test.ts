import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/components/App/App';
import {
  DEMO_PATTERNS,
  resolveDemoTarget,
} from '@/components/PostureScene/PostureScene';
import { scheduleEnginePrewarm, Welcome } from '@/components/Welcome/Welcome';
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
    settings: {
      ...useAppStore.getState().settings,
      locale,
    },
  });
}

describe('Welcome interactive 3D demo & LCP / engine pre-warm', () => {
  afterEach(() => {
    setTestLocale(DEFAULT_LOCALE);
    useAppStore.getInitialState().hydrated = false;
    useAppStore.getInitialState().phase = 'welcome';
    useAppStore.setState({
      hydrated: false,
      phase: 'welcome',
    });
  });

  it('exposes all 5 selectable demo patterns in order', () => {
    expect(DEMO_PATTERNS).toEqual([
      'ideal',
      'straight_neck',
      'text_neck',
      'slouch',
      'lean',
    ]);
  });

  it('resolves exact rig and severity for a pinned demoPattern or cycles over time when null', () => {
    for (const pattern of DEMO_PATTERNS) {
      const resolved = resolveDemoTarget(pattern, 0);
      expect(resolved.pattern).toBe(pattern);
      if (pattern === 'ideal') {
        expect(resolved.rig).toEqual(IDEAL_RIG);
        expect(resolved.sev).toEqual({
          forward: 0,
          down: 0,
          slump: 0,
          lean: 0,
        });
      } else {
        const totalSev =
          resolved.sev.forward +
          resolved.sev.down +
          resolved.sev.slump +
          resolved.sev.lean;
        expect(totalSev).toBeGreaterThan(0);
      }
    }

    // When demoPattern is null, it cycles over DEMO_HOLD_MS (2600ms) intervals
    const frame0 = resolveDemoTarget(null, 100);
    const frame1 = resolveDemoTarget(null, 2700);
    expect(frame0.pattern).toBe('ideal');
    expect(frame1.pattern).toBe('straight_neck');
  });

  it.each(SUPPORTED_LOCALES)(
    'renders interactive demo pattern buttons and posture preview in Welcome (%s)',
    (locale) => {
      setTestLocale(locale);
      useAppStore.setState({
        hydrated: true,
        phase: 'welcome',
      });
      const t = MESSAGES[locale];
      const html = renderToString(React.createElement(Welcome));

      expect(html).toContain(t.statusGood);
      expect(html).toContain(t.pattern.straight_neck.name);
      expect(html).toContain(t.pattern.text_neck.name);
      expect(html).toContain(t.pattern.slouch.name);
      expect(html).toContain(t.pattern.lean.name);
      expect(html).toContain(t.alignmentBalanced);
    }
  );

  it('keeps Welcome hero h1 mounted even when hydrated is false to prevent LCP re-paint delay', () => {
    setTestLocale('en');
    useAppStore.getInitialState().hydrated = false;
    useAppStore.setState({
      hydrated: false,
      phase: 'welcome',
    });
    const html = renderToString(React.createElement(App));
    expect(html).toContain(MESSAGES.en.welcomeTitle.split('\n')[0]);
    expect(html).toContain(MESSAGES.en.welcomeBody);
  });

  it('schedules MediaPipe Vision engine pre-warming on idle and cancels cleanly on unmount', () => {
    const ensureEngine = vi.fn(() => Promise.resolve());
    const callbacks: (() => void)[] = [];
    const cancelled: number[] = [];

    const cleanup = scheduleEnginePrewarm(ensureEngine, {
      requestIdleCallback: (cb: () => void) => {
        callbacks.push(cb);
        return 42;
      },
      cancelIdleCallback: (id: number) => {
        cancelled.push(id);
      },
    });

    expect(ensureEngine).not.toHaveBeenCalled();
    expect(callbacks).toHaveLength(1);

    callbacks[0]();
    expect(ensureEngine).toHaveBeenCalledTimes(1);

    cleanup();
    expect(cancelled).toEqual([42]);
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
    vi.useFakeTimers();
    try {
      const ensureEngine = vi.fn(() => Promise.resolve());
      const cleanup = scheduleEnginePrewarm(ensureEngine, {});

      expect(ensureEngine).not.toHaveBeenCalled();
      vi.advanceTimersByTime(600);
      expect(ensureEngine).toHaveBeenCalledTimes(1);

      cleanup();
    } finally {
      vi.useRealTimers();
    }
  });
});
