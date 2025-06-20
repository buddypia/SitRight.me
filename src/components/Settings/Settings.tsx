'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { BaselineCapture } from '@/components/BaselineCapture';

export const Settings = () => {
  const { settings, updateSettings, resetSettings, isSettingsOpen, setSettingsOpen } = useSettingsStore();
  const [showHelp, setShowHelp] = useState(false);

  if (!isSettingsOpen) return null;

  const handleNumberChange = (path: string[], value: number) => {
    const updateObj: any = {};
    let current = updateObj;
    
    for (let i = 0; i < path.length - 1; i++) {
      current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    
    updateSettings(updateObj);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">姿勢検出設定</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{showHelp ? 'ヘルプを閉じる' : '設定ヘルプ'}</span>
            </button>
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* ヘルプセクション */}
        {showHelp && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              検出閾値設定ガイド
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded">
                <h4 className="font-medium text-blue-700 mb-2">👁️ 顔の下向き検出閾値</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>重度</strong>: 15-30 (顔が大きく下を向いている)</li>
                  <li>• <strong>中度</strong>: 10-20 (明らかに下向き)</li>
                  <li>• <strong>軽度</strong>: 5-12 (少し下向き)</li>
                  <li>• <strong>最小</strong>: 2-8 (わずかな下向き)</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  数値が小さいほど敏感に検出します。作業に集中する際は軽度・最小を高めに設定すると良いでしょう。
                </p>
              </div>
              
              <div className="bg-white p-3 rounded">
                <h4 className="font-medium text-blue-700 mb-2">🧠 頭の前傾検出閾値</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>重度</strong>: 0.08-0.2 (頭が大きく前に出ている)</li>
                  <li>• <strong>中度</strong>: 0.05-0.15 (明らかな前傾)</li>
                  <li>• <strong>軽度</strong>: 0.02-0.1 (少し前傾)</li>
                  <li>• <strong>最小</strong>: 0.01-0.08 (わずかな前傾)</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  3次元での頭の位置変化を検出。モニターとの距離に応じて調整してください。
                </p>
              </div>
              
              <div className="bg-white p-3 rounded">
                <h4 className="font-medium text-blue-700 mb-2">🏃 背中の丸まり検出閾値</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>重度</strong>: 20-35° (背中が大きく丸まっている)</li>
                  <li>• <strong>中度</strong>: 12-25° (明らかな丸まり)</li>
                  <li>• <strong>軽度</strong>: 6-18° (少し丸まっている)</li>
                  <li>• <strong>最小</strong>: 3-12° (わずかな丸まり)</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  肩と腰の角度から背中の曲がりを検出。椅子の背もたれの角度に応じて調整してください。
                </p>
              </div>
              
              <div className="bg-white p-3 rounded">
                <h4 className="font-medium text-blue-700 mb-2">🔔 アラート設定</h4>
                <ul className="space-y-1 text-gray-700">
                  <li>• <strong>通知までの時間</strong>: 悪い姿勢が何秒続いたら通知するか</li>
                  <li>• <strong>通知間隔</strong>: 通知を受けた後、次の通知まで何秒待つか</li>
                  <li>• <strong>表示時間</strong>: 重度の警告を何秒表示するか</li>
                </ul>
                <p className="text-xs text-gray-600 mt-2">
                  作業の集中度に応じて調整。頻繁な通知が邪魔な場合は間隔を長くしてください。
                </p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-medium text-yellow-800 mb-2">💡 調整のコツ</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• まず基準姿勢を正しく設定してから閾値を調整してください</li>
                <li>• 最初はデフォルト値で試し、検出が敏感すぎる場合は数値を上げてください</li>
                <li>• 検出が鈍い場合は数値を下げてください</li>
                <li>• 作業環境（椅子の高さ、モニターの位置）によって最適値は変わります</li>
                <li>• 「デフォルトに戻す」ボタンで初期値に戻すことができます</li>
              </ul>
            </div>
          </div>
        )}

        {/* 基準姿勢設定セクション */}
        <div className="mb-6">
          <BaselineCapture />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 顔の下向き検出閾値 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-800">👁️ 顔の下向き検出閾値</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重度 (現在: {settings.faceDownThresholds.severe})
                </label>
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="1"
                  value={settings.faceDownThresholds.severe}
                  onChange={(e) => handleNumberChange(['faceDownThresholds', 'severe'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  中度 (現在: {settings.faceDownThresholds.moderate})
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="1"
                  value={settings.faceDownThresholds.moderate}
                  onChange={(e) => handleNumberChange(['faceDownThresholds', 'moderate'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  軽度 (現在: {settings.faceDownThresholds.mild})
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="0.5"
                  value={settings.faceDownThresholds.mild}
                  onChange={(e) => handleNumberChange(['faceDownThresholds', 'mild'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最小警告 (現在: {settings.faceDownThresholds.minimal})
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="0.5"
                  value={settings.faceDownThresholds.minimal}
                  onChange={(e) => handleNumberChange(['faceDownThresholds', 'minimal'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* 頭の前傾検出閾値 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-800">🧠 頭の前傾検出閾値</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重度 (現在: {settings.headForwardThresholds.severe.toFixed(3)})
                </label>
                <input
                  type="range"
                  min="0.08"
                  max="0.2"
                  step="0.01"
                  value={settings.headForwardThresholds.severe}
                  onChange={(e) => handleNumberChange(['headForwardThresholds', 'severe'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  中度 (現在: {settings.headForwardThresholds.moderate.toFixed(3)})
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.15"
                  step="0.005"
                  value={settings.headForwardThresholds.moderate}
                  onChange={(e) => handleNumberChange(['headForwardThresholds', 'moderate'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  軽度 (現在: {settings.headForwardThresholds.mild.toFixed(3)})
                </label>
                <input
                  type="range"
                  min="0.02"
                  max="0.1"
                  step="0.005"
                  value={settings.headForwardThresholds.mild}
                  onChange={(e) => handleNumberChange(['headForwardThresholds', 'mild'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最小警告 (現在: {settings.headForwardThresholds.minimal.toFixed(3)})
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.08"
                  step="0.005"
                  value={settings.headForwardThresholds.minimal}
                  onChange={(e) => handleNumberChange(['headForwardThresholds', 'minimal'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* 背中の丸まり検出閾値 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-800">🏃 背中の丸まり検出閾値</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重度 (現在: {settings.backCurvatureThresholds.severe}°)
                </label>
                <input
                  type="range"
                  min="15"
                  max="35"
                  step="1"
                  value={settings.backCurvatureThresholds.severe}
                  onChange={(e) => handleNumberChange(['backCurvatureThresholds', 'severe'], parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  中度 (現在: {settings.backCurvatureThresholds.moderate}°)
                </label>
                <input
                  type="range"
                  min="8"
                  max="25"
                  step="1"
                  value={settings.backCurvatureThresholds.moderate}
                  onChange={(e) => handleNumberChange(['backCurvatureThresholds', 'moderate'], parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  軽度 (現在: {settings.backCurvatureThresholds.mild}°)
                </label>
                <input
                  type="range"
                  min="4"
                  max="18"
                  step="1"
                  value={settings.backCurvatureThresholds.mild}
                  onChange={(e) => handleNumberChange(['backCurvatureThresholds', 'mild'], parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  最小警告 (現在: {settings.backCurvatureThresholds.minimal}°)
                </label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={settings.backCurvatureThresholds.minimal}
                  onChange={(e) => handleNumberChange(['backCurvatureThresholds', 'minimal'], parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* アラート設定 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3 text-gray-800">🔔 アラート設定</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  通知までの時間 (現在: {settings.alertSettings.notificationDelay / 1000}秒)
                </label>
                <input
                  type="range"
                  min="3"
                  max="30"
                  step="1"
                  value={settings.alertSettings.notificationDelay / 1000}
                  onChange={(e) => handleNumberChange(['alertSettings', 'notificationDelay'], parseInt(e.target.value) * 1000)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  通知間隔 (現在: {settings.alertSettings.notificationInterval / 1000}秒)
                </label>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={settings.alertSettings.notificationInterval / 1000}
                  onChange={(e) => handleNumberChange(['alertSettings', 'notificationInterval'], parseInt(e.target.value) * 1000)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  重度アラート表示時間 (現在: {settings.alertSettings.visualAlertDelay.severe / 1000}秒)
                </label>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="2"
                  value={settings.alertSettings.visualAlertDelay.severe / 1000}
                  onChange={(e) => handleNumberChange(['alertSettings', 'visualAlertDelay', 'severe'], parseInt(e.target.value) * 1000)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={resetSettings}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            デフォルトに戻す
          </button>
          
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );
};