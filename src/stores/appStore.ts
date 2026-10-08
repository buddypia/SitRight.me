import { create } from 'zustand';
import { persist, type PersistStorage } from 'zustand/middleware';
import { isValidBaseline } from '@/core/calibration';
import type { CalibrationStatus } from '@/core/calibration';
import { IDEAL_RIG, type RigParams } from '@/core/rig';
import {
  emptyDay,
  localDateKey,
  pruneHistory,
  type DayStats,
} from '@/core/stats';
import type {
  Baseline,
  FrameIssue,
  PostureAssessment,
  PosturePattern,
  Sensitivity,
} from '@/core/types';
import type { CameraErrorKind } from '@/engine/camera';
import type { Locale } from '@/i18n/messages';

export type Phase = 'welcome' | 'setup' | 'calibrate' | 'monitor';

export interface Settings {
  sensitivity: Sensitivity;
  alertDelaySec: number;
  cooldownSec: number;
  sound: boolean;
  desktopNotify: boolean;
  breakIntervalMin: number;
  powerSaver: boolean;
  showCamera: boolean;
  xray: boolean;
  locale: Locale;
  cameraId: string | null;
}

export type AppEventInput =
  | { kind: 'alert'; pattern: PosturePattern }
  | { kind: 'recovered' }
  | { kind: 'break'; minutes: number };

export type AppEvent = AppEventInput & { id: number };

export interface LiveState {
  engine: 'idle' | 'loading' | 'ready' | 'error';
  camera: 'off' | 'starting' | 'on' | 'error';
  cameraError: CameraErrorKind | null;
  /** 直近で継続している計測不能の理由 */
  issue: FrameIssue | null;
  /** 直近フレームでの顔・肩・正面向きのチェック結果（セットアップ画面用） */
  checks: { face: boolean; shoulders: boolean; facing: boolean };
  away: boolean;
  paused: boolean;
  assessment: PostureAssessment | null;
  rig: RigParams;
  alertProgress: number;
  calibration: CalibrationStatus | null;
  sittingMin: number;
  baselineSuspect: boolean;
  event: AppEvent | null;
}

interface PersistedState {
  settings: Settings;
  baseline: Baseline | null;
  history: DayStats[];
}

interface AppState extends PersistedState {
  hydrated: boolean;
  phase: Phase;
  live: LiveState;
  setPhase: (phase: Phase) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setBaseline: (b: Baseline | null) => void;
  setLive: (patch: Partial<LiveState>) => void;
  setToday: (day: DayStats) => void;
  resetAll: () => void;
  markHydrated: () => void;
}

const defaultLocale = (): Locale =>
  typeof navigator !== 'undefined' &&
  !navigator.language.toLowerCase().startsWith('ja')
    ? 'en'
    : 'ja';

export const DEFAULT_SETTINGS: Settings = {
  sensitivity: 'standard',
  alertDelaySec: 20,
  cooldownSec: 120,
  sound: true,
  desktopNotify: false,
  breakIntervalMin: 45,
  powerSaver: false,
  showCamera: true,
  xray: true,
  locale: 'ja',
  cameraId: null,
};

export const INITIAL_LIVE: LiveState = {
  engine: 'idle',
  camera: 'off',
  cameraError: null,
  issue: null,
  checks: { face: false, shoulders: false, facing: false },
  away: false,
  paused: false,
  assessment: null,
  rig: IDEAL_RIG,
  alertProgress: 0,
  calibration: null,
  sittingMin: 0,
  baselineSuspect: false,
  event: null,
};

/**
 * localStorage への保存。live は毎フレーム更新されるため、保存対象が変わったときだけ書き込む。
 * ストレージが使えない環境（サイトデータのブロック等）でも起動できるよう例外は握りつぶす。
 */
let lastSaved: PersistedState | null = null;
const storage: PersistStorage<PersistedState> = {
  getItem: (name) => {
    try {
      const raw = localStorage.getItem(name);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    const s = value.state;
    if (
      lastSaved &&
      lastSaved.settings === s.settings &&
      lastSaved.baseline === s.baseline &&
      lastSaved.history === s.history
    )
      return;
    lastSaved = s;
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch {
      // 容量超過・利用不可。保存できなくても計測は続ける
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // noop
    }
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hydrated: false,
      phase: 'welcome',
      settings: { ...DEFAULT_SETTINGS, locale: defaultLocale() },
      baseline: null,
      history: [],
      live: INITIAL_LIVE,
      setPhase: (phase) => set({ phase }),
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      setBaseline: (baseline) => set({ baseline }),
      setLive: (patch) => set((s) => ({ live: { ...s.live, ...patch } })),
      setToday: (day) =>
        set((s) => ({
          history: pruneHistory(
            [day, ...s.history.filter((d) => d.date !== day.date)],
            day.date
          ),
        })),
      markHydrated: () => set({ hydrated: true }),
      resetAll: () =>
        set((s) => ({
          baseline: null,
          history: pruneHistory([], localDateKey(new Date())),
          phase: 'welcome',
          live: { ...INITIAL_LIVE, engine: s.live.engine },
        })),
    }),
    {
      name: 'sitsmart.v2',
      version: 1,
      storage,
      partialize: (s): PersistedState => ({
        settings: s.settings,
        baseline: s.baseline,
        history: s.history,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          // headRoll は後から追加した項目。古い基準は傾き 0 として扱う
          baseline: isValidBaseline(p.baseline)
            ? {
                ...p.baseline,
                headRoll: Number.isFinite(p.baseline.headRoll)
                  ? p.baseline.headRoll
                  : 0,
              }
            : null,
          history: Array.isArray(p.history) ? p.history : [],
        };
      },
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    }
  )
);

export function todayStats(history: DayStats[]): DayStats {
  const key = localDateKey(new Date());
  return history.find((d) => d.date === key) ?? emptyDay(key);
}
