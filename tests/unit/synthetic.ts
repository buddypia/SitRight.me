import type { Landmark, VisionFrame } from '@/core/types';

/**
 * ピンホールカメラで、頭と肩の 3D 位置から MediaPipe 互換のランドマークを合成する。
 * 座標: カメラ原点, X 右, Y 上, Z 奥（cm）。
 */
export interface Scene {
  /** 頭（耳の高さの顔輪郭の中心）の位置 */
  head: { x: number; y: number; z: number };
  /** 頭の下向き角度（度） */
  pitch?: number;
  /** 頭の左右回転（度） */
  yaw?: number;
  /** 頭の左右の傾き（度, 本人の右へ傾くと正） */
  roll?: number;
  shoulders: { x: number; y: number; z: number };
  shoulderHalfWidth?: number;
  /** 肩の左右の前後差（cm）。体の回転を表す */
  shoulderDepthSkew?: number;
  /** 肩のラインの傾き（度, 本人の右肩が下がると正） */
  shoulderTilt?: number;
}

const W = 1280;
const H = 720;
const FOV_DEG = 60;
const F = W / 2 / Math.tan((FOV_DEG / 2) * (Math.PI / 180));

const project = (X: number, Y: number, Z: number, zRef: number): Landmark => ({
  x: (F * X) / Z / W + 0.5,
  y: (-F * Y) / Z / H + 0.5,
  z: ((Z - zRef) * F) / zRef / W,
  visibility: 0.99,
});

export function uprightScene(): Scene {
  return {
    head: { x: 0, y: 8, z: 62 },
    shoulders: { x: 0, y: -14, z: 65 },
  };
}

export function synthFrame(s: Scene): VisionFrame {
  const pitch = ((s.pitch ?? 0) * Math.PI) / 180;
  const yaw = ((s.yaw ?? 0) * Math.PI) / 180;
  const roll = ((s.roll ?? 0) * Math.PI) / 180;
  const tilt = ((s.shoulderTilt ?? 0) * Math.PI) / 180;
  const half = s.shoulderHalfWidth ?? 19;
  const skew = s.shoulderDepthSkew ?? 0;

  // 顔の点（頭中心からの相対, 顔ローカル: x 右, y 上, z 手前が負）
  const local: Record<number, [number, number, number]> = {
    234: [-7.5, 0, 0],
    454: [7.5, 0, 0],
    10: [0, 9, -8],
    152: [0, -10, -6],
    1: [0, -1, -11],
  };
  const face: Landmark[] = Array.from({ length: 478 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
  }));
  const rot = ([x0, y0, z]: [number, number, number]): [
    number,
    number,
    number,
  ] => {
    // roll: 本人の右（カメラ座標の -x）へ傾く = 頭頂が -x へ
    const x = x0 * Math.cos(roll) - y0 * Math.sin(roll);
    const y = x0 * Math.sin(roll) + y0 * Math.cos(roll);
    // pitch: 下向き = 顔の前方（-z）が下（-y）へ
    const y1 = y * Math.cos(pitch) + z * Math.sin(pitch);
    const z1 = -y * Math.sin(pitch) + z * Math.cos(pitch);
    const x2 = x * Math.cos(yaw) + z1 * Math.sin(yaw);
    const z2 = -x * Math.sin(yaw) + z1 * Math.cos(yaw);
    return [x2, y1, z2];
  };
  for (const [idx, p] of Object.entries(local)) {
    const [x, y, z] = rot(p);
    face[Number(idx)] = project(
      s.head.x + x,
      s.head.y + y,
      s.head.z + z,
      s.head.z
    );
  }

  const pose: Landmark[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 0.9,
  }));
  const sz = s.shoulders.z;
  // 被写体の左肩は画像の右側（鏡像ではないカメラ）
  // 本人の右肩（カメラ座標の -x 側）が下がると tilt が正
  const dy = half * Math.sin(tilt);
  pose[11] = project(
    s.shoulders.x + half,
    s.shoulders.y + dy,
    sz + skew / 2,
    sz
  );
  pose[12] = project(
    s.shoulders.x - half,
    s.shoulders.y - dy,
    sz - skew / 2,
    sz
  );

  // MediaPipe の顔変換行列（column-major, y 上, カメラは -Z を向く OpenGL 系）
  // 顔の正面方向（カメラへ向く = 本テスト座標で -Z）を MediaPipe 座標（Z 反転）に変換したものが第3列
  const f = rot([0, 0, -1]);
  const r2 = [f[0], f[1], -f[2]];
  const faceMatrix = [
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    r2[0],
    r2[1],
    r2[2],
    0,
    s.head.x,
    s.head.y,
    -s.head.z,
    1,
  ];
  return { timestamp: 0, width: W, height: H, pose, face, faceMatrix };
}
