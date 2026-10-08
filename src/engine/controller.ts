import { AlertEngine, SittingTracker } from '@/core/alerts';
import { assess } from '@/core/assessment';
import { CalibrationCollector } from '@/core/calibration';
import { extractMetrics, shouldersVisible } from '@/core/metrics';
import { rigFromDeviation } from '@/core/rig';
import { MetricSmoother } from '@/core/smoothing';
import {
  accumulate,
  emptyDay,
  localDateKey,
  type DayStats,
} from '@/core/stats';
import type {
  FrameIssue,
  PostureAssessment,
  PosturePattern,
  VisionFrame,
} from '@/core/types';
import { MESSAGES, format } from '@/i18n/messages';
import {
  todayStats,
  useAppStore,
  type AppEventInput,
  type LiveState,
} from '@/stores/appStore';
import { CameraError, openCamera, stopStream } from './camera';
import { playChime, setTitleState, showDesktopNotification } from './notifier';
import { HybridTicker } from './ticker';
import { VisionEngine } from './vision';

interface ImageCaptureLike {
  grabFrame(): Promise<ImageBitmap>;
}

/** 判定不能の理由を表示するまでの猶予（一瞬の検出漏れで表示を揺らさない） */
const ISSUE_DISPLAY_MS = 1200;
const AWAY_MS = 5000;
const STATS_FLUSH_MS = 5000;
const SUSPECT_SEC = 60;

/**
 * カメラ → 推定 → 判定 → 通知 の一連の流れを管理する（React の外に置き、画面遷移で途切れないようにする）。
 */
class PostureController {
  readonly vision = new VisionEngine();
  video: HTMLVideoElement | null = null;
  /** プレビュー描画用の最新フレーム（React を通さず canvas が直接読む） */
  latestFrame: VisionFrame | null = null;

  private stream: MediaStream | null = null;
  private ticker: HybridTicker | null = null;
  private smoother = new MetricSmoother();
  private calibrator = new CalibrationCollector();
  private alerts = new AlertEngine();
  private sitting = new SittingTracker();
  private calibrating = false;
  private lastTickAt = 0;
  private lastVideoTime = -1;
  private lastPresentAt = 0;
  private issue: { kind: FrameIssue; since: number } | null = null;
  private today: DayStats | null = null;
  private lastFlush = 0;
  private suspectSec = 0;
  private eventId = 0;
  private enginePromise: Promise<void> | null = null;
  private imageCapture: ImageCaptureLike | null = null;
  private imageCaptureTrack: MediaStreamTrack | null = null;
  private grabbing = false;
  private startPromise: Promise<void> | null = null;

  private get store() {
    return useAppStore.getState();
  }

  private setLive(patch: Partial<LiveState>) {
    this.store.setLive(patch);
  }

  ensureEngine(): Promise<void> {
    if (!this.enginePromise) {
      this.setLive({ engine: 'loading' });
      this.enginePromise = this.vision
        .init()
        .then(() => this.setLive({ engine: 'ready' }))
        .catch((error) => {
          console.error('[vision] failed to initialise', error);
          this.enginePromise = null;
          this.setLive({ engine: 'error' });
          throw error;
        });
    }
    return this.enginePromise;
  }

  /** 起動中に重ねて呼ばれても（StrictMode の二重実行など）ストリームを1本に保つ */
  startCamera(): Promise<void> {
    if (this.stream && this.store.live.camera === 'on')
      return Promise.resolve();
    if (!this.startPromise) {
      this.startPromise = this.openSource().finally(() => {
        this.startPromise = null;
      });
    }
    return this.startPromise;
  }

