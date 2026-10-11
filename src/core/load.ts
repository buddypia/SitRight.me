import { IDEAL_RIG, solveSkeleton, type RigParams, type Skeleton } from './rig';

/**
 * 首（頸椎）にかかる負荷の目安。
 * Hansraj (2014) "Assessment of stresses in the cervical spine caused by posture
 * and position of the head" の前傾角ごとの換算重量（0°: 10–12 lb … 60°: 60 lb）を kg にし、
 * その間を線形補間する。
 */
const HANSRAJ_KG: [deg: number, kg: number][] = [
  [0, 5],
  [15, 12.2],
  [30, 18.1],
  [45, 22.2],
  [60, 27.2],
];

/** 頭の重さ（kg, 成人の目安） */
export const HEAD_KG = HANSRAJ_KG[0][1];

/** 頸椎の付け根（C7）から耳への向き（鉛直から前方へ, 度） */
const neckLineDeg = (s: Skeleton) =>
  (Math.atan2(s.ear.x - s.c7.x, s.ear.y - s.c7.y) * 180) / Math.PI;

const IDEAL_NECK_DEG = neckLineDeg(solveSkeleton(IDEAL_RIG));

/** 理想姿勢からの首の前傾（度）。頭の突き出しと頭の下向きを合わせる */
export function neckFlexionDeg(rig: RigParams): number {
  const s = solveSkeleton(rig);
  return Math.max(0, neckLineDeg(s) - IDEAL_NECK_DEG + rig.headPitchDeg);
}

/** 首にかかる負荷（kg 換算） */
export function neckLoadKg(rig: RigParams): number {
  const deg = neckFlexionDeg(rig);
  for (let i = 1; i < HANSRAJ_KG.length; i += 1) {
    const [d1, k1] = HANSRAJ_KG[i];
    if (deg <= d1) {
      const [d0, k0] = HANSRAJ_KG[i - 1];
      return k0 + ((k1 - k0) * (deg - d0)) / (d1 - d0);
    }
  }
  return HANSRAJ_KG[HANSRAJ_KG.length - 1][1];
}
