import { create } from 'zustand';
import { CameraState, PoseResults, PostureAnalysis, BaselinePosture } from '@/types/pose';
import { PostureSettings } from '@/types/settings';

interface SlouchingStats {
  totalSlouchingTime: number;
  consecutiveSlouchingTime: number;
  slouchingStartTime: number | null;
  slouchingEvents: number;
  lastAlertTime: number | null;
}

interface DeviationHistory {
  values: number[];
  timestamps: number[];
  maxHistory: number;
  stabilizedValue: number;
  lastUpdateTime: number;
}

interface ScoreHistory {
  values: number[];
  timestamps: number[];
  maxHistory: number;
  stabilizedValue: number;
  lastUpdateTime: number;
}

interface FeedbackHistory {
  feedback: string;
  timestamp: number;
  stabilizedFeedback: string;
  lastUpdateTime: number;
}

interface PoseStore {
  camera: CameraState;
  currentPose: PoseResults | null;
  postureAnalysis: PostureAnalysis | null;
  isProcessing: boolean;
  slouchingStats: SlouchingStats;
  baselinePosture: BaselinePosture | null;
  deviationHistory: DeviationHistory;
  scoreHistory: ScoreHistory;
  feedbackHistory: FeedbackHistory;
  
  setCameraState: (state: Partial<CameraState>) => void;
  setPoseResults: (results: PoseResults | null) => void;
  setPostureAnalysis: (analysis: PostureAnalysis | null) => void;
  setProcessing: (processing: boolean) => void;
  updateSlouchingStats: (isSlouchingDetected: boolean, settings?: PostureSettings) => void;
  resetSlouchingStats: () => void;
  setBaselinePosture: (baseline: BaselinePosture | null) => void;
  clearBaselinePosture: () => void;
  loadBaselineFromStorage: () => void;
  addDeviationToHistory: (deviation: number) => void;
  getSmoothedDeviation: () => number;
  addScoreToHistory: (score: number) => void;
  getSmoothedScore: () => number;
  resetScoreToFullPoints: () => void;
  updateFeedback: (feedback: string) => void;
  getStabilizedFeedback: () => string;
}

