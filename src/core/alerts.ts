import { FAIR_AT } from './assessment';
import type { PostureAssessment, PosturePattern } from './types';

export interface AlertConfig {
  /** 悪い姿勢がこの秒数続いたら通知する */
  delaySec: number;
  /** 通知の最短間隔 */
  cooldownSec: number;
}

export type AlertEvent =
  | { type: 'alert'; pattern: PosturePattern; repeat: number }
  | { type: 'recovered' };

/** 良い姿勢に戻ったと判断するまでの継続時間 */
const RECOVERY_SEC = 3;
/** 「悪い」から「良い」に戻すときのヒステリシス幅 */
const HYSTERESIS = 0.08;

const maxSeverity = (a: PostureAssessment) =>
  Math.max(
    a.severity.forward,
    a.severity.down,
    a.severity.slump,
    a.severity.lean * 0.6
  );

/**
 * 悪い姿勢が「続いた」ときだけ通知するための状態機械。
 * - 一瞬の前かがみ（物を取る等）では通知しない
 * - 良い姿勢に一瞬戻っただけでは蓄積をリセットしない（減衰は2倍速）
 * - 判定不能フレーム（離席・横向き）は蓄積を止めるだけで変化させない
 */
export class AlertEngine {
  private badSec = 0;
  private goodSec = 0;
  private inBad = false;
  private alerted = false;
  private repeat = 0;
  private lastAlertAt = Number.NEGATIVE_INFINITY;
  private patternSec = new Map<PosturePattern, number>();
  private lastPattern: PosturePattern | null = null;
  private config: AlertConfig | null = null;

  reset(): void {
    this.badSec = 0;
    this.goodSec = 0;
    this.inBad = false;
    this.alerted = false;
    this.repeat = 0;
    this.lastAlertAt = Number.NEGATIVE_INFINITY;
    this.patternSec.clear();
    this.lastPattern = null;
  }

  /** 通知までの進み具合（0..1） */
  get progress(): number {
    return this.config ? Math.min(1, this.badSec / this.config.delaySec) : 0;
  }

  get isBad(): boolean {
    return this.inBad;
  }

  update(
    a: PostureAssessment | null,
    dtSec: number,
    nowSec: number,
    config: AlertConfig
  ): AlertEvent | null {
    this.config = config;
    if (!a || !(dtSec > 0)) return null;
    const dt = Math.min(dtSec, 2);

    const sev = maxSeverity(a);
    this.inBad = this.inBad ? sev >= FAIR_AT - HYSTERESIS : sev >= FAIR_AT;

    // ヒステリシス帯では classifyPattern が null を返すことがあるため、直前のパターンを引き継ぐ
    const pattern = a.pattern ?? this.lastPattern;
    if (this.inBad && pattern) {
      this.badSec += dt;
      this.goodSec = 0;
      this.lastPattern = pattern;
      this.patternSec.set(pattern, (this.patternSec.get(pattern) ?? 0) + dt);
    } else {
      this.inBad = false;
      this.badSec = Math.max(0, this.badSec - 2 * dt);
      this.goodSec += dt;
      if (this.badSec === 0) {
        this.patternSec.clear();
        this.lastPattern = null;
      }
      if (this.alerted && this.goodSec >= RECOVERY_SEC) {
        this.alerted = false;
        this.repeat = 0;
        return { type: 'recovered' };
      }
    }

    if (
      this.badSec >= config.delaySec &&
      nowSec - this.lastAlertAt >= config.cooldownSec
    ) {
      const pattern = this.dominantPattern() ?? a.pattern ?? 'slouch';
      this.lastAlertAt = nowSec;
      this.alerted = true;
      this.repeat += 1;
      this.badSec = 0;
      this.patternSec.clear();
      return { type: 'alert', pattern, repeat: this.repeat };
    }
    return null;
  }

  private dominantPattern(): PosturePattern | null {
    let best: PosturePattern | null = null;
    let bestSec = 0;
    this.patternSec.forEach((sec, p) => {
      if (sec > bestSec) {
        best = p;
        bestSec = sec;
      }
    });
    return best;
  }
}

/** 座りっぱなしの検知。一定時間カメラ前にいなければ休憩したとみなす */
export class SittingTracker {
  private sittingSec = 0;
  private awaySec = 0;
  private remindedAt = 0;

  constructor(private readonly breakResetSec = 90) {}

  get minutes(): number {
    return this.sittingSec / 60;
  }

  reset(): void {
    this.sittingSec = 0;
    this.awaySec = 0;
    this.remindedAt = 0;
  }

  /** @returns 休憩を促すべきタイミングなら true */
  update(present: boolean, dtSec: number, intervalMin: number): boolean {
    const dt = Math.min(Math.max(dtSec, 0), 2);
    if (!present) {
      this.awaySec += dt;
      if (this.awaySec >= this.breakResetSec) {
        this.sittingSec = 0;
        this.remindedAt = 0;
      }
      return false;
    }
    this.awaySec = 0;
    this.sittingSec += dt;
    if (intervalMin <= 0) return false;
    const interval = intervalMin * 60;
    // 初回は interval 経過時、その後は無視されても 15 分ごとに再通知
    const next = this.remindedAt === 0 ? interval : this.remindedAt + 15 * 60;
    if (this.sittingSec >= next) {
      this.remindedAt = this.sittingSec;
      return true;
    }
    return false;
  }
}
