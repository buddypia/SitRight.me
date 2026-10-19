import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Metrics } from '@/components/Monitor/Metrics';
import { MiniMonitor } from '@/components/Monitor/MiniMonitor';
import { StatusCard } from '@/components/Monitor/StatusCard';
import { TodayPanel } from '@/components/Monitor/TodayPanel';
import { IDEAL_RIG } from '@/core/rig';
import { emptyDay, localDateKey, type DayStats } from '@/core/stats';
import type { PostureAssessment } from '@/core/types';
import { MESSAGES } from '@/i18n/messages';
import type { LiveState } from '@/stores/appStore';

const sampleAssessment = (
  overrides: Partial<PostureAssessment> = {}
): PostureAssessment => ({
  deviation: {
    headForwardCm: 0.4,
    headDownDeg: 1.2,
    compression: 0.01,
    trunkDrop: 0,
    leanDeg: 0.2,
    headTiltDeg: 0.1,
  },
  severity: {
    forward: 0.05,
    down: 0.05,
    slump: 0.02,
    lean: 0.02,
  },
  score: 94,
  level: 'good',
  pattern: null,
  neckFlexDeg: 3,
  neckLoadKg: 5.2,
  ...overrides,
});

const sampleLive = (overrides: Partial<LiveState> = {}): LiveState => ({
  camera: 'on',
  cameraError: null,
  engine: 'ready',
  paused: false,
  away: false,
  checks: { face: true, shoulders: true, facing: true },
  issue: null,
  calibration: null,
  assessment: sampleAssessment(),
  rig: IDEAL_RIG,
  alertProgress: 0,
  sittingMin: 12,
  baselineSuspect: false,
  event: null,
  ...overrides,
});

describe('StatusCard & MiniMonitor layout stability across posture transitions', () => {
  const states: { name: string; live: LiveState }[] = [
    {
      name: 'good (proper posture)',
      live: sampleLive({
        assessment: sampleAssessment({ level: 'good', pattern: null, score: 95 }),
      }),
    },
    {
      name: 'fair (slightly off - straight_neck)',
      live: sampleLive({
        alertProgress: 0.4,
        assessment: sampleAssessment({
          level: 'fair',
          pattern: 'straight_neck',
          score: 62,
        }),
      }),
    },
    {
      name: 'poor (posture slipping - neck_hunch)',
      live: sampleLive({
        alertProgress: 0.85,
        assessment: sampleAssessment({
          level: 'poor',
          pattern: 'neck_hunch',
          score: 28,
        }),
      }),
    },
    {
      name: 'checking (issue: turned_away)',
      live: sampleLive({
        assessment: null,
        issue: 'turned_away',
      }),
    },
    {
      name: 'paused',
      live: sampleLive({
        paused: true,
      }),
    },
    {
      name: 'away',
      live: sampleLive({
        away: true,
      }),
    },
    {
      name: 'loading',
      live: sampleLive({
        engine: 'loading',
        assessment: null,
      }),
    },
  ];

  it.each(states)(
    'keeps invariant top-row and bottom-slot height classes in StatusCard when $name',
    ({ name, live }) => {
      const html = renderToString(
        React.createElement(StatusCard, {
          live,
          t: MESSAGES.ja,
          alertDelaySec: 15,
        })
      );

      // Fixed 16x16 icon wrapper so icon differences never shift the badge line
      expect(html).toContain('h-4 w-4 shrink-0');
      // Fixed-height badge row, heading row, and subtitle row
      expect(html).toContain('h-5 items-center gap-2');
      expect(html).toContain('leading-7');
      expect(html).toContain('leading-5');
      // Fixed-height bottom slot across good (HUD) and non-good (detail + countdown)
      expect(html).toContain('h-[108px]');
      expect(html).toContain('sm:h-[92px]');

      // Duplicate metric labels in SpineAlignmentHUD must only mount in 'good' state
      if (name.startsWith('good')) {
        expect(html).toContain(MESSAGES.ja.metricForward);
      } else {
        expect(html).not.toContain(MESSAGES.ja.metricForward);
      }
    }
  );

  it.each(states)(
    'keeps invariant footer lines and progress bar height in MiniMonitor when $name',
    ({ live }) => {
      const html = renderToString(
        React.createElement(MiniMonitor, {
          live,
          t: MESSAGES.ja,
          xray: false,
          avatar: 'man',
          lowPower: false,
        })
      );

      expect(html).toContain('h-3.5 w-3.5 shrink-0');
      expect(html).toContain('leading-4 text-ink-3');
      expect(html).toContain('h-1 bg-white/6');
    }
  );
});

describe('Chart and metric hover explanations (TodayPanel & Metrics)', () => {
  it('provides descriptive hover hints on all 5 real-time Metrics rows', () => {
    const html = renderToString(
      React.createElement(Metrics, {
        assessment: sampleAssessment(),
        t: MESSAGES.ja,
        dimmed: false,
      })
    );

    expect(html).toContain(MESSAGES.ja.metricForwardHint);
    expect(html).toContain(MESSAGES.ja.metricDownHint);
    expect(html).toContain(MESSAGES.ja.metricSlumpHint);
    expect(html).toContain(MESSAGES.ja.metricLeanHint);
    expect(html).toContain(MESSAGES.ja.metricLoadHint);
    expect(html).toContain('whitespace-nowrap');
  });

  it('renders chart explanations, full-height bar targets, and descriptive tooltips in TodayPanel', () => {
    const todayKey = localDateKey(new Date());
    const now = new Date();
    const minuteNow = now.getHours() * 60 + now.getMinutes();
    const todayStats: DayStats = {
      ...emptyDay(todayKey),
      monitoredSec: 45, // even under 60s, today's bar in 7-day chart should reflect data
      goodSec: 36,
      fairSec: 9,
      poorSec: 0,
      alerts: 2,
      recoveries: 1,
      patternSec: { straight_neck: 9 },
      timeline: [[minuteNow, 84, 45]],
    };

    const html = renderToString(
      React.createElement(TodayPanel, {
        history: [todayStats],
        t: MESSAGES.ja,
        locale: 'ja',
        sittingMin: 15,
      })
    );

    // Axis labels are clear and localized ("60分前", "30分前", "現在")
    expect(html).toContain(MESSAGES.ja.timelineAgo60);
    expect(html).toContain(MESSAGES.ja.timelineAgo30);
    expect(html).toContain(MESSAGES.ja.timelineNow);

    // Section explanations exist for all charts and stats
    expect(html).toContain(MESSAGES.ja.timelineHint);
    expect(html).toContain(MESSAGES.ja.breakdownHint);
    expect(html).toContain(MESSAGES.ja.weekHint);
    expect(html).toContain(MESSAGES.ja.goodRatioHint);

    // Measured and unmeasured timeline bars both have descriptive titles
    expect(html).toContain('84 / 100');
    expect(html).toContain('計測なし');

    // 7-day chart shows today's 80% good ratio even when monitoredSec < 60s
    expect(html).toContain('良い姿勢 80%');
  });
});
