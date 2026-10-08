/** MediaPipe の正規化ランドマーク（x, y は 0..1、z は x と同じスケールの相対深度） */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/** 1フレーム分の推定結果。vision エンジンからコアロジックへの唯一の入力 */
export interface VisionFrame {
  timestamp: number;
  width: number;
  height: number;
  pose: Landmark[] | null;
  face: Landmark[] | null;
  /** 顔のメトリック姿勢（4x4, column-major, 単位 cm） */
  faceMatrix: number[] | null;
}

export type FrameIssue =
  | 'no_person'
  | 'no_face'
  | 'shoulders_hidden'
  | 'turned_away'
  | 'body_rotated';

/** 1フレームから抽出した、姿勢に関係する生の計測値 */
export interface RawMetrics {
  /** 肩幅（px） */
  shoulderWidth: number;
  /** 顔の幅（3D 距離, px） */
  faceWidth: number;
  /** 顔の幅 / 肩幅。頭が肩より前（カメラ側）に出るほど大きくなる */
  scaleRatio: number;
  /** 肩の中点から耳の中点までの高さ / 肩幅。首・背中が沈むほど小さくなる */
  neckRise: number;
  /** 頭の前後傾き（度, 下向きが正） */
  headPitch: number;
  /** 頭の左右回転（度） */
  headYaw: number;
  /** 肩のラインの傾き（度） */
  shoulderTilt: number;
  /** 肩の中点の画面内高さ（px） */
  shoulderY: number;
  /** カメラから頭までの推定距離（cm） */
  headDistanceCm: number | null;
}

export type FrameResult =
  | { ok: true; metrics: RawMetrics }
  | { ok: false; issue: FrameIssue };

/** キャリブレーションで得る「本人の良い姿勢」 */
export interface Baseline {
  scaleRatio: number;
  neckRise: number;
  headPitch: number;
  shoulderTilt: number;
  shoulderY: number;
  shoulderWidth: number;
  headDistanceCm: number;
  capturedAt: number;
}

export type Sensitivity = 'gentle' | 'standard' | 'strict';

export type PosturePattern =
  | 'straight_neck'
  | 'text_neck'
  | 'neck_hunch'
  | 'slouch'
  | 'lean';

export type PostureLevel = 'good' | 'fair' | 'poor';

/** 基準姿勢との差分を、人が理解できる物理量に変換したもの */
export interface PostureDeviation {
  /** 頭の前方突出（cm, 前が正） */
  headForwardCm: number;
  /** うつむき角度の増加（度, 下向きが正） */
  headDownDeg: number;
  /** 首〜背中の沈み込み（0..1, 基準からの縮み率） */
  compression: number;
  /** 上体の沈み込み（肩幅比） */
  trunkDrop: number;
  /** 左右の傾き（度, 絶対値） */
  tiltDeg: number;
}

export interface Severities {
  forward: number;
  down: number;
  slump: number;
  lean: number;
}

export interface PostureAssessment {
  deviation: PostureDeviation;
  severity: Severities;
  /** 0..100 */
  score: number;
  level: PostureLevel;
  pattern: PosturePattern | null;
  /** 首にかかる負担の目安（kg） */
  neckLoadKg: number;
  /** 首の前傾の目安（度） */
  neckFlexDeg: number;
}
