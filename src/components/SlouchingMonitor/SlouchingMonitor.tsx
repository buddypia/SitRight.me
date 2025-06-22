'use client';

import { usePoseStore } from '@/stores/poseStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const SlouchingMonitor = () => {
  const { slouchingStats, postureAnalysis, resetSlouchingStats } = usePoseStore();
  const { settings } = useSettingsStore();
  const { t } = useTranslation();

  useEffect(() => {
    // 通知許可を要求
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}${t('monitor.formatTime.hours')}${minutes % 60}${t('monitor.formatTime.minutes')}`;
    } else if (minutes > 0) {
      return `${minutes}${t('monitor.formatTime.minutes')}${seconds % 60}${t('monitor.formatTime.seconds')}`;
    } else {
      return `${seconds}${t('monitor.formatTime.seconds')}`;
    }
  };

  const getSlouchingAlert = () => {
    if (!postureAnalysis?.isSlouchingDetected) return null;

    const severity = postureAnalysis.slouchingSeverity;
    const consecutiveTime = slouchingStats.consecutiveSlouchingTime;
    
    // 設定可能な閾値を使用
    const severeDelay = settings.alertSettings.visualAlertDelay.severe;
    const moderateDelay = settings.alertSettings.visualAlertDelay.moderate;
    const mildDelay = settings.alertSettings.visualAlertDelay.mild;

    if (severity === 'severe' || consecutiveTime > severeDelay) {
      return (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 animate-pulse">
          <div className="flex items-center">
            <span className="text-2xl mr-2">🚨</span>
            <div>
              <p className="font-bold">{t('monitor.alerts.emergency.title')}</p>
              <p className="text-sm">{t('monitor.alerts.emergency.message')}</p>
            </div>
          </div>
        </div>
      );
    } else if (severity === 'moderate' || consecutiveTime > moderateDelay) {
      return (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            <div>
              <p className="font-bold">{t('monitor.alerts.warning.title')}</p>
              <p className="text-sm">{t('monitor.alerts.warning.message')}</p>
            </div>
          </div>
        </div>
      );
    } else if (severity === 'mild' || consecutiveTime > mildDelay) {
      return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <div className="flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            <div>
              <p className="font-bold">{t('monitor.alerts.mild.title')}</p>
              <p className="text-sm">{t('monitor.alerts.mild.message')}</p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-800">{t('monitor.title')}</h4>
        <button
          onClick={resetSlouchingStats}
          className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
        >
          {t('monitor.reset')}
        </button>
      </div>

      {getSlouchingAlert()}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-blue-600 font-medium">{t('monitor.continuousTime')}</p>
          <p className="text-lg font-bold text-blue-800">
            {slouchingStats.consecutiveSlouchingTime > 0 
              ? formatTime(slouchingStats.consecutiveSlouchingTime)
              : `0${t('monitor.formatTime.seconds')}`
            }
          </p>
        </div>
        
        <div className="bg-purple-50 p-3 rounded">
          <p className="text-purple-600 font-medium">{t('monitor.totalTime')}</p>
          <p className="text-lg font-bold text-purple-800">
            {formatTime(slouchingStats.totalSlouchingTime + slouchingStats.consecutiveSlouchingTime)}
          </p>
        </div>
        
        <div className="bg-red-50 p-3 rounded">
          <p className="text-red-600 font-medium">{t('monitor.count')}</p>
          <p className="text-lg font-bold text-red-800">
            {slouchingStats.slouchingEvents}
          </p>
        </div>
        
        <div className="bg-green-50 p-3 rounded">
          <p className="text-green-600 font-medium">{t('monitor.currentStatus')}</p>
          <p className="text-lg font-bold text-green-800">
            {postureAnalysis?.isSlouchingDetected ? t('monitor.statusSlouching') : t('monitor.statusNormal')}
          </p>
        </div>
      </div>

      {postureAnalysis?.isSlouchingDetected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h5 className="font-medium text-yellow-800 mb-2">{t('monitor.improvementTips.title')}</h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• {t('monitor.improvementTips.tip1')}</li>
            <li>• {t('monitor.improvementTips.tip2')}</li>
            {postureAnalysis.gazeDirection === 'down' && (
              <>
                <li>• {t('monitor.improvementTips.tip7')}</li>
                <li>• {t('monitor.improvementTips.tip8')}</li>
                <li>• {t('monitor.improvementTips.tip9')}</li>
              </>
            )}
            <li>• {t('monitor.improvementTips.tip10')}</li>
            <li>• {t('monitor.improvementTips.tip11')}</li>
          </ul>
          
          {postureAnalysis.gazeDirection === 'down' && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700 text-xs font-medium">
                ⚠️ 下向き姿勢検出中：首や肩への負担が増加しています
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};