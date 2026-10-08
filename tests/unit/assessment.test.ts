import { describe, expect, it } from 'vitest';
import { assess, neckLoadKg } from '@/core/assessment';
import { CalibrationCollector } from '@/core/calibration';
import { extractMetrics, headPoseFromMatrix } from '@/core/metrics';
import type { Baseline, RawMetrics, VisionFrame } from '@/core/types';
import { synthFrame, uprightScene, type Scene } from './synthetic';

const metricsOf = (frame: VisionFrame): RawMetrics => {
  const r = extractMetrics(frame);
  if (!r.ok) throw new Error(`frame rejected: ${r.issue}`);
  return r.metrics;
};

const baselineFrom = (s: Scene): Baseline => {
  const m = metricsOf(synthFrame(s));
  return { ...m, headDistanceCm: m.headDistanceCm ?? 55, capturedAt: 0 };
};

const assessScene = (s: Scene, b = baselineFrom(uprightScene())) =>
  assess(metricsOf(synthFrame(s)), b, 'standard');

describe('head pose from matrix', () => {
  it('reports downward pitch as positive and recovers distance', () => {
    const level = headPoseFromMatrix(synthFrame(uprightScene()).faceMatrix)!;
    expect(level.pitch).toBeCloseTo(0, 5);
    expect(level.distanceCm).toBeCloseTo(62, 5);
    const down = headPoseFromMatrix(
      synthFrame({ ...uprightScene(), pitch: 20 }).faceMatrix
    )!;
    expect(down.pitch).toBeCloseTo(20, 1);
  });

  it('accepts row-major layout as well', () => {
    const m = synthFrame({ ...uprightScene(), pitch: 15 }).faceMatrix!;
    const t = [0, 1, 2, 3].flatMap((r) =>
      [0, 1, 2, 3].map((c) => m[c * 4 + r])
    );
    expect(headPoseFromMatrix(t)!.pitch).toBeCloseTo(15, 1);
  });
});

describe('posture assessment (synthetic camera)', () => {
  it('upright posture equal to the baseline is good', () => {
    const a = assessScene(uprightScene());
    expect(a.level).toBe('good');
    expect(a.pattern).toBeNull();
    expect(a.score).toBe(100);
    expect(Math.abs(a.deviation.headForwardCm)).toBeLessThan(0.01);
  });

  it('estimates how far the head moved forward in cm', () => {
    const s = uprightScene();
    for (const d of [2, 5, 8]) {
      const a = assessScene({ ...s, head: { ...s.head, z: s.head.z - d } });
      expect(a.deviation.headForwardCm).toBeGreaterThan(d * 0.85);
      expect(a.deviation.headForwardCm).toBeLessThan(d * 1.15);
    }
  });

  it('detects straight neck (forward head) posture', () => {
    const s = uprightScene();
    const a = assessScene({ ...s, head: { ...s.head, z: s.head.z - 6 } });
    expect(a.pattern).toBe('straight_neck');
    expect(a.level).not.toBe('good');
    expect(a.neckLoadKg).toBeGreaterThan(10);
  });

  it('detects text neck (looking down with the head)', () => {
    const a = assessScene({ ...uprightScene(), pitch: 28 });
    expect(a.pattern).toBe('text_neck');
    expect(a.level).toBe('poor');
  });

  it('detects neck hunch (head forward and dropped)', () => {
    const s = uprightScene();
    const a = assessScene({
      ...s,
      head: { ...s.head, z: s.head.z - 5, y: s.head.y - 4 },
    });
    expect(a.pattern).toBe('neck_hunch');
  });

  it('detects slouching (upper body sinks)', () => {
    const s = uprightScene();
    const a = assessScene({
      head: { ...s.head, y: s.head.y - 6 },
      shoulders: { ...s.shoulders, y: s.shoulders.y - 1.5 },
    });
    expect(a.pattern).toBe('slouch');
  });

  it('is not fooled by moving the whole body closer or farther', () => {
    const s = uprightScene();
    for (const dz of [-12, 15]) {
      const a = assessScene({
        head: { ...s.head, z: s.head.z + dz },
        shoulders: { ...s.shoulders, z: s.shoulders.z + dz },
      });
      expect(a.level).toBe('good');
    }
  });

  it('small natural sway stays good', () => {
    const s = uprightScene();
    const a = assessScene({
      ...s,
      pitch: 4,
      head: { ...s.head, z: s.head.z - 1, y: s.head.y - 0.5 },
    });
    expect(a.level).toBe('good');
  });

  it('sensitivity changes the verdict for borderline posture', () => {
    const s = uprightScene();
    const m = metricsOf(
      synthFrame({ ...s, head: { ...s.head, z: s.head.z - 3.2 } })
    );
    const b = baselineFrom(s);
    expect(assess(m, b, 'gentle').level).toBe('good');
    expect(assess(m, b, 'strict').level).not.toBe('good');
  });
});

describe('frame quality gating', () => {
  it('rejects frames without visible shoulders', () => {
    const f = synthFrame(uprightScene());
    f.pose![11] = { ...f.pose![11], y: 1.05, visibility: 0.2 };
    expect(extractMetrics(f)).toEqual({ ok: false, issue: 'shoulders_hidden' });
  });

  it('rejects frames when the user looks sideways', () => {
    expect(extractMetrics(synthFrame({ ...uprightScene(), yaw: 45 }))).toEqual({
      ok: false,
      issue: 'turned_away',
    });
  });

  it('rejects a rotated torso', () => {
    expect(
      extractMetrics(synthFrame({ ...uprightScene(), shoulderDepthSkew: 40 }))
    ).toEqual({
      ok: false,
      issue: 'body_rotated',
    });
  });

  it('never throws on NaN or missing data', () => {
    const f = synthFrame(uprightScene());
    f.pose![12] = { x: NaN, y: NaN, z: NaN };
    expect(extractMetrics(f).ok).toBe(false);
    expect(extractMetrics({ ...f, pose: null, face: null }).ok).toBe(false);
    expect(extractMetrics({ ...synthFrame(uprightScene()), face: [] }).ok).toBe(
      false
    );
    const g = synthFrame(uprightScene());
    g.faceMatrix = Array(16).fill(NaN);
    expect(() => extractMetrics(g)).not.toThrow();
  });
});

describe('calibration', () => {
  it('produces a baseline after holding still for 3 s', () => {
    const c = new CalibrationCollector();
    const m = metricsOf(synthFrame(uprightScene()));
    let status = c.push(m, 0);
    for (let t = 100; t <= 3200 && status.state !== 'done'; t += 100)
      status = c.push({ ...m }, t);
    expect(status.state).toBe('done');
    if (status.state === 'done')
      expect(status.baseline.scaleRatio).toBeCloseTo(m.scaleRatio, 6);
  });

  it('restarts when the user moves during calibration', () => {
    const c = new CalibrationCollector();
    const s = uprightScene();
    const states = new Set<string>();
    for (let t = 0; t <= 5000; t += 100) {
      const moving = { ...s, pitch: t % 200 === 0 ? 0 : 15 };
      states.add(c.push(metricsOf(synthFrame(moving)), t).state);
    }
    expect(states.has('unstable')).toBe(true);
    expect(states.has('done')).toBe(false);
  });
});

describe('neck load estimate', () => {
  it('interpolates the published reference values', () => {
    expect(neckLoadKg(0)).toBeCloseTo(5);
    expect(neckLoadKg(30)).toBeCloseTo(18.1);
    expect(neckLoadKg(22.5)).toBeCloseTo((12.2 + 18.1) / 2);
    expect(neckLoadKg(90)).toBeCloseTo(27.2);
  });
});
