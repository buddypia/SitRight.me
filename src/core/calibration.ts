import type { Baseline, RawMetrics } from './types';

export const CALIBRATION_DURATION_MS = 3000;
const MIN_SAMPLES = 12;
const DEFAULT_HEAD_DISTANCE_CM = 55;

/** 静止判定の許容幅。動いている間の値を基準にすると判定全体が狂うため厳しめにする */
const STABILITY = {
  scaleRatio: 0.035, // 相対ばらつき
  neckRise: 0.05, // 相対ばらつき
  headPitch: 3.5, // 度
};

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const stdDev = (values: number[]) => {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  );
};

export type CalibrationStatus =
  | { state: 'collecting'; progress: number }
  | { state: 'unstable'; progress: number }
  | { state: 'done'; baseline: Baseline };

/**
 * 良い姿勢を数秒間保ってもらい、その中央値を基準にする。
 * 途中で動いた・映らなくなった場合は最初からやり直す。
 */
export class CalibrationCollector {
  private samples: { t: number; m: RawMetrics }[] = [];
  private startedAt: number | null = null;

  reset(): void {
    this.samples = [];
    this.startedAt = null;
  }

  /** 信頼できないフレームが来たら中断してやり直す */
  interrupt(): void {
    this.reset();
  }

  push(m: RawMetrics, timeMs: number): CalibrationStatus {
    if (this.startedAt === null) this.startedAt = timeMs;
    this.samples.push({ t: timeMs, m });

    const elapsed = timeMs - this.startedAt;
    const progress = Math.min(1, elapsed / CALIBRATION_DURATION_MS);

    // 直近1秒で静止しているかを確認
    const recent = this.samples
      .filter((s) => timeMs - s.t <= 1000)
      .map((s) => s.m);
    if (recent.length >= 4 && !isStable(recent)) {
      this.samples = [];
      this.startedAt = timeMs;
      return { state: 'unstable', progress: 0 };
    }

    if (progress < 1 || this.samples.length < MIN_SAMPLES)
      return { state: 'collecting', progress };

    const all = this.samples.map((s) => s.m);
    const distances = all
      .map((m) => m.headDistanceCm)
      .filter((d): d is number => d !== null);
    const baseline: Baseline = {
      scaleRatio: median(all.map((m) => m.scaleRatio)),
      neckRise: median(all.map((m) => m.neckRise)),
      headPitch: median(all.map((m) => m.headPitch)),
      shoulderTilt: median(all.map((m) => m.shoulderTilt)),
      headRoll: median(all.map((m) => m.headRoll)),
      shoulderY: median(all.map((m) => m.shoulderY)),
      shoulderWidth: median(all.map((m) => m.shoulderWidth)),
      headDistanceCm: distances.length
        ? median(distances)
        : DEFAULT_HEAD_DISTANCE_CM,
      capturedAt: Date.now(),
    };
    return { state: 'done', baseline };
  }
}

export function isStable(ms: RawMetrics[]): boolean {
  const rel = (vals: number[]) =>
    stdDev(vals) / Math.max(1e-6, Math.abs(median(vals)));
  return (
    rel(ms.map((m) => m.scaleRatio)) <= STABILITY.scaleRatio &&
    rel(ms.map((m) => m.neckRise)) <= STABILITY.neckRise &&
    stdDev(ms.map((m) => m.headPitch)) <= STABILITY.headPitch
  );
}

export function isValidBaseline(b: unknown): b is Baseline {
  if (!b || typeof b !== 'object') return false;
  const o = b as Record<string, unknown>;
  return (
    [
      'scaleRatio',
      'neckRise',
      'headPitch',
      'shoulderTilt',
      'shoulderY',
      'shoulderWidth',
      'headDistanceCm',
    ].every(
      (k) => typeof o[k] === 'number' && Number.isFinite(o[k] as number)
    ) &&
    (o.scaleRatio as number) > 0 &&
    (o.neckRise as number) > 0 &&
    (o.shoulderWidth as number) > 0 &&
    (o.headDistanceCm as number) > 0
  );
}
