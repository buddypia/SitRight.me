import { create } from 'zustand';
import { PostureSettings, DEFAULT_SETTINGS } from '@/types/settings';

const STORAGE_KEY = 'sitsmart-settings';

interface SettingsStore {
  settings: PostureSettings;
  isSettingsOpen: boolean;
  
  updateSettings: (newSettings: Partial<PostureSettings>) => void;
  resetSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  loadSettings: () => void;
  saveSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isSettingsOpen: false,

  updateSettings: (newSettings) => {
    const currentSettings = get().settings;
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
      faceDownThresholds: {
        ...currentSettings.faceDownThresholds,
        ...(newSettings.faceDownThresholds || {}),
      },
      headForwardThresholds: {
        ...currentSettings.headForwardThresholds,
        ...(newSettings.headForwardThresholds || {}),
      },
      backCurvatureThresholds: {
        ...currentSettings.backCurvatureThresholds,
        ...(newSettings.backCurvatureThresholds || {}),
      },
      alertSettings: {
        ...currentSettings.alertSettings,
        ...(newSettings.alertSettings || {}),
        visualAlertDelay: {
          ...currentSettings.alertSettings.visualAlertDelay,
          ...(newSettings.alertSettings?.visualAlertDelay || {}),
        },
      },
      scoringSettings: {
        ...currentSettings.scoringSettings,
        ...(newSettings.scoringSettings || {}),
      },
    };
    
    set({ settings: updatedSettings });
    get().saveSettings();
  },

  resetSettings: () => {
    set({ settings: { ...DEFAULT_SETTINGS } });
    get().saveSettings();
  },

  setSettingsOpen: (open) => {
    set({ isSettingsOpen: open });
  },

  loadSettings: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        // マージして不足している設定を補完
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...parsedSettings,
          faceDownThresholds: {
            ...DEFAULT_SETTINGS.faceDownThresholds,
            ...(parsedSettings.faceDownThresholds || {}),
          },
          headForwardThresholds: {
            ...DEFAULT_SETTINGS.headForwardThresholds,
            ...(parsedSettings.headForwardThresholds || {}),
          },
          backCurvatureThresholds: {
            ...DEFAULT_SETTINGS.backCurvatureThresholds,
            ...(parsedSettings.backCurvatureThresholds || {}),
          },
          alertSettings: {
            ...DEFAULT_SETTINGS.alertSettings,
            ...(parsedSettings.alertSettings || {}),
            visualAlertDelay: {
              ...DEFAULT_SETTINGS.alertSettings.visualAlertDelay,
              ...(parsedSettings.alertSettings?.visualAlertDelay || {}),
            },
          },
          scoringSettings: {
            ...DEFAULT_SETTINGS.scoringSettings,
            ...(parsedSettings.scoringSettings || {}),
          },
        };
        set({ settings: mergedSettings });
      }
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
      set({ settings: { ...DEFAULT_SETTINGS } });
    }
  },

  saveSettings: () => {
    try {
      const settings = get().settings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('設定の保存に失敗:', error);
    }
  },
}));