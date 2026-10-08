import type { FrameResult, Landmark, VisionFrame } from './types';

/** MediaPipe Pose のランドマーク番号 */
export const POSE = {
  nose: 0,
  leftEar: 7,
  rightEar: 8,
  leftShoulder: 11,
  rightShoulder: 12,
} as const;

/** MediaPipe Face Mesh のランドマーク番号 */
export const FACE = {
  forehead: 10,
  chin: 152,
  noseTip: 1,
  /** 顔の輪郭のうち耳の高さにある左右の点 */
  sideA: 234,
  sideB: 454,
} as const;

const MIN_SHOULDER_VISIBILITY = 0.5;
const MAX_HEAD_YAW_DEG = 32;
/** 肩の前後差 / 肩幅。これを超えると体がカメラに対して斜めを向いている */
const MAX_SHOULDER_DEPTH_RATIO = 0.75;

const RAD = 180 / Math.PI;
/** 一般的な Web カメラ（水平画角 60° 前後）の焦点距離 / 画像幅 */
const FOCAL_RATIO = 0.87;

const isFiniteLandmark = (p: Landmark | undefined): p is Landmark =>
  !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

const inFrame = (p: Landmark) =>
  p.x > 0.005 && p.x < 0.995 && p.y > 0.005 && p.y < 0.985;

/** セットアップ画面用: 両肩がフレーム内に見えているか */
export function shouldersVisible(pose: Landmark[] | null): boolean {
  if (!pose) return false;
  return [pose[POSE.leftShoulder], pose[POSE.rightShoulder]].every(
    (p) =>
      isFiniteLandmark(p) &&
      (p.visibility ?? 1) >= MIN_SHOULDER_VISIBILITY &&
      inFrame(p)
  );
}

export interface HeadPose {
  pitch: number;
  yaw: number;
  distanceCm: number | null;
}

/**
 * 顔のメトリック変換行列から頭の向きと距離を求める。
 * 行列は column-major が仕様だが、念のため平行移動成分の位置で行/列の並びを判定する。
 */
export function headPoseFromMatrix(
  data: number[] | null | undefined
): HeadPose | null {
  if (!data || data.length !== 16 || !data.every(Number.isFinite)) return null;
  const rowMajor =
    Math.abs(data[3]) + Math.abs(data[7]) + Math.abs(data[11]) >
    Math.abs(data[12]) + Math.abs(data[13]) + Math.abs(data[14]);
  // m(row, col)
  const m = (r: number, c: number) =>
    rowMajor ? data[r * 4 + c] : data[c * 4 + r];
  // 顔モデルの正面方向 (0,0,1) を回転した結果 = 回転行列の第3列
  const fx = m(0, 2);
  const fy = m(1, 2);
  const fz = m(2, 2);
  const pitch = Math.atan2(-fy, Math.hypot(fx, fz)) * RAD;
  const yaw = Math.atan2(fx, fz) * RAD;
  const tz = m(2, 3);
  const distanceCm =
    Number.isFinite(tz) && Math.abs(tz) > 10 && Math.abs(tz) < 300
      ? Math.abs(tz)
      : null;
  return { pitch, yaw, distanceCm };
}

/** 変換行列が無い場合のフォールバック: 顔メッシュの額→顎ベクトルと鼻の位置から求める */
export function headPoseFromLandmarks(
  face: Landmark[],
  width: number,
  height: number
): HeadPose | null {
  const top = face[FACE.forehead];
  const chin = face[FACE.chin];
  const a = face[FACE.sideA];
  const b = face[FACE.sideB];
  const nose = face[FACE.noseTip];
  if (![top, chin, a, b, nose].every(isFiniteLandmark)) return null;
  const dy = (chin.y - top.y) * height;
  const dz = (chin.z - top.z) * width;
  // 下を向くと顎が奥（z 大）へ、額が手前へ動く
  const pitch = Math.atan2(dz, dy) * RAD;
  const sideDx = (b.x - a.x) * width;
  const sideDz = (b.z - a.z) * width;
  const yaw = Math.atan2(sideDz, Math.abs(sideDx)) * RAD;
  return { pitch, yaw, distanceCm: null };
}