  private async openSource(): Promise<void> {
    this.setLive({ camera: 'starting', cameraError: null });
    const enginePromise = this.ensureEngine().catch(() => undefined);
    const devSource = devVideoSource();
    if (devSource) {
      await this.startFileSource(devSource);
      await enginePromise;
      this.startLoop();
      return;
    }
    try {
      const stream = await openCamera(
        this.store.settings.cameraId ?? undefined
      );
      stopStream(this.stream);
      this.stream = stream;
      if (!this.video) {
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.autoplay = true;
      }
      this.video.srcObject = stream;
      await this.video.play().catch(() => undefined);
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (this.stream !== stream) return;
        this.setLive({
          camera: 'error',
          cameraError: 'in_use',
          assessment: null,
          alertProgress: 0,
        });
        setTitleState(null);
      });
      this.setLive({ camera: 'on' });
    } catch (error) {
      const kind = error instanceof CameraError ? error.kind : 'unknown';
      this.setLive({ camera: 'error', cameraError: kind });
      return;
    }
    await enginePromise;
    this.startLoop();
  }

  /** 開発用: カメラの代わりに動画ファイルを入力にする（?source=/dev/xxx.mp4） */
  private async startFileSource(src: string) {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.src = src;
    this.video = video;
    await video
      .play()
      .catch((error) => console.warn('[dev] video source failed', error));
    this.setLive({ camera: 'on' });
  }

  async switchCamera(deviceId: string | null): Promise<void> {
    this.store.updateSettings({ cameraId: deviceId });
    stopStream(this.stream);
    this.stream = null;
    this.setLive({ camera: 'off' });
    await this.startCamera();
  }

  stopCamera(): void {
    this.ticker?.stop();
    this.ticker = null;
    stopStream(this.stream);
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video.removeAttribute('src');
    }
    this.latestFrame = null;
    this.setLive({ camera: 'off' });
    setTitleState(null);
  }

  startCalibration(): void {
    if (this.store.live.paused) this.setPaused(false);
    this.calibrator.reset();
    this.calibrating = true;
    this.setLive({ calibration: { state: 'collecting', progress: 0 } });
  }

  cancelCalibration(): void {
    this.calibrating = false;
    this.setLive({ calibration: null });
  }

  setPaused(paused: boolean): void {
    this.setLive({ paused, alertProgress: 0 });
    if (paused) {
      this.alerts.reset();
      setTitleState(MESSAGES[this.store.settings.locale].statusPaused);
    } else {
      setTitleState(null);
    }
  }

  /** 「全データを削除」後に、メモリ上の今日の統計で書き戻さないようにする */
  resetStats(): void {
    this.today = null;
    this.resetAlerts();
    this.sitting.reset();
    this.smoother.reset();
  }

  /** 基準変更・感度変更時に通知の蓄積をリセット */
  resetAlerts(): void {
    this.alerts.reset();
    this.suspectSec = 0;
    this.setLive({ baselineSuspect: false });
  }

  private startLoop() {
    if (this.ticker) return;
    this.lastTickAt = 0;
    this.ticker = new HybridTicker(
      (now) => this.tick(now),
      (hidden) => {
        const saver =
          this.store.settings.powerSaver && this.store.phase === 'monitor';
        if (hidden) return saver ? 1000 : 400;
        return saver ? 200 : 66;
      }
    );
    this.ticker.start();
  }

  private emit(event: AppEventInput) {
    this.eventId += 1;
    this.setLive({ event: { ...event, id: this.eventId } });
  }

  private tick(now: number) {
    const video = this.video;
    if (!video || !this.vision.ready) return;
    // 一時停止は計測画面だけに効かせる（再キャリブレーションやセットアップは止めない）
    if (
      this.store.live.paused &&
      this.store.phase === 'monitor' &&
      !this.calibrating
    ) {
      this.lastTickAt = 0;
      return;
    }
    // 非表示タブでは <video> の再生が止められることがあるため、カメラのトラックから直接フレームを取る
    const capture = document.hidden ? this.getImageCapture() : null;
    if (capture) {
      if (this.grabbing) return;
      this.grabbing = true;
      capture
        .grabFrame()
        .then((bitmap) => {
          try {
            this.process(
              bitmap,
              bitmap.width,
              bitmap.height,
              performance.now()
            );
          } finally {
            bitmap.close();
          }
        })
        .catch(() => undefined)
        .finally(() => {
          this.grabbing = false;
        });
      return;
    }
    if (video.readyState < 2) return;
    // 新しい映像フレームが無いティックは飛ばす
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;
    this.process(video, video.videoWidth, video.videoHeight, now);
  }

  private getImageCapture(): ImageCaptureLike | null {
    const track = this.stream?.getVideoTracks()[0];
    const Ctor = (
      window as unknown as {
        ImageCapture?: new (t: MediaStreamTrack) => ImageCaptureLike;
      }
    ).ImageCapture;
    if (!track || track.readyState !== 'live' || !Ctor) return null;
    if (!this.imageCapture || this.imageCaptureTrack !== track) {
      this.imageCapture = new Ctor(track);
      this.imageCaptureTrack = track;
    }
    return this.imageCapture;
  }

  /** 1フレームを推定・判定する。経過時間は処理したフレーム間で測る */
  private process(
    source: HTMLVideoElement | ImageBitmap,
    width: number,
    height: number,
    now: number
  ) {
    const { phase, baseline, settings } = this.store;
    const dt = this.lastTickAt ? (now - this.lastTickAt) / 1000 : 0;
    this.lastTickAt = now;

    let frame: VisionFrame | null;
    try {
      frame = this.vision.detect(source, width, height);
    } catch (error) {
      console.warn('[vision] detection failed', error);
      return;
    }
    if (!frame) return;
    this.latestFrame = frame;

    const result = extractMetrics(frame);
    const present = !!(frame.pose || frame.face);
    if (present) this.lastPresentAt = now;
    const away = now - this.lastPresentAt > AWAY_MS;

    if (result.ok) this.issue = null;
    else if (!this.issue || this.issue.kind !== result.issue)
      this.issue = { kind: result.issue, since: now };
    const issueAge = this.issue ? now - this.issue.since : 0;
    const shownIssue =
      this.issue && issueAge >= ISSUE_DISPLAY_MS ? this.issue.kind : null;
    if (this.issue && issueAge > 3000) this.smoother.reset();

    const patch: Partial<LiveState> = {
      issue: shownIssue,
      away,
      checks: {
        face: !!frame.face,
        shoulders: shouldersVisible(frame.pose),
        facing:
          result.ok ||
          (result.issue !== 'turned_away' &&
            result.issue !== 'body_rotated' &&
            !!frame.face),
      },
    };

    const smoothed = result.ok ? this.smoother.push(result.metrics, now) : null;

    if (this.calibrating) {
      if (result.ok) {
        const status = this.calibrator.push(result.metrics, now);
        patch.calibration = status;
        if (status.state === 'done') {
          this.calibrating = false;
          this.store.setBaseline(status.baseline);
          this.resetAlerts();
          this.smoother.reset();
        }
      } else if (issueAge > 600) {
        this.calibrator.interrupt();
        patch.calibration = { state: 'collecting', progress: 0 };
      }
    } else if (phase === 'monitor' && baseline) {
      let assessment: PostureAssessment | null = null;
      if (smoothed) {
        assessment = assess(smoothed, baseline, settings.sensitivity);
        patch.assessment = assessment;
        patch.rig = rigFromDeviation(assessment.deviation);
        this.trackSuspect(assessment, dt, patch);
        this.recordStats(assessment, dt, now);
      } else if (shownIssue) {
        patch.assessment = null;
      }

      const event = this.alerts.update(assessment, dt, now / 1000, {
        delaySec: settings.alertDelaySec,
        cooldownSec: settings.cooldownSec,
      });
      patch.alertProgress = this.alerts.isBad ? this.alerts.progress : 0;
      if (event?.type === 'alert') this.notifyAlert(event.pattern);
      else if (event?.type === 'recovered') this.notifyRecovered();

      if (this.sitting.update(!away, dt, settings.breakIntervalMin))
        this.handleBreak();
      patch.sittingMin = this.sitting.minutes;

      const t = MESSAGES[settings.locale];
      if (away) setTitleState(t.statusAway);
      else if (assessment && this.alerts.isBad && assessment.level !== 'good')
        setTitleState(
          `⚠ ${assessment.level === 'poor' ? t.statusPoor : t.statusFair}`
        );
      else setTitleState(null);
    }

    this.setLive(patch);
  }

  private trackSuspect(
    a: PostureAssessment,
    dt: number,
    patch: Partial<LiveState>
  ) {
    const behind =
      a.deviation.headForwardCm < -4 || a.deviation.compression < -0.2;
    this.suspectSec = behind
      ? this.suspectSec + dt
      : Math.max(0, this.suspectSec - dt);
    patch.baselineSuspect = this.suspectSec >= SUSPECT_SEC;
  }

  private recordStats(a: PostureAssessment, dt: number, now: number) {
    const date = new Date();
    const key = localDateKey(date);
    if (!this.today || this.today.date !== key) {
      const stored = todayStats(this.store.history);
      this.today = stored.date === key ? stored : emptyDay(key);
    }
    this.today = accumulate(this.today, a, dt, date);
    if (now - this.lastFlush > STATS_FLUSH_MS) this.flushStats(now);
  }

  private flushStats(now = performance.now()) {
    if (!this.today) return;
    this.lastFlush = now;
    this.store.setToday(this.today);
  }

  private notifyAlert(pattern: PosturePattern) {
    const { settings } = this.store;
    const t = MESSAGES[settings.locale];
    if (this.today)
      this.today = { ...this.today, alerts: this.today.alerts + 1 };
    this.flushStats();
    this.emit({ kind: 'alert', pattern });
    if (settings.sound) playChime('alert');
    if (settings.desktopNotify && !document.hasFocus()) {
      const p = t.pattern[pattern];
      showDesktopNotification(
        `${t.alertTitle}: ${p.name}`,
        `${p.short} — ${p.fix}`
      );
    }
  }

  private notifyRecovered() {
    const { settings } = this.store;
    this.emit({ kind: 'recovered' });
    if (settings.sound) playChime('good', 0.35);
  }

  private handleBreak() {
    const { settings } = this.store;
    const t = MESSAGES[settings.locale];
    const minutes = Math.round(this.sitting.minutes);
    this.emit({ kind: 'break', minutes });
    if (settings.sound) playChime('break', 0.4);
    if (settings.desktopNotify && !document.hasFocus()) {
      showDesktopNotification(
        t.breakTitle,
        format(t.breakBody, { n: minutes }),
        'sitsmart-break'
      );
    }
  }

  dispose(): void {
    this.flushStats();
    this.stopCamera();
    this.vision.close();
    this.enginePromise = null;
  }
}

function devVideoSource(): string | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined')
    return null;
  const src = new URLSearchParams(window.location.search).get('source');
  return src && src.startsWith('/') ? src : null;
}

let instance: PostureController | null = null;

export function getController(): PostureController {
  if (!instance) instance = new PostureController();
  return instance;
}

export type { PostureController };
