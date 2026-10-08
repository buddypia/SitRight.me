import type { RawMetrics } from './types';

type NumericKey = Exclude<keyof RawMetrics, 'headDistanceCm'>;

const KEYS: NumericKey[] = [
  'shoulderWidth',
  'faceWidth',
  'scaleRatio',
  'neckRise',
  'headPitch',
  'headYaw',
  'shoulderTilt',
  'shoulderY',
];

/**
 * 計測値の時間平滑化。
 * - 時定数ベースの指数移動平均なので、検出 fps が変わっても同じ追従速度になる
 * - 1フレームだけの大きな跳ね（検出の取り違え）は捨て、連続した場合のみ受け入れる
 */
export class MetricSmoother {
  private state: RawMetrics | null = null;
  private lastTime = 0;
  private outlierStreak = 0;

  constructor(
    private readonly tauSec = 0.6,
    private readonly maxJump = 0.35,
    private readonly outlierFrames = 4
  ) {}

  reset(): void {
    this.state = null;
    this.outlierStreak = 0;
  }

  get current(): RawMetrics | null {
    return this.state;
  }

  push(m: RawMetrics, timeMs: number): RawMetrics {
    if (!this.state) {
      this.state = { ...m };
      this.lastTime = timeMs;
      return this.state;
    }

    const jump = Math.abs(m.scaleRatio / this.state.scaleRatio - 1);
    if (jump > this.maxJump && this.outlierStreak < this.outlierFrames) {
      this.outlierStreak += 1;
      return this.state;
    }
    if (jump > this.maxJump) {
      // 本当に姿勢・位置が変わった。即座に追従する
      this.outlierStreak = 0;
      this.state = { ...m };
      this.lastTime = timeMs;
      return this.state;
    }
    this.outlierStreak = 0;

    const dt = Math.min(1, Math.max(0, (timeMs - this.lastTime) / 1000));
    this.lastTime = timeMs;
    const a = 1 - Math.exp(-dt / this.tauSec);
    const next = { ...this.state };
    for (const k of KEYS) next[k] = this.state[k] + (m[k] - this.state[k]) * a;
    if (m.headDistanceCm !== null) {
      next.headDistanceCm =
        this.state.headDistanceCm === null
          ? m.headDistanceCm
          : this.state.headDistanceCm +
            (m.headDistanceCm - this.state.headDistanceCm) * a;
    }
    this.state = next;
    return next;
  }
}
