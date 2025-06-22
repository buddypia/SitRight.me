'use client';

import { useState, useCallback } from 'react';
import { usePoseStore } from '@/stores/poseStore';
import { BaselinePosture } from '@/types/pose';
import { PostureAnalyzer } from '@/utils/postureAnalysis';
import { useTranslation } from 'react-i18next';

export const BaselineCapture = () => {
  const { currentPose, baselinePosture, setBaselinePosture, clearBaselinePosture, resetScoreToFullPoints } = usePoseStore();
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureCountdown, setCaptureCountdown] = useState(0);
  const { t } = useTranslation();

  const handleCaptureBaseline = useCallback(() => {
    if (!currentPose?.landmarks) {
      alert(t('baseline.error'));
      return;
    }

    setIsCapturing(true);
    setCaptureCountdown(3);

    const countdown = setInterval(() => {
      setCaptureCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          
          // 現在の姿勢の角度を計算
          const currentAnalysis = PostureAnalyzer.analyzePosture(currentPose.landmarks);
          
          // 基準姿勢をキャプチャ
          const baseline: BaselinePosture = {
            landmarks: [...currentPose.landmarks],
            timestamp: Date.now(),
            description: t('baseline.status.hasBaseline'),
            baselineAngles: {
              neckAngle: currentAnalysis.angles.neckAngle,
              shoulderAngle: currentAnalysis.angles.shoulderAngle,
              backAngle: currentAnalysis.angles.backAngle,
              gazeAngle: currentAnalysis.angles.gazeAngle,
              faceAngle: currentAnalysis.angles.faceAngle,
            }
          };
          
          setBaselinePosture(baseline);
          setIsCapturing(false);
          
          // スコアを満点にリセット
          resetScoreToFullPoints();
          
          // 基準姿勢をlocalStorageに保存
          localStorage.setItem('sitsmart_baseline', JSON.stringify(baseline));
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentPose, setBaselinePosture, resetScoreToFullPoints, t]);

  const handleClearBaseline = useCallback(() => {
    clearBaselinePosture();
    localStorage.removeItem('sitsmart_baseline');
  }, [clearBaselinePosture]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">{t('baseline.title')}</h3>
        <p className="text-blue-700 text-sm mb-3">
          {t('baseline.description')}
        </p>
        
        {baselinePosture ? (
          <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-800 font-medium">{t('baseline.status.hasBaseline')}</p>
                <p className="text-green-600 text-xs">
                  設定日時: {formatDate(baselinePosture.timestamp)}
                </p>
              </div>
              <button
                onClick={handleClearBaseline}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                {t('posture.baseline.clear')}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
            <p className="text-yellow-800 text-sm">
              {t('baseline.status.noBaseline')}
            </p>
          </div>
        )}

        {isCapturing && captureCountdown > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded p-3 mb-3 text-center">
            <p className="text-orange-800 font-bold text-lg">
              {t('baseline.countdown.ready')}
            </p>
            <p className="text-orange-600 text-3xl font-bold">
              {captureCountdown}
            </p>
            <p className="text-orange-600 text-sm">
              {t('baseline.instructions')}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleCaptureBaseline}
            disabled={isCapturing || !currentPose?.landmarks}
            className={`px-4 py-2 rounded font-medium text-white transition-colors ${
              isCapturing || !currentPose?.landmarks
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isCapturing ? t('baseline.countdown.ready') : t('baseline.buttons.capture')}
          </button>
          
          {baselinePosture && (
            <button
              onClick={handleCaptureBaseline}
              disabled={isCapturing || !currentPose?.landmarks}
              className={`px-4 py-2 rounded font-medium text-white transition-colors ${
                isCapturing || !currentPose?.landmarks
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {t('baseline.buttons.recapture')}
            </button>
          )}
        </div>

        {!currentPose?.landmarks && (
          <p className="text-red-600 text-xs mt-2">
            {t('baseline.error')}
          </p>
        )}
      </div>

      {baselinePosture && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">{t('baseline.details.title')}</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>{t('baseline.details.landmarkCount', { count: baselinePosture.landmarks.length })}</p>
            <p>{t('baseline.details.timestamp', { date: formatDate(baselinePosture.timestamp) })}</p>
            <div className="bg-white p-2 rounded border text-xs">
              <p className="font-medium mb-1">主要部位の座標 (正規化):</p>
              {baselinePosture.landmarks.slice(0, 5).map((landmark, index) => (
                <p key={index}>
                  Point {index}: ({landmark.x.toFixed(3)}, {landmark.y.toFixed(3)}, {landmark.z.toFixed(3)})
                </p>
              ))}
              <p className="text-gray-500 mt-1">{t('baseline.details.additionalPoints', { count: baselinePosture.landmarks.length - 5 })}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};