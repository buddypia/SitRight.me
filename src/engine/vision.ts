import type { FaceLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { VisionFrame } from '@/core/types';

const WASM_PATH = '/mediapipe/wasm';
const POSE_MODEL = '/mediapipe/models/pose_landmarker_full.task';
const FACE_MODEL = '/mediapipe/models/face_landmarker.task';

type Delegate = 'GPU' | 'CPU';

let consoleFiltered = false;
/** MediaPipe は情報ログを console.error に出すため、その1種類だけを抑制する */
function filterMediapipeInfoLogs() {
  if (consoleFiltered || typeof console === 'undefined') return;
  consoleFiltered = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].startsWith('INFO: Created TensorFlow Lite')
    )
      return;
    original(...args);
  };
}

/**
 * MediaPipe の Pose / Face Landmarker をまとめたラッパー。
 * GPU で初期化できない環境（WebGL 不可・一部の仮想環境）では CPU にフォールバックする。
 */
export class VisionEngine {
  private pose: PoseLandmarker | null = null;
  private face: FaceLandmarker | null = null;
  private lastTimestamp = 0;
  delegate: Delegate | null = null;

  async init(): Promise<void> {
    if (this.pose && this.face) return;
    filterMediapipeInfoLogs();
    const { FilesetResolver, PoseLandmarker, FaceLandmarker } =
      await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

    const create = async (delegate: Delegate) => {
      const [pose, face] = await Promise.all([
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: POSE_MODEL, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        }),
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_MODEL, delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFacialTransformationMatrixes: true,
        }),
      ]);
      return { pose, face };
    };

    let created;
    try {
      created = await create('GPU');
      this.delegate = 'GPU';
    } catch (error) {
      console.warn(
        '[vision] GPU delegate unavailable, falling back to CPU',
        error
      );
      created = await create('CPU');
      this.delegate = 'CPU';
    }
    this.pose = created.pose;
    this.face = created.face;
  }

  get ready(): boolean {
    return this.pose !== null && this.face !== null;
  }

  detect(
    source:
      HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    width: number,
    height: number
  ): VisionFrame | null {
    if (!this.pose || !this.face || !width || !height) return null;
    // VIDEO モードはタイムスタンプが単調増加である必要がある
    const now = Math.max(performance.now(), this.lastTimestamp + 1);
    this.lastTimestamp = now;
    const poseResult = this.pose.detectForVideo(source, now);
    const faceResult = this.face.detectForVideo(source, now);
    return {
      timestamp: now,
      width,
      height,
      pose: poseResult.landmarks?.[0] ?? null,
      face: faceResult.faceLandmarks?.[0] ?? null,
      faceMatrix: faceResult.facialTransformationMatrixes?.[0]?.data ?? null,
    };
  }

  close(): void {
    this.pose?.close();
    this.face?.close();
    this.pose = null;
    this.face = null;
  }
}
