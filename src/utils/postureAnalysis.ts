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
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    // 中点の計算
    const eyeMidpoint = {
      x: (leftEye.x + rightEye.x) / 2,
      y: (leftEye.y + rightEye.y) / 2,
      z: (leftEye.z + rightEye.z) / 2,
    };

    const earMidpoint = {
      x: (leftEar.x + rightEar.x) / 2,
      y: (leftEar.y + rightEar.y) / 2,
      z: (leftEar.z + rightEar.z) / 2,
    };

    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2,
      z: (leftShoulder.z + rightShoulder.z) / 2,
    };

    // 垂直方向の角度計算
    // 首の角度：耳の中点から肩の中点への垂直方向の角度
    const neckVerticalAngle = Math.atan2(
      Math.abs(earMidpoint.y - shoulderMidpoint.y),
      Math.abs(earMidpoint.x - shoulderMidpoint.x)
    ) * 180 / Math.PI;

    // 肩の角度：左右の肩の垂直方向の差
    const shoulderVerticalAngle = Math.atan2(
      Math.abs(leftShoulder.y - rightShoulder.y),
      Math.abs(leftShoulder.x - rightShoulder.x)
    ) * 180 / Math.PI;

    // 顔の角度：鼻から目の中点への垂直方向の角度
    const faceVerticalAngle = Math.atan2(
      Math.abs(nose.y - eyeMidpoint.y),
      Math.abs(nose.x - eyeMidpoint.x)
    ) * 180 / Math.PI;

    // 視線角度：目から鼻への垂直方向の角度（顔の下向き具合）
    const gazeVerticalAngle = Math.atan2(
      nose.y - eyeMidpoint.y,
      Math.abs(nose.x - eyeMidpoint.x || 0.01)
    ) * 180 / Math.PI;

    return {
      neckAngle: neckVerticalAngle,
      shoulderAngle: shoulderVerticalAngle,
      gazeAngle: gazeVerticalAngle,
      faceAngle: faceVerticalAngle,
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

    // 垂直動きに基づく角度計算
    // 首の垂直角度：耳の中点から肩の中点への垂直方向の角度
    const currentNeckAngle = Math.atan2(
      Math.abs(earMidpoint.y - shoulderMidpoint.y),
      Math.abs(earMidpoint.x - shoulderMidpoint.x)
    ) * 180 / Math.PI;

    // 肩の垂直角度：左右の肩の垂直方向の差
    const currentShoulderAngle = Math.atan2(
      Math.abs(leftShoulder.y - rightShoulder.y),
      Math.abs(leftShoulder.x - rightShoulder.x)
    ) * 180 / Math.PI;

    // 顔の垂直角度：鼻から目の中点への垂直方向の角度
    const currentFaceAngle = Math.atan2(
      Math.abs(nose.y - eyeMidpoint.y),
      Math.abs(nose.x - eyeMidpoint.x)
    ) * 180 / Math.PI;

    // 視線の垂直角度：目から鼻への垂直方向の角度（顔の下向き具合）
    const currentGazeAngle = Math.atan2(
      nose.y - eyeMidpoint.y,
      Math.abs(nose.x - eyeMidpoint.x || 0.01)
    ) * 180 / Math.PI;

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
    const faceDownwardTilt = nose.y > eyeMidpoint.y ? (nose.y - eyeMidpoint.y) * 150 : 0;
    
    // 視線の下向きをより精密に判定
    const eyeToNoseVerticalDistance = Math.abs(nose.y - eyeMidpoint.y);
    const isLookingDown = nose.y > eyeMidpoint.y && eyeToNoseVerticalDistance > 0.01;
    
    // 視線方向の判定（より厳しい闾値）
    let gazeDirection: 'up' | 'forward' | 'down' = 'forward';
    
    // 基準姿勢がある場合は基準からの偏差で判定
    if (baseline?.baselineAngles) {
      // 基準角度からの偏差が一定以上の場合に警告（より厳しい闾値）
      if (isLookingDown || faceAngle > 3 || faceDownwardTilt > config.faceDownThresholds.mild * 0.5) {
        gazeDirection = 'down';
      } else if (faceAngle > 2) {
        gazeDirection = 'down';
      }
    } else {
      // 基準姿勢がない場合は絶対値での判定（より厳しい闾値）
      if (isLookingDown || faceAngle > 8 || faceDownwardTilt > config.faceDownThresholds.mild * 0.7) {
        gazeDirection = 'down';
      } else if (faceAngle < -12) {
        gazeDirection = 'up';
      }
    }

    let score = 100;
    let feedback = 'feedback.goodPosture';
    let status: 'good' | 'warning' | 'poor' = 'good';

    // 猫背判定（首の垂直角度、肩の垂直角度、顔の垂直角度で判定）
    if (baseline?.baselineAngles) {
      // 基準姿勢がある場合：偏差で判定（より厳しい閾値）
      const neckIsBad = neckAngle > 5;
      const shoulderIsBad = shoulderAngle > 6;
      const faceIsBad = faceAngle > 5;

      if (neckIsBad && shoulderIsBad) {
        score -= config.scoringSettings.severePenalty * 1.5;
        feedback = 'feedback.postureAnalysis.slouching.neckAndShoulder';
        status = 'poor';
      } else if (neckIsBad && faceIsBad) {
        score -= config.scoringSettings.severePenalty * 1.5;
        feedback = 'feedback.postureAnalysis.slouching.neckAndFace';
        status = 'poor';
      } else if (neckIsBad) {
        score -= config.scoringSettings.severePenalty;
        feedback = 'feedback.postureAnalysis.slouching.neck';
        status = 'poor';
      } else if (shoulderIsBad) {
        score -= config.scoringSettings.moderatePenalty;
        feedback = 'feedback.postureAnalysis.slouching.shoulder';
        status = 'poor';
      } else if (faceIsBad) {
        score -= config.scoringSettings.moderatePenalty;
        feedback = 'feedback.postureAnalysis.slouching.face';
        status = 'poor';
      }
    } else {
      // 基準姿勢がない場合：絶対値で判定（より厳しい閾値）
      const neckIsBad = neckAngle < 70 || neckAngle > 110;
      const shoulderIsBad = shoulderAngle > 10;
      const faceIsBad = faceAngle > 12;

      if (neckIsBad && shoulderIsBad) {
        score -= config.scoringSettings.severePenalty * 1.5;
        feedback = 'feedback.postureAnalysis.slouching.neckAndShoulder';
        status = 'poor';
      } else if (neckIsBad && faceIsBad) {
        score -= config.scoringSettings.severePenalty * 1.5;
        feedback = 'feedback.postureAnalysis.slouching.neckAndFace';
        status = 'poor';
      } else if (neckIsBad) {
        score -= config.scoringSettings.severePenalty;
        feedback = 'feedback.postureAnalysis.slouching.neck';
        status = 'poor';
      } else if (shoulderIsBad) {
        score -= config.scoringSettings.moderatePenalty;
        feedback = 'feedback.postureAnalysis.slouching.shoulder';
        status = 'poor';
      } else if (faceIsBad) {
        score -= config.scoringSettings.moderatePenalty;
        feedback = 'feedback.postureAnalysis.slouching.face';
        status = 'poor';
      }
    }

    score = Math.max(0, score);

    // 視線が下向きの場合の追加減点
    if (gazeDirection === 'down') {
      score -= config.scoringSettings.mildPenalty;
      if (status === 'good') {
        status = 'warning';
      }
    }

    // スコアベースのステータス調整（より厳しい闾値）
    if (score >= config.scoringSettings.goodPostureThreshold) {
      status = 'good';
    } else if (score >= config.scoringSettings.warningThreshold * 1.2) {
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
