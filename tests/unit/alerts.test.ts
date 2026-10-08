import { describe, expect, it } from 'vitest';
import { AlertEngine, SittingTracker, type AlertEvent } from '@/core/alerts';
import type { PostureAssessment, PosturePattern } from '@/core/types';

const make = (
  sev: number,
  pattern: PosturePattern | null = 'straight_neck'
): PostureAssessment => ({
  deviation: {
    headForwardCm: 0,
    headDownDeg: 0,
    compression: 0,
    trunkDrop: 0,
    leanDeg: 0,
    headTiltDeg: 0,
  },
  severity: { forward: sev, down: 0, slump: 0, lean: 0 },
  score: Math.round(100 * (1 - sev)),
  level: sev >= 0.6 ? 'poor' : sev >= 0.3 ? 'fair' : 'good',
  pattern: sev >= 0.3 ? pattern : null,
  neckLoadKg: 5,
  neckFlexDeg: 0,
});

const config = { delaySec: 20, cooldownSec: 120 };

function run(
  engine: AlertEngine,
  seconds: number,
  a: PostureAssessment | null,
  start: number
) {
  const events: { t: number; e: AlertEvent }[] = [];
  for (let i = 1; i <= seconds * 10; i += 1) {
    const t = start + i / 10;
    const e = engine.update(a, 0.1, t, config);
    if (e) events.push({ t, e });
  }
  return events;
}

describe('AlertEngine', () => {
  it('alerts only after bad posture persists for the delay', () => {
    const engine = new AlertEngine();
    const events = run(engine, 25, make(0.7), 0);
    expect(events).toHaveLength(1);
    expect(events[0].t).toBeCloseTo(20, 0);
    expect(events[0].e).toEqual({
      type: 'alert',
      pattern: 'straight_neck',
      repeat: 1,
    });
  });

  it('keeps accumulating inside the hysteresis band', () => {
    const engine = new AlertEngine();
    // 0.25 は FAIR_AT 未満だがヒステリシス幅内。パターンは null になるが蓄積は続く
    let events = run(engine, 10, make(0.4), 0);
    events = events.concat(run(engine, 12, make(0.25), 10));
    expect(engine.isBad).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].e).toMatchObject({
      type: 'alert',
      pattern: 'straight_neck',
    });
  });

  it('ignores short episodes such as reaching for something', () => {
    const engine = new AlertEngine();
    let events = run(engine, 8, make(0.8), 0);
    events = events.concat(run(engine, 10, make(0), 8));
    events = events.concat(run(engine, 8, make(0.8), 18));
    expect(events).toHaveLength(0);
  });

  it('does not reset progress on a one-second correction', () => {
    const engine = new AlertEngine();
    let events = run(engine, 15, make(0.8), 0);
    events = events.concat(run(engine, 1, make(0), 15));
    events = events.concat(run(engine, 8, make(0.8), 16));
    expect(events.filter((x) => x.e.type === 'alert')).toHaveLength(1);
  });

  it('holds state while the frame is unreliable', () => {
    const engine = new AlertEngine();
    run(engine, 15, make(0.8), 0);
    run(engine, 30, null, 15);
    const events = run(engine, 6, make(0.8), 45);
    expect(events.map((x) => x.e.type)).toEqual(['alert']);
  });

  it('respects the cooldown and reports recovery', () => {
    const engine = new AlertEngine();
    let events = run(engine, 60, make(0.8), 0);
    expect(events.filter((x) => x.e.type === 'alert')).toHaveLength(1);
    events = run(engine, 5, make(0), 60);
    expect(events.map((x) => x.e.type)).toEqual(['recovered']);
  });

  it('re-alerts after the cooldown if posture stays bad', () => {
    const engine = new AlertEngine();
    const events = run(engine, 160, make(0.8), 0).filter(
      (x) => x.e.type === 'alert'
    );
    expect(events).toHaveLength(2);
    expect(events[1].t).toBeGreaterThanOrEqual(140);
    expect(events[1].e).toMatchObject({ repeat: 2 });
  });

  it('applies hysteresis around the threshold', () => {
    const engine = new AlertEngine();
    engine.update(make(0.32), 0.1, 0, config);
    expect(engine.isBad).toBe(true);
    engine.update(make(0.27), 0.1, 0.1, config);
    expect(engine.isBad).toBe(true);
    engine.update(make(0.2), 0.1, 0.2, config);
    expect(engine.isBad).toBe(false);
  });

  it('reports the dominant pattern of the episode', () => {
    const engine = new AlertEngine();
    run(engine, 5, make(0.7, 'text_neck'), 0);
    const events = run(engine, 16, make(0.7, 'slouch'), 5);
    expect(events[0].e).toMatchObject({ type: 'alert', pattern: 'slouch' });
  });
});

describe('SittingTracker', () => {
  it('reminds after the interval and resets after a real break', () => {
    const tracker = new SittingTracker(90);
    let reminded = 0;
    for (let i = 0; i < 46 * 60; i += 1)
      if (tracker.update(true, 1, 45)) reminded += 1;
    expect(reminded).toBe(1);
    for (let i = 0; i < 100; i += 1) tracker.update(false, 1, 45);
    expect(tracker.minutes).toBe(0);
  });

  it('a short absence is not a break', () => {
    const tracker = new SittingTracker(90);
    for (let i = 0; i < 600; i += 1) tracker.update(true, 1, 45);
    for (let i = 0; i < 30; i += 1) tracker.update(false, 1, 45);
    expect(tracker.minutes).toBeCloseTo(10);
  });
});
