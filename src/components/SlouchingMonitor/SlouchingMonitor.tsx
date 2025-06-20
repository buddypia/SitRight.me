'use client';

import { usePoseStore } from '@/stores/poseStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useEffect } from 'react';

export const SlouchingMonitor = () => {
  const { slouchingStats, postureAnalysis, resetSlouchingStats } = usePoseStore();
  const { settings } = useSettingsStore();

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
      return `${hours}時間${minutes % 60}分`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
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
              <p className="font-bold">緊急アラート！</p>
              <p className="text-sm">深刻な猫背が検出されています。すぐに姿勢を正してください。</p>
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
              <p className="font-bold">注意</p>
              <p className="text-sm">猫背が続いています。姿勢を意識してください。</p>
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
              <p className="font-bold">軽度の猫背</p>
              <p className="text-sm">猫背の兆候があります。早めに姿勢を修正してください。</p>
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
        <h4 className="font-semibold text-gray-800">猫背監視統計</h4>
        <button
          onClick={resetSlouchingStats}
          className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
        >
          リセット
        </button>
      </div>

      {getSlouchingAlert()}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-blue-600 font-medium">連続猫背時間</p>
          <p className="text-lg font-bold text-blue-800">
            {slouchingStats.consecutiveSlouchingTime > 0 
              ? formatTime(slouchingStats.consecutiveSlouchingTime)
              : '0秒'
            }
          </p>
        </div>
        
        <div className="bg-purple-50 p-3 rounded">
          <p className="text-purple-600 font-medium">総猫背時間</p>
          <p className="text-lg font-bold text-purple-800">
            {formatTime(slouchingStats.totalSlouchingTime + slouchingStats.consecutiveSlouchingTime)}
          </p>
        </div>
        
        <div className="bg-red-50 p-3 rounded">
          <p className="text-red-600 font-medium">猫背発生回数</p>
          <p className="text-lg font-bold text-red-800">
            {slouchingStats.slouchingEvents}回
          </p>
        </div>
        
        <div className="bg-green-50 p-3 rounded">
          <p className="text-green-600 font-medium">現在の状態</p>
          <p className="text-lg font-bold text-green-800">
            {postureAnalysis?.isSlouchingDetected ? '🔴 猫背中' : '🟢 正常'}
          </p>
        </div>
      </div>

      {postureAnalysis?.isSlouchingDetected && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h5 className="font-medium text-yellow-800 mb-2">改善のヒント</h5>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 背筋を伸ばし、肩の力を抜きましょう</li>
            <li>• あごを軽く引いて、頭を肩の上に乗せましょう</li>
            {postureAnalysis.gazeDirection === 'down' && (
              <>
                <li>• 📱 画面を目線の高さまで上げてください</li>
                <li>• 👀 視線を正面に向け、下向きを避けましょう</li>
                <li>• 🖥️ モニターの高さを調整してください</li>
              </>
            )}
            <li>• デスクの高さや椅子の位置を調整してみてください</li>
            <li>• 30分に一度、立ち上がって軽くストレッチしましょう</li>
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