export const usePoseStore = create<PoseStore>((set, get) => ({
  camera: {
    isActive: false,
    stream: null,
    error: null,
  },
  currentPose: null,
  postureAnalysis: null,
  isProcessing: false,
  slouchingStats: {
    totalSlouchingTime: 0,
    consecutiveSlouchingTime: 0,
    slouchingStartTime: null,
    slouchingEvents: 0,
    lastAlertTime: null,
  },
  baselinePosture: null,
  deviationHistory: {
    values: [],
    timestamps: [],
    maxHistory: 30,
    stabilizedValue: 0,
    lastUpdateTime: 0,
  },
  scoreHistory: {
    values: [],
    timestamps: [],
    maxHistory: 50,
    stabilizedValue: 100,
    lastUpdateTime: 0,
  },
  feedbackHistory: {
    feedback: '良い姿勢です！',
    timestamp: Date.now(),
    stabilizedFeedback: '良い姿勢です！',
    lastUpdateTime: 0,
  },

  setCameraState: (state) =>
    set((prev) => ({
      camera: { ...prev.camera, ...state },
    })),

  setPoseResults: (results) =>
    set({ currentPose: results }),

  setPostureAnalysis: (analysis) =>
    set({ postureAnalysis: analysis }),

  setProcessing: (processing) =>
    set({ isProcessing: processing }),

  updateSlouchingStats: (isSlouchingDetected, settings) =>
    set((state) => {
      const now = Date.now();
      const stats = { ...state.slouchingStats };
      
      // デフォルト設定を使用（設定が渡されない場合）
      const notificationDelay = settings?.alertSettings.notificationDelay || 5000;
      const notificationInterval = settings?.alertSettings.notificationInterval || 15000;

      if (isSlouchingDetected) {
        if (stats.slouchingStartTime === null) {
          stats.slouchingStartTime = now;
          stats.slouchingEvents += 1;
        } else {
          stats.consecutiveSlouchingTime = now - stats.slouchingStartTime;
        }
        
        if (stats.consecutiveSlouchingTime > notificationDelay && 
            (!stats.lastAlertTime || now - stats.lastAlertTime > notificationInterval)) {
          stats.lastAlertTime = now;
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('SitSmart: 猫背アラート', {
              body: `${notificationDelay / 1000}秒以上猫背が続いています。すぐに姿勢を正してください！`,
              icon: '/favicon.ico'
            });
          }
        }
      } else {
        if (stats.slouchingStartTime !== null) {
          stats.totalSlouchingTime += now - stats.slouchingStartTime;
          stats.slouchingStartTime = null;
          stats.consecutiveSlouchingTime = 0;
        }
      }

      return { slouchingStats: stats };
    }),

  resetSlouchingStats: () =>
    set({
      slouchingStats: {
        totalSlouchingTime: 0,
        consecutiveSlouchingTime: 0,
        slouchingStartTime: null,
        slouchingEvents: 0,
        lastAlertTime: null,
      },
    }),

  setBaselinePosture: (baseline) => {
    set({ baselinePosture: baseline });
    // localStorageに保存
    if (baseline) {
      localStorage.setItem('sitsmart_baseline', JSON.stringify(baseline));
    }
  },

  clearBaselinePosture: () => {
    set({ baselinePosture: null });
    localStorage.removeItem('sitsmart_baseline');
  },

  loadBaselineFromStorage: () => {
    try {
      const stored = localStorage.getItem('sitsmart_baseline');
      if (stored) {
        const baseline: BaselinePosture = JSON.parse(stored);
        set({ baselinePosture: baseline });
      }
    } catch (error) {
      console.error('Failed to load baseline from storage:', error);
      localStorage.removeItem('sitsmart_baseline');
    }
  },

  addDeviationToHistory: (deviation) => {
    set((state) => {
      const now = Date.now();
      const history = { ...state.deviationHistory };
      
      history.values.push(deviation);
      history.timestamps.push(now);
      
      // 古いデータを削除（最大履歴数を超えた場合）
      if (history.values.length > history.maxHistory) {
        history.values.shift();
        history.timestamps.shift();
      }
      
      // 10秒以上古いデータを削除
      const cutoff = now - 10000;
      while (history.timestamps.length > 0 && history.timestamps[0] < cutoff) {
        history.values.shift();
        history.timestamps.shift();
      }
      
      return { deviationHistory: history };
    });
  },

  getSmoothedDeviation: () => {
    const state = get();
    const history = state.deviationHistory;
    const now = Date.now();
    
    if (history.values.length === 0) return 0;
    if (history.values.length === 1) return Math.round(history.values[0]);
    
    // 20秒以下の頻繁な更新では前回の安定化された値を返す（さらに長い間隔）
    if (now - history.lastUpdateTime < 20000) {
      return history.stabilizedValue;
    }
    
    // 最新50個の値のメディアン（中央値）を使用してノイズを完全除去
    const recentValues = history.values.slice(-50);
    const sortedValues = [...recentValues].sort((a, b) => a - b);
    const medianValue = sortedValues.length % 2 === 0
      ? (sortedValues[sortedValues.length / 2 - 1] + sortedValues[sortedValues.length / 2]) / 2
      : sortedValues[Math.floor(sortedValues.length / 2)];
    
    // 極限スムージング: α = 0.0005（ほとんど変化させない）
    const alpha = 0.0005;
    let smoothed = history.stabilizedValue || medianValue;
    smoothed = alpha * medianValue + (1 - alpha) * smoothed;
    
    // 25%未満の変化は完全に無視する（最も厳しい閾値）
    if (Math.abs(smoothed - history.stabilizedValue) < 25) {
      return history.stabilizedValue;
    }
    
    // 段階的変化制限：一度に1ポイント以上は変化させない（最小変化）
    const maxChange = 1;
    const change = smoothed - history.stabilizedValue;
    const limitedChange = Math.sign(change) * Math.min(Math.abs(change), maxChange);
    const limitedSmoothed = history.stabilizedValue + limitedChange;
    
    // 10の倍数に丸めて表示を極度に安定化（揺れ幅をさらに小さく）
    const roundedSmoothed = Math.round(limitedSmoothed / 10) * 10;
    
    // 安定化された値を更新
    set((prevState) => ({
      deviationHistory: {
        ...prevState.deviationHistory,
        stabilizedValue: roundedSmoothed,
        lastUpdateTime: now
      }
    }));
    
    return roundedSmoothed;
  },

  addScoreToHistory: (score) => {
    set((state) => {
      const now = Date.now();
      const history = { ...state.scoreHistory };
      
      history.values.push(score);
      history.timestamps.push(now);
      
      // 古いデータを削除（最大履歴数を超えた場合）
      if (history.values.length > history.maxHistory) {
        history.values.shift();
        history.timestamps.shift();
      }
      
      // 20秒以上古いデータを削除
      const cutoff = now - 20000;
      while (history.timestamps.length > 0 && history.timestamps[0] < cutoff) {
        history.values.shift();
        history.timestamps.shift();
      }
      
      return { scoreHistory: history };
    });
  },

  getSmoothedScore: () => {
    const state = get();
    const history = state.scoreHistory;
    const now = Date.now();
    
    if (history.values.length === 0) return 100;
    if (history.values.length === 1) return Math.round(history.values[0]);
    
    // 8秒以下の頻繁な更新では前回の安定化された値を返す
    if (now - history.lastUpdateTime < 8000) {
      return history.stabilizedValue;
    }
    
    // スコア用の非常に保守的なスムージング
    const alpha = 0.08; // より小さいスムージング係数
    let smoothed = history.stabilizedValue || history.values[0];
    
    // 最新20個の値のみを使用
    const recentValues = history.values.slice(-20);
    for (let i = 1; i < recentValues.length; i++) {
      smoothed = alpha * recentValues[i] + (1 - alpha) * smoothed;
    }
    
    // 5ポイント未満の変化は無視する（閾値フィルタリング）
    if (Math.abs(smoothed - history.stabilizedValue) < 5) {
      return history.stabilizedValue;
    }
    
    // 大幅な変化を段階的に制限（一度に10ポイント以上は変化させない）
    const maxChange = 10;
    const change = smoothed - history.stabilizedValue;
    const limitedChange = Math.sign(change) * Math.min(Math.abs(change), maxChange);
    const limitedSmoothed = history.stabilizedValue + limitedChange;
    
    // 整数に丸めて表示を安定化
    const roundedSmoothed = Math.round(limitedSmoothed);
    
    // 安定化された値を更新
    set((prevState) => ({
      scoreHistory: {
        ...prevState.scoreHistory,
        stabilizedValue: roundedSmoothed,
        lastUpdateTime: now
      }
    }));
    
    return roundedSmoothed;
  },

  resetScoreToFullPoints: () => {
    set(() => ({
      scoreHistory: {
        values: [100],
        timestamps: [Date.now()],
        maxHistory: 50,
        stabilizedValue: 100,
        lastUpdateTime: Date.now(),
      },
      deviationHistory: {
        values: [0],
        timestamps: [Date.now()],
        maxHistory: 30,
        stabilizedValue: 0,
        lastUpdateTime: Date.now(),
      },
      feedbackHistory: {
        feedback: '✅ 基準姿勢をキープしています！',
        timestamp: Date.now(),
        stabilizedFeedback: '✅ 基準姿勢をキープしています！',
        lastUpdateTime: Date.now(),
      },
    }));
  },

  updateFeedback: (feedback) => {
    set((state) => ({
      feedbackHistory: {
        feedback: feedback,
        timestamp: Date.now(),
        stabilizedFeedback: state.feedbackHistory.stabilizedFeedback,
        lastUpdateTime: state.feedbackHistory.lastUpdateTime,
      }
    }));
  },

  getStabilizedFeedback: () => {
    const state = get();
    const history = state.feedbackHistory;
    const now = Date.now();
    
    // フィードバックが変化した場合は即座に反映（バグ修正）
    if (history.feedback !== history.stabilizedFeedback) {
      set((prevState) => ({
        feedbackHistory: {
          ...prevState.feedbackHistory,
          stabilizedFeedback: history.feedback,
          lastUpdateTime: now
        }
      }));
      return history.feedback;
    }
    
    // 8秒以下の頻繁な更新では前回の安定化されたフィードバックを返す
    if (now - history.lastUpdateTime < 8000) {
      return history.stabilizedFeedback;
    }
    
    // 同じフィードバックが5秒以上継続している場合のみ更新
    if (now - history.timestamp > 5000) {
      set((prevState) => ({
        feedbackHistory: {
          ...prevState.feedbackHistory,
          stabilizedFeedback: history.feedback,
          lastUpdateTime: now
        }
      }));
      return history.feedback;
    }
    
    return history.stabilizedFeedback;
  },
}));