import type {
  Baseline,
  PostureAssessment,
  PostureDeviation,
  PostureLevel,
  PosturePattern,
  RawMetrics,
  Sensitivity,
  Severities,
} from './types';

const SENSITIVITY_SCALE: Record<Sensitivity, number> = {
  gentle: 1.35,
  standard: 1,
  strict: 0.75,
};

/** 各成分の「気にならない上限」と「明確に悪い」値（標準感度） */
export const THRESHOLDS = {
  forwardCm: [1.5, 6],
  downDeg: [7, 25],
  slump: [0.05, 0.22],
  tiltDeg: [4, 12],
} as const;

/** これ以上なら「注意」、POOR_AT 以上なら「要改善」 */
export const FAIR_AT = 0.3;
export const POOR_AT = 0.6;

/** 耳の高さの点は首の回転中心より前にあるため、うつむくと少し下がる。その分を差し引く係数 */
const PITCH_DROP_COMPENSATION = 0.2;
/** 首の付け根（C7）から耳までのおおよその長さ（cm） */
const NECK_LENGTH_CM = 14;
/** 着座位置がこれ以上ずれたら、肩の画面内高さは比較に使わない */
const TRUNK_SAME_SEAT_TOLERANCE = 0.15;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ramp = (v: number, start: number, end: number) =>
  clamp01((v - start) / (end - start));
const DEG = Math.PI / 180;

export function computeDeviation(m: RawMetrics, b: Baseline): PostureDeviation {
  // 顔と肩の見かけの大きさの比は「頭と肩の、カメラからの距離の比」に比例する。
  // 肩の位置が同じなら Δ = D0 (1 - r0 / r) で頭の前進量（cm）が求まる。
  const headForwardCm = b.headDistanceCm * (1 - b.scaleRatio / m.scaleRatio);
  const headDownDeg = m.headPitch - b.headPitch;
  const rawCompression = 1 - m.neckRise / b.neckRise;
  const compression =
    rawCompression -
    PITCH_DROP_COMPENSATION * Math.sin(Math.max(0, headDownDeg) * DEG);
  const sameSeat =
    Math.abs(m.shoulderWidth / b.shoulderWidth - 1) <=
    TRUNK_SAME_SEAT_TOLERANCE;
  const trunkDrop = sameSeat
    ? (m.shoulderY - b.shoulderY) / b.shoulderWidth
    : 0;
  const tiltDeg = Math.abs(m.shoulderTilt - b.shoulderTilt);
  return { headForwardCm, headDownDeg, compression, trunkDrop, tiltDeg };
}

export function computeSeverities(
  d: PostureDeviation,
  sensitivity: Sensitivity
): Severities {
  const k = SENSITIVITY_SCALE[sensitivity];
  const slumpIndex =
    d.compression + 0.5 * Math.min(0.3, Math.max(0, d.trunkDrop));
  return {
    forward: ramp(
      d.headForwardCm,
      THRESHOLDS.forwardCm[0] * k,
      THRESHOLDS.forwardCm[1] * k
    ),
    down: ramp(
      d.headDownDeg,
      THRESHOLDS.downDeg[0] * k,
      THRESHOLDS.downDeg[1] * k
    ),
    slump: ramp(slumpIndex, THRESHOLDS.slump[0] * k, THRESHOLDS.slump[1] * k),
    lean: ramp(d.tiltDeg, THRESHOLDS.tiltDeg[0] * k, THRESHOLDS.tiltDeg[1] * k),
  };
}

export function classifyPattern(s: Severities): PosturePattern | null {
  const { forward: f, down, slump, lean } = s;
  const neckMax = Math.max(f, down, slump);
  if (neckMax < FAIR_AT) return lean >= FAIR_AT ? 'lean' : null;
  if (down >= FAIR_AT && down >= f && down >= slump) return 'text_neck';
  if (f >= FAIR_AT && slump >= FAIR_AT) return 'neck_hunch';
  return f >= slump ? 'straight_neck' : 'slouch';
}

/** 首を前に倒した角度と頭の重さによる負担の目安（Hansraj 2014 の値を補間） */
const NECK_LOAD_TABLE: [number, number][] = [
  [0, 5],
  [15, 12.2],
  [30, 18.1],
  [45, 22.2],
  [60, 27.2],
];

export function neckLoadKg(flexDeg: number): number {
  const a = Math.min(60, Math.max(0, flexDeg));
  for (let i = 1; i < NECK_LOAD_TABLE.length; i += 1) {
    const [a1, l1] = NECK_LOAD_TABLE[i];
    if (a <= a1) {
      const [a0, l0] = NECK_LOAD_TABLE[i - 1];
      return l0 + ((a - a0) / (a1 - a0)) * (l1 - l0);
    }
  }
  return NECK_LOAD_TABLE[NECK_LOAD_TABLE.length - 1][1];
}

export function estimateNeckFlexDeg(d: PostureDeviation): number {
  const forwardAngle =
    Math.asin(Math.min(0.95, Math.max(0, d.headForwardCm / NECK_LENGTH_CM))) /
    DEG;
  return Math.min(
    60,
    Math.max(0, forwardAngle + 0.7 * Math.max(0, d.headDownDeg))
  );
}

export function levelFor(maxSeverity: number): PostureLevel {
  if (maxSeverity >= POOR_AT) return 'poor';
  if (maxSeverity >= FAIR_AT) return 'fair';
  return 'good';
}

export function assess(
  m: RawMetrics,
  b: Baseline,
  sensitivity: Sensitivity
): PostureAssessment {
  const deviation = computeDeviation(m, b);
  const severity = computeSeverities(deviation, sensitivity);
  // 左右の傾きは首・背中への影響が小さいため重みを下げる
  const weighted = [
    severity.forward,
    severity.down,
    severity.slump,
    severity.lean * 0.6,
  ].sort((a, b2) => b2 - a);
  const badness = clamp01(weighted[0] * 0.8 + weighted[1] * 0.2);
  const neckFlexDeg = estimateNeckFlexDeg(deviation);
  return {
    deviation,
    severity,
    score: Math.round(100 * (1 - badness)),
    level: levelFor(weighted[0]),
    pattern: classifyPattern(severity),
    neckFlexDeg,
    neckLoadKg: neckLoadKg(neckFlexDeg),
  };
}
