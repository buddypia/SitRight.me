export interface PostureSettings {
  // 顔の下向き検出閾値
  faceDownThresholds: {
    severe: number;      // 重度判定の閾値
    moderate: number;    // 中度判定の閾値
    mild: number;        // 軽度判定の閾値
    minimal: number;     // 最小警告の閾値
  };
  
  // 頭の前傾検出閾値
  headForwardThresholds: {
    severe: number;      // 重度判定の閾値
    moderate: number;    // 中度判定の閾値
    mild: number;        // 軽度判定の閾値
    minimal: number;     // 最小警告の閾値
  };
  
  
  // アラート設定
  alertSettings: {
    notificationDelay: number;     // 通知までの遅延時間（ミリ秒）
    notificationInterval: number;  // 通知間隔（ミリ秒）
    visualAlertDelay: {
      severe: number;     // 重度アラート表示までの時間
      moderate: number;   // 中度アラート表示までの時間
      mild: number;       // 軽度アラート表示までの時間
    };
  };
  
  // スコアリング設定
  scoringSettings: {
    goodPostureThreshold: number;    // 良い姿勢の閾値
    warningThreshold: number;        // 警告レベルの閾値
    severePenalty: number;          // 重度ペナルティ
    moderatePenalty: number;        // 中度ペナルティ
    mildPenalty: number;           // 軽度ペナルティ
  };
}

export const DEFAULT_SETTINGS: PostureSettings = {
  faceDownThresholds: {
    severe: 15,
    moderate: 10,
    mild: 5,
    minimal: 2,
  },
  headForwardThresholds: {
    severe: 0.12,
    moderate: 0.08,
    mild: 0.05,
    minimal: 0.03,
  },
  alertSettings: {
    notificationDelay: 15000,
    notificationInterval: 20000,
    visualAlertDelay: {
      severe: 10000,
      moderate: 6000,
      mild: 3000,
    },
  },
  scoringSettings: {
    goodPostureThreshold: 85,
    warningThreshold: 65,
    severePenalty: 25,
    moderatePenalty: 18,
    mildPenalty: 10,
  },
};