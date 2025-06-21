'use client';

import { usePoseStore } from '@/stores/poseStore';
import { PostureAnalyzer } from '@/utils/postureAnalysis';

export const PostureFeedback = () => {
  const { postureAnalysis, isProcessing, currentPose, baselinePosture, setBaselinePosture, clearBaselinePosture, resetSlouchingStats, resetScoreToFullPoints } = usePoseStore();

  const handleSetBaseline = () => {
    if (currentPose?.landmarks) {
      const baselineAngles = PostureAnalyzer.calculateBaselineAngles(currentPose.landmarks);
      setBaselinePosture({
        landmarks: currentPose.landmarks,
        timestamp: Date.now(),
        description: '基準姿勢',
        baselineAngles
      });
      resetSlouchingStats();
      resetScoreToFullPoints();
    }
  };

  if (isProcessing) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!postureAnalysis) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-gray-600">姿勢を検出中...</p>
      </div>
    );
  }

  const getStatusColor = (status: string, isSlouchingDetected?: boolean) => {
    if (isSlouchingDetected) {
      return 'text-red-600 bg-red-50 border-red-200 animate-pulse';
    }
    
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex flex-col space-y-2">
          {baselinePosture ? (
            <div className="flex items-center justify-between">
              <div className="text-sm text-green-600">
                ✅ 基準姿勢設定済み
              </div>
              <button
                onClick={clearBaselinePosture}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                解除
              </button>
            </div>
          ) : (
            <button
              onClick={handleSetBaseline}
              disabled={!currentPose?.landmarks}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              📐 この姿勢を基準姿勢にする
            </button>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-lg border-2 ${getStatusColor(postureAnalysis.status, postureAnalysis.isSlouchingDetected)}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center">
            姿勢スコア
            {postureAnalysis.isSlouchingDetected && (
              <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-bounce">
                猫背検出
              </span>
            )}
          </h3>
          <span className={`text-2xl font-bold min-w-[3rem] text-right ${getScoreColor(postureAnalysis.score)}`}>
            {postureAnalysis.score}
          </span>
        </div>
        <div className="space-y-3 mb-2">
          <div className="text-xs">
            <span>視線方向:</span>
            <span className={`ml-1 font-mono ${
              postureAnalysis.gazeDirection === 'down' ? 'text-red-600' :
              postureAnalysis.gazeDirection === 'up' ? 'text-blue-600' :
              'text-green-600'
            }`}>
              {postureAnalysis.gazeDirection === 'down' ? '⬇️下向き' :
               postureAnalysis.gazeDirection === 'up' ? '⬆️上向き' :
               '➡️正面'}
            </span>
          </div>
          <div className="text-sm leading-relaxed break-words min-h-[2.5rem] flex items-center">
            {postureAnalysis.feedback}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-semibold mb-3 text-gray-800">詳細データ</h4>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-700">首の角度:</span>
            <span className="font-mono text-gray-900">{postureAnalysis.angles.neckAngle}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">肩の角度:</span>
            <span className="font-mono text-gray-900">{postureAnalysis.angles.shoulderAngle}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">背中の角度:</span>
            <span className="font-mono text-gray-900">{postureAnalysis.angles.backAngle}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700">顔の角度:</span>
            <span className="font-mono text-gray-900">{postureAnalysis.angles.faceAngle}°</span>
          </div>
        </div>
      </div>

      {postureAnalysis.deviationFromBaseline && baselinePosture && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="font-semibold mb-3 text-blue-800">📐 基準姿勢からのズレ</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-blue-800">総合ズレ度:</span>
              <div className="flex items-center">
                <span className={`font-bold ${
                  postureAnalysis.deviationFromBaseline.deviationPercentage > 70 ? 'text-red-600' :
                  postureAnalysis.deviationFromBaseline.deviationPercentage > 55 ? 'text-orange-600' :
                  postureAnalysis.deviationFromBaseline.deviationPercentage > 30 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {Math.round(postureAnalysis.deviationFromBaseline.deviationPercentage)}%
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="text-center">
                <div className="text-xs text-gray-600">頭部</div>
                <div className={`font-bold ${
                  postureAnalysis.deviationFromBaseline.keyPointDeviations.head > 0.25 ? 'text-red-600' :
                  postureAnalysis.deviationFromBaseline.keyPointDeviations.head > 0.18 ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {Math.round(postureAnalysis.deviationFromBaseline.keyPointDeviations.head * 10)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">肩</div>
                <div className={`font-bold ${
                  postureAnalysis.deviationFromBaseline.keyPointDeviations.shoulders > 0.25 ? 'text-red-600' :
                  postureAnalysis.deviationFromBaseline.keyPointDeviations.shoulders > 0.18 ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {Math.round(postureAnalysis.deviationFromBaseline.keyPointDeviations.shoulders * 10)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">背骨</div>
                <div className={`font-bold ${
                  postureAnalysis.deviationFromBaseline.keyPointDeviations.spine > 0.25 ? 'text-red-600' :
                  postureAnalysis.deviationFromBaseline.keyPointDeviations.spine > 0.18 ? 'text-orange-600' :
                  'text-green-600'
                }`}>
                  {Math.round(postureAnalysis.deviationFromBaseline.keyPointDeviations.spine * 10)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};