import {
  IDEAL_RIG,
  solveSkeleton,
  type RigParams,
  type Skeleton,
  type Vec2,
} from '@/core/rig';

/** シェーダーへ渡す、横から見た人体の骨組み（cm） */
export interface SceneAnchors {
  skeleton: Skeleton;
  /** 胴体の楕円体（中心 x, y と傾き） */
  torso: [number, number, number][];
  neckBase: Vec2;
  elbow: Vec2;
  wrist: Vec2;
  /** 上体の側屈と、上体に対する頭の側屈（ラジアン, 体の右 = +z が正） */
  leanRad: number;
  headRollRad: number;
}

const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
/** 前傾角 a の座標系での (前, 上) オフセットをワールドへ */
const local = (a: number, fwd: number, up: number): Vec2 => ({
  x: fwd * Math.cos(a) + up * Math.sin(a),
  y: -fwd * Math.sin(a) + up * Math.cos(a),
});

export function buildAnchors(rig: RigParams): SceneAnchors {
  const s = solveSkeleton(rig);
  const v = s.vertebrae;
  // 椎体は体の後ろ寄りにあるため、胴体の中心は椎体から前方へずらす
  const torsoAt = (
    i: number,
    fwd: number,
    up = 0
  ): [number, number, number] => {
    const p = add(v[i], local(v[i].angle, fwd, up));
    return [p.x, p.y, v[i].angle];
  };
  const torso: [number, number, number][] = [
    [s.sacrum.x + 6.5, s.sacrum.y + 1.5, 0.12],
    torsoAt(2, 5.2),
    torsoAt(7, 5.8),
    torsoAt(11, 5.6),
    torsoAt(15, 3.6, 0.5),
  ];
  const neckBase = add(s.c7, local(v[16].angle, 2.6, 0.4));
  const elbow = { x: s.acromion.x + 5.5 + rig.shoulderProtractCm, y: 23.5 };
  const wrist = { x: 33.5, y: 31.2 };
  return {
    skeleton: s,
    torso,
    neckBase,
    elbow,
    wrist,
    leanRad: (rig.leanDeg * Math.PI) / 180,
    headRollRad: (rig.headRollDeg * Math.PI) / 180,
  };
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** シェーダーの bend() の順変換（上方の点を +z へ倒す）。オーバーレイの位置合わせ用 */
export function bendPoint(
  p: [number, number, number],
  leanRad: number
): [number, number, number] {
  const a = leanRad * smoothstep(14, 62, p[1]);
  const y = p[1] - 12;
  return [
    p[0],
    y * Math.cos(a) - p[2] * Math.sin(a) + 12,
    y * Math.sin(a) + p[2] * Math.cos(a),
  ];
}

export const IDEAL_ANCHORS = buildAnchors(IDEAL_RIG);

export interface OrbitCamera {
  yaw: number;
  pitch: number;
  distance: number;
  target: [number, number, number];
  fovDeg: number;
}

export const DEFAULT_CAMERA: OrbitCamera = {
  yaw: 0.18,
  pitch: 0.05,
  distance: 228,
  target: [16, 40, 0],
  fovDeg: 30,
};

export interface CameraBasis {
  pos: [number, number, number];
  right: [number, number, number];
  up: [number, number, number];
  fwd: [number, number, number];
  focal: number;
}

const norm = (v: number[]) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l] as [number, number, number];
};
const cross = (a: number[], b: number[]) =>
  [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ] as [number, number, number];

/** yaw 0 で人物の右側面（+z）から見る */
export function cameraBasis(c: OrbitCamera): CameraBasis {
  const pos: [number, number, number] = [
    c.target[0] + c.distance * Math.sin(c.yaw) * Math.cos(c.pitch),
    c.target[1] + c.distance * Math.sin(c.pitch),
    c.target[2] + c.distance * Math.cos(c.yaw) * Math.cos(c.pitch),
  ];
  const fwd = norm([
    c.target[0] - pos[0],
    c.target[1] - pos[1],
    c.target[2] - pos[2],
  ]);
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  return {
    pos,
    right,
    up,
    fwd,
    focal: 1 / Math.tan((c.fovDeg * Math.PI) / 360),
  };
}

/** ワールド座標 → CSS ピクセル（シェーダーと同じ投影） */
export function projectPoint(
  b: CameraBasis,
  p: [number, number, number],
  width: number,
  height: number
) {
  const d = [p[0] - b.pos[0], p[1] - b.pos[1], p[2] - b.pos[2]];
  const z = d[0] * b.fwd[0] + d[1] * b.fwd[1] + d[2] * b.fwd[2];
  const x = d[0] * b.right[0] + d[1] * b.right[1] + d[2] * b.right[2];
  const y = d[0] * b.up[0] + d[1] * b.up[1] + d[2] * b.up[2];
  const scale = (b.focal * height) / 2 / z;
  return { x: width / 2 + x * scale, y: height / 2 - y * scale, depth: z };
}