/**
 * 1フレームから姿勢判定に使う計測値を抽出する。
 * 信頼できないフレーム（肩が映っていない・横を向いている等）は理由付きで棄却し、
 * 誤った値で判定しないようにする。
 */
export function extractMetrics(frame: VisionFrame): FrameResult {
  const { pose, face, width, height } = frame;
  if (!pose || pose.length < 13)
    return { ok: false, issue: face ? 'shoulders_hidden' : 'no_person' };
  if (!face || face.length <= FACE.sideB)
    return { ok: false, issue: 'no_face' };

  const ls = pose[POSE.leftShoulder];
  const rs = pose[POSE.rightShoulder];
  if (
    !isFiniteLandmark(ls) ||
    !isFiniteLandmark(rs) ||
    (ls.visibility ?? 1) < MIN_SHOULDER_VISIBILITY ||
    (rs.visibility ?? 1) < MIN_SHOULDER_VISIBILITY ||
    !inFrame(ls) ||
    !inFrame(rs)
  ) {
    return { ok: false, issue: 'shoulders_hidden' };
  }

  const fa = face[FACE.sideA];
  const fb = face[FACE.sideB];
  if (!isFiniteLandmark(fa) || !isFiniteLandmark(fb))
    return { ok: false, issue: 'no_face' };

  const head =
    headPoseFromMatrix(frame.faceMatrix) ??
    headPoseFromLandmarks(face, width, height);
  if (!head || !Number.isFinite(head.pitch) || !Number.isFinite(head.yaw))
    return { ok: false, issue: 'no_face' };
  if (Math.abs(head.yaw) > MAX_HEAD_YAW_DEG)
    return { ok: false, issue: 'turned_away' };

  const sdx = (ls.x - rs.x) * width;
  const sdy = (ls.y - rs.y) * height;
  const shoulderWidth = Math.hypot(sdx, sdy);
  if (shoulderWidth < width * 0.08)
    return { ok: false, issue: 'shoulders_hidden' };

  const depthRatio =
    Math.abs(ls.z - rs.z) / Math.max(1e-6, Math.abs(ls.x - rs.x));
  if (depthRatio > MAX_SHOULDER_DEPTH_RATIO)
    return { ok: false, issue: 'body_rotated' };

  // 顔幅は z を含む 3D 距離にして、首振りによる見かけの縮みを打ち消す
  const faceWidth = Math.hypot(
    (fb.x - fa.x) * width,
    (fb.y - fa.y) * height,
    (fb.z - fa.z) * width
  );
  if (!(faceWidth > 1)) return { ok: false, issue: 'no_face' };

  const shoulderMidY = ((ls.y + rs.y) / 2) * height;
  const earMidY = ((fa.y + fb.y) / 2) * height;

  // 画像上の左右に依存しないよう、常に「画面左→右」の向きで傾きを測る
  const [left, right] = ls.x < rs.x ? [ls, rs] : [rs, ls];
  const shoulderTilt =
    Math.atan2((right.y - left.y) * height, (right.x - left.x) * width) * RAD;
  // 頭の傾きは耳の高さの顔輪郭2点で測る（うつむき・首振りでは高さの差が生じない）。
  // 首を振るとカメラに近い側が大きく写って傾いて見えるため、奥行きで透視を打ち消す
  const unproject = (p: Landmark) => {
    const s = 1 + p.z / FOCAL_RATIO;
    return { x: (p.x - 0.5) * width * s, y: (p.y - 0.5) * height * s };
  };
  const [faceL, faceR] = (fa.x < fb.x ? [fa, fb] : [fb, fa]).map(unproject);
  const headRoll = Math.atan2(faceR.y - faceL.y, faceR.x - faceL.x) * RAD;

  return {
    ok: true,
    metrics: {
      shoulderWidth,
      faceWidth,
      scaleRatio: faceWidth / shoulderWidth,
      neckRise: (shoulderMidY - earMidY) / shoulderWidth,
      headPitch: head.pitch,
      headYaw: head.yaw,
      shoulderTilt,
      headRoll,
      shoulderY: shoulderMidY,
      headDistanceCm: head.distanceCm,
    },
  };
}
