import type { PostureDeviation } from './types';

/**
 * 横から見た姿勢モデル（単位 cm, x: 前, y: 上, 矢状面）。
 * 正面カメラの計測値（頭の前進量・うつむき・沈み込み）から、
 * 背骨の曲線と頭の位置を解いて 3D 表示とガイド線に使う。
 */
export interface RigParams {
  /** 胸椎の追加の丸まり（度） */
  thoracicFlexDeg: number;
  /** 頭の前方突出（cm, 肩基準） */
  headForwardCm: number;
  /** 頭の前後傾き（度, 下向きが正） */
  headPitchDeg: number;
  /** 肩の巻き込み（cm） */
  shoulderProtractCm: number;
}

export const IDEAL_RIG: RigParams = {
  thoracicFlexDeg: 0,
  headForwardCm: 0,
  headPitchDeg: 0,
  shoulderProtractCm: 0,
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const DEG = Math.PI / 180;

export function rigFromDeviation(d: PostureDeviation): RigParams {
  const slump = clamp(
    (d.compression + 0.5 * clamp(d.trunkDrop, 0, 0.3)) / 0.28,
    -0.3,
    1.2
  );
  return {
    thoracicFlexDeg: slump * 30,
    headForwardCm: clamp(d.headForwardCm, -4, 10),
    headPitchDeg: clamp(d.headDownDeg, -30, 55),
    shoulderProtractCm: clamp(slump, 0, 1) * 3.2,
  };
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vertebra {
  x: number;
  y: number;
  /** 椎体の傾き（ラジアン, 前傾が正） */
  angle: number;
  /** 0: 頸椎, 1: 胸椎, 2: 腰椎 */
  region: 0 | 1 | 2;
  /** 椎体の高さ・奥行き（cm） */
  height: number;
  depth: number;
}

export interface Skeleton {
  sacrum: Vec2;
  t12: Vec2;
  c7: Vec2;
  /** 頭の回転中心（後頭顆） */
  skullPivot: Vec2;
  /** 耳（外耳孔）の位置。理想は肩峰の真上 */
  ear: Vec2;
  /** 肩峰（肩の先端） */
  acromion: Vec2;
  /** 頭の回転（ラジアン, 下向きが正） */
  headAngle: number;
  /** 胸郭の向き（ラジアン, 前傾が正） */
  thoraxAngle: number;
  vertebrae: Vertebra[];
}

const LUMBAR_LEN = 17;
const THORACIC_LEN = 28;
const CERVICAL_LEN = 12;
const SACRUM: Vec2 = { x: -7, y: 11 };

/** 方向角（鉛直から前方へ）の列に沿って点列を積み上げる */
function walk(
  start: Vec2,
  length: number,
  count: number,
  angleAt: (t: number) => number
) {
  const seg = length / count;
  const pts: { x: number; y: number; angle: number }[] = [];
  let p = { ...start };
  for (let i = 0; i < count; i += 1) {
    const a = angleAt((i + 0.5) / count);
    const next = { x: p.x + Math.sin(a) * seg, y: p.y + Math.cos(a) * seg };
    pts.push({ x: (p.x + next.x) / 2, y: (p.y + next.y) / 2, angle: a });
    p = next;
  }
  return { pts, end: p, endAngle: angleAt(1) };
}

const rotate = (v: Vec2, a: number): Vec2 => ({
  // 前傾（時計回り, x 前）を正とする回転
  x: v.x * Math.cos(a) + v.y * Math.sin(a),
  y: -v.x * Math.sin(a) + v.y * Math.cos(a),
});

const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

/** 耳（外耳孔）は後頭顆からわずかに前上方 */
const EAR_FROM_PIVOT: Vec2 = { x: 1.2, y: 1.6 };

function cervical(
  c7: Vec2,
  baseAngle: number,
  lordosis: number,
  headAngle: number
) {
  // 頸椎前弯: 付け根では前傾し、上に行くほど起き上がる。lordosis が 0 でストレートネック
  const neck = walk(c7, CERVICAL_LEN, 7, (t) => baseAngle - lordosis * t);
  const ear = add(neck.end, rotate(EAR_FROM_PIVOT, headAngle));
  return { neck, ear };
}

export function solveSkeleton(p: RigParams): Skeleton {
  const flex = p.thoracicFlexDeg * DEG;
  const lumbar = walk(
    SACRUM,
    LUMBAR_LEN,
    5,
    (t) => (14 - 26 * t + 6 * Math.max(0, p.thoracicFlexDeg / 30)) * DEG
  );
  const thoracic = walk(
    lumbar.end,
    THORACIC_LEN,
    12,
    (t) => (-12 + 40 * t) * DEG + flex * (0.25 + 0.75 * t)
  );
  const c7 = thoracic.end;
  const thoraxAngle = thoracic.endAngle - 25 * DEG;

  const acromion = add(
    c7,
    rotate({ x: 2 + p.shoulderProtractCm, y: -3.4 }, thoraxAngle * 0.6)
  );
  const headAngle = p.headPitchDeg * DEG;

  // 理想姿勢で耳が肩峰の真上に来る頸椎の角度を基準に、計測した前進量を満たす角度を二分探索で解く
  const targetX = acromion.x + 0.4 + p.headForwardCm;
  const straighten = Math.min(1, Math.max(0, p.headForwardCm / 7));
  const lordosis = 24 * DEG * (1 - 0.85 * straighten);
  let lo = -40 * DEG;
  let hi = 88 * DEG;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (cervical(c7, mid, lordosis, headAngle).ear.x < targetX) lo = mid;
    else hi = mid;
  }
  const { neck, ear } = cervical(c7, (lo + hi) / 2, lordosis, headAngle);

  const toVertebrae = (
    pts: { x: number; y: number; angle: number }[],
    region: 0 | 1 | 2,
    size: (t: number) => [number, number]
  ): Vertebra[] =>
    pts.map((q, i) => {
      const [height, depth] = size(i / Math.max(1, pts.length - 1));
      return { x: q.x, y: q.y, angle: q.angle, region, height, depth };
    });

  const vertebrae = [
    ...toVertebrae(lumbar.pts, 2, (t) => [2.7 - 0.2 * t, 3.6 - 0.3 * t]),
    ...toVertebrae(thoracic.pts, 1, (t) => [2.1 - 0.4 * t, 3.0 - 0.9 * t]),
    ...toVertebrae(neck.pts, 0, (t) => [1.35 - 0.1 * t, 1.8 - 0.2 * t]),
  ];

  return {
    sacrum: SACRUM,
    t12: lumbar.end,
    c7,
    skullPivot: neck.end,
    ear,
    acromion,
    headAngle,
    thoraxAngle,
    vertebrae,
  };
}
