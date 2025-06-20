'use client';

import { useEffect } from 'react';
import { usePoseStore } from '@/stores/poseStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { PostureAnalyzer } from '@/utils/postureAnalysis';

export const usePostureAnalysis = () => {
  const { currentPose, setPostureAnalysis, updateSlouchingStats, baselinePosture, addDeviationToHistory, getSmoothedDeviation, addScoreToHistory, getSmoothedScore, updateFeedback, getStabilizedFeedback } = usePoseStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    if (currentPose && currentPose.landmarks.length > 0) {
      const analysis = PostureAnalyzer.analyzePosture(currentPose.landmarks, settings, baselinePosture || undefined);
      
      // 偏差がある場合は移動平均でスムージング
      if (analysis.deviationFromBaseline && baselinePosture) {
        addDeviationToHistory(analysis.deviationFromBaseline.deviationPercentage);
        const smoothedDeviation = getSmoothedDeviation();
        
        // スムージングされた偏差で再計算
        analysis.deviationFromBaseline = {
          ...analysis.deviationFromBaseline,
          deviationPercentage: smoothedDeviation
        };
        
        // スムージングされた偏差の情報を更新（フィードバックはpostureAnalysis.tsで決定）
        analysis.deviationFromBaseline.deviationPercentage = smoothedDeviation;
      }
      
      // スコアを履歴に追加してスムージング
      addScoreToHistory(analysis.score);
      const smoothedScore = getSmoothedScore();
      analysis.score = smoothedScore;
      
      // フィードバックを安定化
      updateFeedback(analysis.feedback);
      const stabilizedFeedback = getStabilizedFeedback();
      analysis.feedback = stabilizedFeedback;
      
      const isSlouchingDetected = analysis.status === 'poor' && 
        (analysis.feedback.includes('猫背') || 
         analysis.feedback.includes('頭が前に出て') ||
         analysis.feedback.includes('下向き') ||
         analysis.feedback.includes('視線') ||
         analysis.feedback.includes('ズレ'));
      
      analysis.isSlouchingDetected = isSlouchingDetected;
      
      if (isSlouchingDetected) {
        if (analysis.feedback.includes('重度') || analysis.feedback.includes('深刻') || analysis.feedback.includes('緊急')) {
          analysis.slouchingSeverity = 'severe';
        } else if (analysis.feedback.includes('軽度')) {
          analysis.slouchingSeverity = 'mild';
        } else {
          analysis.slouchingSeverity = 'moderate';
        }
      }
      
      setPostureAnalysis(analysis);
      updateSlouchingStats(isSlouchingDetected, settings);
    } else {
      setPostureAnalysis(null);
    }
  }, [currentPose, settings, baselinePosture, setPostureAnalysis, updateSlouchingStats, addDeviationToHistory, getSmoothedDeviation, addScoreToHistory, getSmoothedScore, updateFeedback, getStabilizedFeedback]);

  return null;
};
