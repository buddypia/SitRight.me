import { PoseLandmark, PostureAnalysis, BaselinePosture } from '@/types/pose';
import { PostureSettings, DEFAULT_SETTINGS } from '@/types/settings';

export class PostureAnalyzer {
  static calculateAngle(
    pointA: PoseLandmark,
    pointB: PoseLandmark,
    pointC: PoseLandmark
  ): number {
    const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
                    Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    
    if (angle > 180.0) {
      angle = 360 - angle;
    }
    
    return angle;
  }

  static calculateDistance(pointA: PoseLandmark, pointB: PoseLandmark): number {
    return Math.sqrt(
      Math.pow(pointB.x - pointA.x, 2) + 
      Math.pow(pointB.y - pointA.y, 2) + 
      Math.pow(pointB.z - pointA.z, 2)
    );
  }

  static calculateBaselineAngles(landmarks: PoseLandmark[]): {
    neckAngle: number;
    shoulderAngle: number;
    gazeAngle: number;
    faceAngle: number;
  } {
    if (landmarks.length < 33) {
      return {
        neckAngle: 0,
        shoulderAngle: 0,
        gazeAngle: 0,
        faceAngle: 0,
      };
    }

    // ランドマークの取得
    const nose = landmarks[0];
    const leftEye = landmarks[1];
    const rightEye = landmarks[2];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    // 中点の計算
    const eyeMidpoint = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
      z: (leftEye.z + rightEye.z) / 2,
    };

    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
    };

    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2,
    };

    const mouthMidpoint = {
      x: (landmarks[9].x + landmarks[10].x) / 2,
      y: (landmarks[9].y + landmarks[10].y) / 2,
      z: (landmarks[9].z + landmarks[10].z) / 2,
    };

    // 角度の計算
    const headForwardDistance = Math.abs(shoulderMidpoint.z - eyeMidpoint.z);
    const headVerticalOffset = eyeMidpoint.y - shoulderMidpoint.y;

    const neckAngle = Math.abs(Math.atan2(headForwardDistance, Math.abs(headVerticalOffset)) * 180 / Math.PI);
    const shoulderAngle = Math.abs(leftShoulder.y - rightShoulder.y) * 100;
    const faceAngle = Math.abs(Math.atan2(nose.y - eyeMidpoint.y, Math.abs(nose.z - eyeMidpoint.z || 0.01)) * 180 / Math.PI);
    const gazeAngle = Math.abs(Math.atan2(mouthMidpoint.y - eyeMidpoint.y, Math.abs(mouthMidpoint.z - eyeMidpoint.z || 0.01)) * 180 / Math.PI);

    return {
      neckAngle,
      shoulderAngle,
      gazeAngle,
      faceAngle,
    };
  }

  static normalizeLandmarks(landmarks: PoseLandmark[]): PoseLandmark[] {
    if (landmarks.length < 33) return landmarks;
    
    // 肩の中点を原点として正規化
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const shoulderCenter = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
    };
    
    // 肩幅をスケールの基準とする
    const shoulderWidth = this.calculateDistance(leftShoulder, rightShoulder);
    const scale = shoulderWidth > 0 ? 1 / shoulderWidth : 1;
    
    // 手と腕のランドマークは姿勢判定に影響しないよう除外
    return landmarks.map((landmark, index) => {
      // 腕・手関連のランドマーク（13-22: 肘、手首、手の平、指）は正規化しない
      if (index >= 13 && index <= 22) {
        return landmark;
      }
      
      return {
        x: (landmark.x - shoulderCenter.x) * scale,
        y: (landmark.y - shoulderCenter.y) * scale,
        z: (landmark.z - shoulderCenter.z) * scale,
        visibility: landmark.visibility
      };
    });
  }

  static calculateDeviationFromBaseline(
    currentLandmarks: PoseLandmark[],
    baselineLandmarks: PoseLandmark[]
  ): {
    totalDeviation: number;
    keyPointDeviations: {
      head: number;
      shoulders: number;
      spine: number;
    };
    deviationPercentage: number;
  } {
    if (currentLandmarks.length < 33 || baselineLandmarks.length < 33) {
      return {
        totalDeviation: 0,
        keyPointDeviations: { head: 0, shoulders: 0, spine: 0 },
        deviationPercentage: 0
      };
    }

    // 座標を正規化してから比較
    const normalizedCurrent = this.normalizeLandmarks(currentLandmarks);
    const normalizedBaseline = this.normalizeLandmarks(baselineLandmarks);

    // 姿勢に関連する安定したランドマークのみを使用（腕・手は完全除外）
    const keyPoints = {
      head: [0, 7, 8], // 鼻、左右の耳のみ
      shoulders: [11, 12], // 左右の肩
      spine: [11, 12, 23, 24] // 肩と腰（肘・手首・手の平・指は完全除外）
    };

    let totalDeviation = 0;
    const keyPointDeviations = { head: 0, shoulders: 0, spine: 0 };

    for (const [region, indices] of Object.entries(keyPoints)) {
      let regionDeviation = 0;
      for (const index of indices) {
        const current = normalizedCurrent[index];
        const baseline = normalizedBaseline[index];
        
        // 腕・手のランドマークは計算から除外（13-22）
        if (index >= 13 && index <= 22) {
          continue;
        }
        
        if (current && baseline && current.visibility != null && baseline.visibility != null && current.visibility > 0.5 && baseline.visibility > 0.5) {
          const deviation = this.calculateDistance(current, baseline);
          regionDeviation += deviation;
          totalDeviation += deviation;
        }
      }
      keyPointDeviations[region as keyof typeof keyPointDeviations] = regionDeviation / indices.length;
    }

    const maxPossibleDeviation = 4.0;
    const deviationPercentage = Math.min(100, (totalDeviation / maxPossibleDeviation) * 100);

    return {
      totalDeviation,
      keyPointDeviations,
      deviationPercentage
    };
  }

  static analyzePosture(landmarks: PoseLandmark[], settings?: PostureSettings, baseline?: BaselinePosture): PostureAnalysis {
    const config = settings || DEFAULT_SETTINGS;
    
    if (landmarks.length < 33) {
      return {
        score: 0,
        status: 'poor',
        feedback: 'feedback.noPose',
        angles: { neckAngle: 0, shoulderAngle: 0, gazeAngle: 0, faceAngle: 0 },
        gazeDirection: 'forward'
      };
    }

    let deviationFromBaseline;
    if (baseline?.landmarks) {
      deviationFromBaseline = this.calculateDeviationFromBaseline(landmarks, baseline.landmarks);
    }

    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    
    // 視線・顔向き検出用のランドマーク
    const leftEye = landmarks[1];
    const rightEye = landmarks[2];
    const leftMouth = landmarks[9];
    const rightMouth = landmarks[10];
    // const chin = landmarks[17] || landmarks[0]; // 下あご（利用可能な場合）
    
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
    };

    const earMidpoint = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2,
      z: (leftEar.z + rightEar.z) / 2,
    };

    const eyeMidpoint = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
      z: (leftEye.z + rightEye.z) / 2,
    };

    const mouthMidpoint = {
      x: (leftMouth.x + rightMouth.x) / 2,
      y: (leftMouth.y + rightMouth.y) / 2,
      z: (leftMouth.z + rightMouth.z) / 2,
    };

    // 猫背検出の改善されたメトリクス
    const headForwardDistance = earMidpoint.x - shoulderMidpoint.x;
    const headVerticalOffset = earMidpoint.y - shoulderMidpoint.y;
    
    // 現在の角度を計算
    const currentNeckAngle = Math.abs(Math.atan2(headForwardDistance, Math.abs(headVerticalOffset)) * 180 / Math.PI);
    const currentShoulderAngle = Math.abs(leftShoulder.y - rightShoulder.y) * 100;
    const currentFaceAngle = Math.abs(Math.atan2(nose.y - eyeMidpoint.y, Math.abs(nose.z - eyeMidpoint.z || 0.01)) * 180 / Math.PI);
    const currentGazeAngle = Math.abs(Math.atan2(mouthMidpoint.y - eyeMidpoint.y, Math.abs(mouthMidpoint.z - eyeMidpoint.z || 0.01)) * 180 / Math.PI);

    // 基準姿勢がある場合は基準角度からの偏差を計算
    let neckAngle = currentNeckAngle;
    let shoulderAngle = currentShoulderAngle;
    let faceAngle = currentFaceAngle;
    let gazeVerticalAngle = currentGazeAngle;

    if (baseline?.baselineAngles) {
      // 基準角度からの偏差を計算（絶対値）
      neckAngle = Math.abs(currentNeckAngle - baseline.baselineAngles.neckAngle);
      shoulderAngle = Math.abs(currentShoulderAngle - baseline.baselineAngles.shoulderAngle);
      faceAngle = Math.abs(currentFaceAngle - baseline.baselineAngles.faceAngle);
      gazeVerticalAngle = Math.abs(currentGazeAngle - baseline.baselineAngles.gazeAngle);
    }
    
    // 顔全体の下向き度合い（鼻が目より下にある場合）
    const faceDownwardTilt = nose.y > eyeMidpoint.y ? (nose.y - eyeMidpoint.y) * 100 : 0;
    
    // 視線方向の判定（基準姿勢を考慮して調整）
    let gazeDirection: 'up' | 'forward' | 'down' = 'forward';
    
    // 基準姿勢がある場合は基準からの偏差で判定（最も厳しい閾値）
    if (baseline?.baselineAngles) {
      // 基準角度からの偏差が一定以上の場合に警告
      if (faceAngle > 2 || faceDownwardTilt > config.faceDownThresholds.mild) {
        gazeDirection = 'down';
      } else if (faceAngle > 1) {
        gazeDirection = 'down';
      }
    } else {
      // 基準姿勢がない場合は従来の絶対値での判定
      if (faceAngle > 30 || faceDownwardTilt > config.faceDownThresholds.mild) {
        gazeDirection = 'down';
      } else if (faceAngle < -20) {
        gazeDirection = 'up';
      }
    }

    let score = 100;
    let feedback = 'feedback.goodPosture';
    let status: 'good' | 'warning' | 'poor' = 'good';

    // 猫背判定（首の角度、肩の角度、顔の角度で判定）
    if (baseline?.baselineAngles) {
      // 基準姿勢がある場合：偏差で判定
      const neckIsBad = neckAngle > 3;
      const shoulderIsBad = shoulderAngle > 4;
      const faceIsBad = faceAngle > 2;

      if (neckIsBad && shoulderIsBad) {
        score -= config.scoringSettings.severePenalty;
        feedback = 'feedback.postureAnalysis.slouching.neckAndShoulder';
        status = 'poor';
      } else if (neckIsBad && faceIsBad) {
        score -= config.scoringSettings.severePenalty;
        feedback = 'feedback.postureAnalysis.slouching.neckAndFace';
        status = 'poor';
      } else if (neckIsBad) {
        score -= config.scoringSettings.moderatePenalty;
        feedback = 'feedback.postureAnalysis.slouching.neck';
        status = 'poor';
      } else if (shoulderIsBad) {
        score -= config.scoringSettings.mildPenalty;
        feedback = 'feedback.postureAnalysis.slouching.shoulder';
        status = 'warning';
      } else if (faceIsBad) {
        score -= config.scoringSettings.mildPenalty;
        feedback = 'feedback.postureAnalysis.slouching.face';
        status = 'warning';
      }
    } else {
      // 基準姿勢がない場合：絶対値で判定
      const neckIsBad = headForwardDistance > config.headForwardThresholds.moderate;
      const shoulderIsBad = shoulderAngle > 6;
      const faceIsBad = faceAngle > 25;

      if (neckIsBad && shoulderIsBad) {
        score -= config.scoringSettings.severePenalty;
        feedback = 'feedback.postureAnalysis.slouching.neckAndShoulder';
        status = 'poor';
      } else if (neckIsBad && faceIsBad) {
        score -= config.scoringSettings.severePenalty;
        feedback = 'feedback.postureAnalysis.slouching.neckAndFace';
        status = 'poor';
      } else if (neckIsBad) {
        score -= config.scoringSettings.moderatePenalty;
        feedback = 'feedback.postureAnalysis.slouching.neck';
        status = 'poor';
      } else if (shoulderIsBad) {
        score -= config.scoringSettings.mildPenalty;
        feedback = 'feedback.postureAnalysis.slouching.shoulder';
        status = 'warning';
      } else if (faceIsBad) {
        score -= config.scoringSettings.mildPenalty;
        feedback = 'feedback.postureAnalysis.slouching.face';
        status = 'warning';
      }
    }

    score = Math.max(0, score);

    // スコアベースのステータス調整
    if (score >= config.scoringSettings.goodPostureThreshold) {
      status = 'good';
    } else if (score >= config.scoringSettings.warningThreshold) {
      status = 'warning';
    } else {
      status = 'poor';
    }

    return {
      score,
      status,
      feedback,
      angles: {
        neckAngle: Math.round(neckAngle),
        shoulderAngle: Math.round(shoulderAngle),
        gazeAngle: Math.round(gazeVerticalAngle),
        faceAngle: Math.round(faceAngle),
      },
      gazeDirection,
      deviationFromBaseline,
    };
  }
}
