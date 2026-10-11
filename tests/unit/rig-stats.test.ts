import { describe, expect, it } from 'vitest';
import { IDEAL_RIG, solveSkeleton } from '@/core/rig';
import {
  accumulate,
  emptyDay,
  findPeakCollapseHour,
  goodRatio,
  pruneHistory,
  recoveryRate,
} from '@/core/stats';
import type { PostureAssessment } from '@/core/types';

describe('posture rig', () => {
  it('ideal posture puts the ear over the shoulder', () => {
    const s = solveSkeleton(IDEAL_RIG);
    expect(Math.abs(s.ear.x - s.acromion.x)).toBeLessThan(1);
    expect(s.ear.y).toBeGreaterThan(s.acromion.y + 10);
    expect(s.vertebrae).toHaveLength(24);
  });

  it('moves the ear forward by the measured amount', () => {
    for (const d of [3, 6, 9]) {
      const s = solveSkeleton({ ...IDEAL_RIG, headForwardCm: d });
      expect(s.ear.x - s.acromion.x).toBeCloseTo(d + 0.4, 1);
    }
  });

  it('slouching rounds the thoracic spine and lowers the head', () => {
    const ideal = solveSkeleton(IDEAL_RIG);
    const slumped = solveSkeleton({
      ...IDEAL_RIG,
      thoracicFlexDeg: 30,
      shoulderProtractCm: 3,
    });
    expect(slumped.c7.y).toBeLessThan(ideal.c7.y - 2);
    expect(slumped.c7.x).toBeGreaterThan(ideal.c7.x + 3);
  });

  it('stays finite for extreme inputs', () => {
    const s = solveSkeleton({
      thoracicFlexDeg: 80,
      headForwardCm: 40,
      headPitchDeg: 90,
      shoulderProtractCm: 9,
      leanDeg: 90,
      headRollDeg: -90,
    });
    for (const v of s.vertebrae)
      expect(Number.isFinite(v.x + v.y + v.angle)).toBe(true);
  });
});

const a = (
  score: number,
  level: PostureAssessment['level']
): PostureAssessment => ({
  deviation: {
    headForwardCm: 0,
    headDownDeg: 0,
    compression: 0,
    trunkDrop: 0,
    leanDeg: 0,
    headTiltDeg: 0,
  },
  severity: { forward: 0, down: 0, slump: 0, lean: 0 },
  score,
  level,
  pattern: level === 'good' ? null : 'slouch',
  neckLoadKg: 5,
  neckFlexDeg: 0,
});

describe('daily stats', () => {
  it('accumulates time per level and per-minute averages', () => {
    const t = new Date(2026, 9, 3, 10, 15, 0);
    let d = emptyDay('2026-10-03');
    d = accumulate(d, a(100, 'good'), 1, t);
    d = accumulate(d, a(40, 'poor'), 1, t);
    d = accumulate(d, a(80, 'good'), 2, new Date(2026, 9, 3, 10, 16, 0));
    expect(d.monitoredSec).toBe(4);
    expect(goodRatio(d)).toBe(0.75);
    expect(d.timeline).toEqual([
      [615, 70, 2],
      [616, 80, 2],
    ]);
    expect(d.patternSec.slouch).toBe(1);
  });

  it('calculates recovery rate correctly', () => {
    const d = emptyDay('2026-10-03');
    expect(recoveryRate(d)).toBeNull();
    d.alerts = 5;
    d.recoveries = 4;
    expect(recoveryRate(d)).toBe(0.8);
    d.recoveries = 10;
    expect(recoveryRate(d)).toBe(1);
  });

  it('identifies peak collapse hour when slump occurs', () => {
    // Insufficient timeline points
    expect(findPeakCollapseHour([])).toBeNull();
    expect(
      findPeakCollapseHour([
        [600, 50, 60],
        [601, 50, 60],
      ])
    ).toBeNull();

    // 14:00 (minute 840) to 14:05 (minute 844) has low scores and >= 120s sample
    const timeline: [number, number, number][] = [
      [600, 90, 60],
      [601, 85, 60],
      [602, 90, 60],
      [840, 45, 60],
      [841, 40, 60],
      [842, 50, 60],
    ];
    const peak = findPeakCollapseHour(timeline);
    expect(peak).not.toBeNull();
    expect(peak?.startHour).toBe(14);
    expect(peak?.endHour).toBe(15);
    expect(peak?.avgScore).toBe(45);
  });

  it('returns null for peak collapse when posture is consistently good', () => {
    const goodTimeline: [number, number, number][] = [
      [600, 95, 60],
      [601, 90, 60],
      [602, 85, 60],
      [603, 90, 60],
      [604, 92, 60],
    ];
    expect(findPeakCollapseHour(goodTimeline)).toBeNull();
  });

  it('keeps 14 days, newest first, and adds today', () => {
    const days = Array.from({ length: 20 }, (_, i) =>
      emptyDay(`2026-09-${String(i + 1).padStart(2, '0')}`)
    );
    const h = pruneHistory(days, '2026-10-03');
    expect(h).toHaveLength(14);
    expect(h[0].date).toBe('2026-10-03');
  });
});
