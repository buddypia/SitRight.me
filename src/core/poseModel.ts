/** 姿勢推定モデル。lite は軽く読み込みが速い、full は関節位置の精度が高い */
export const POSE_MODELS = ['lite', 'full'] as const;
export type PoseModel = (typeof POSE_MODELS)[number];
export const DEFAULT_POSE_MODEL: PoseModel = 'lite';

export function isPoseModel(value: unknown): value is PoseModel {
  return POSE_MODELS.includes(value as PoseModel);
}

export function poseModelPath(model: PoseModel): string {
  return `/mediapipe/models/pose_landmarker_${model}.task`;
}
