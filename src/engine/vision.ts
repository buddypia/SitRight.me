import type {
  FaceLandmarker,
  FilesetResolver,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';
import { poseModelPath, type PoseModel } from '@/core/poseModel';
import type { VisionFrame } from '@/core/types';
import { installThirdPartyTelemetryBlocker } from './telemetry';

const WASM_PATH = '/mediapipe/wasm';
const FACE_MODEL = '/mediapipe/models/face_landmarker.task';

type Delegate = 'GPU' | 'CPU';
type WasmFileset = Awaited<
  ReturnType<typeof FilesetResolver.forVisionTasks>
>;

const MEDIAPIPE_NOISE_PATTERNS = [
  'INFO: Created TensorFlow Lite',
  'Sets FaceBlendshapesGraph acceleration to xnnpack by default',
  'OpenGL error checking is disabled',
  'Using NORM_RECT without IMAGE_DIMENSIONS is only supported for the square ROI',
];

export function isMediapipeNoiseLog(firstArg: unknown): boolean {
  return (
    typeof firstArg === 'string' &&
    MEDIAPIPE_NOISE_PATTERNS.some((pattern) => firstArg.includes(pattern))
  );
}

let consoleFiltered = false;
/**
 * MediaPipe (WASM / C++ glog) は定型の初期化・グラフ情報ログを
 * console.error / console.warn に出すため、既知の無害な定型ログだけを抑制する
 */
export function filterMediapipeInfoLogs(): void {
  if (consoleFiltered || typeof console === 'undefined') return;
  consoleFiltered = true;
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (isMediapipeNoiseLog(args[0])) return;
    originalError(...args);
  };
  const originalWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (isMediapipeNoiseLog(args[0])) return;
    originalWarn(...args);
  };
}

export function resetMediapipeConsoleFilterForTesting(): void {
  consoleFiltered = false;
}

/**
 * MediaPipe の Pose / Face Landmarker をまとめたラッパー。
 * GPU で初期化できない環境（WebGL 不可・一部の仮想環境）では CPU にフォールバックする。
 */
export class VisionEngine {
  private pose: PoseLandmarker | null = null;
  private face: FaceLandmarker | null = null;
  private fileset: WasmFileset | null = null;
  private lastTimestamp = 0;
  delegate: Delegate | null = null;
  poseModel: PoseModel | null = null;
  private requestedPoseModel: PoseModel | null = null;

  private async createPose(
    fileset: WasmFileset,
    delegate: Delegate,
    model: PoseModel
  ): Promise<PoseLandmarker> {
    const { PoseLandmarker } = await import('@mediapipe/tasks-vision');
    return PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: poseModelPath(model), delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }

  async init(poseModel: PoseModel): Promise<void> {
    if (this.pose && this.face) return;
    installThirdPartyTelemetryBlocker();
    filterMediapipeInfoLogs();
    const { FilesetResolver, FaceLandmarker } =
      await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);

    const create = async (delegate: Delegate) => {
      const [pose, face] = await Promise.all([
        this.createPose(fileset, delegate, poseModel),
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
    this.fileset = fileset;
    this.pose = created.pose;
    this.face = created.face;
    this.poseModel = poseModel;
    this.requestedPoseModel = poseModel;
  }

  /** 計測を止めずに姿勢推定モデルだけを差し替える（読み込みが終わるまでは今のモデルで推定を続ける） */
  async setPoseModel(model: PoseModel): Promise<void> {
    if (!this.fileset || !this.delegate || !this.pose) return;
    this.requestedPoseModel = model;
    if (this.poseModel === model) return;
    const next = await this.createPose(this.fileset, this.delegate, model);
    // 読み込み中に閉じられた・別のモデルが選び直された場合は捨てる
    if (!this.pose || this.requestedPoseModel !== model) {
      next.close();
      return;
    }
    this.pose.close();
    this.pose = next;
    this.poseModel = model;
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
    this.poseModel = null;
  }
}
