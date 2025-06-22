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
    backAngle: number;
    gazeAngle: number;
    faceAngle: number;
  } {
    if (landmarks.length < 33) {
      return {
        neckAngle: 0,
        shoulderAngle: 0,
        backAngle: 0,
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
    const shoulderForwardDistance = Math.abs(hipMidpoint.z - shoulderMidpoint.z);

    const neckAngle = Math.abs(Math.atan2(headForwardDistance, Math.abs(headVerticalOffset)) * 180 / Math.PI);
    const backAngle = Math.abs(Math.atan2(shoulderForwardDistance, Math.abs(shoulderMidpoint.y - hipMidpoint.y)) * 180 / Math.PI);
    const shoulderAngle = Math.abs(leftShoulder.y - rightShoulder.y) * 100;
    const faceAngle = Math.abs(Math.atan2(nose.y - eyeMidpoint.y, Math.abs(nose.z - eyeMidpoint.z || 0.01)) * 180 / Math.PI);
    const gazeAngle = Math.abs(Math.atan2(mouthMidpoint.y - eyeMidpoint.y, Math.abs(mouthMidpoint.z - eyeMidpoint.z || 0.01)) * 180 / Math.PI);

    return {
      neckAngle,
      shoulderAngle,
      backAngle,
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
        angles: { neckAngle: 0, shoulderAngle: 0, backAngle: 0, gazeAngle: 0, faceAngle: 0 },
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
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
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

    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2,
      z: (leftHip.z + rightHip.z) / 2,
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
    const shoulderForwardDistance = shoulderMidpoint.x - hipMidpoint.x;
    const headVerticalOffset = earMidpoint.y - shoulderMidpoint.y;
    
    // 現在の角度を計算
    const currentNeckAngle = Math.abs(Math.atan2(headForwardDistance, Math.abs(headVerticalOffset)) * 180 / Math.PI);
    const currentBackAngle = Math.abs(Math.atan2(shoulderForwardDistance, Math.abs(shoulderMidpoint.y - hipMidpoint.y)) * 180 / Math.PI);
    const currentShoulderAngle = Math.abs(leftShoulder.y - rightShoulder.y) * 100;
    const currentFaceAngle = Math.abs(Math.atan2(nose.y - eyeMidpoint.y, Math.abs(nose.z - eyeMidpoint.z || 0.01)) * 180 / Math.PI);
    const currentGazeAngle = Math.abs(Math.atan2(mouthMidpoint.y - eyeMidpoint.y, Math.abs(mouthMidpoint.z - eyeMidpoint.z || 0.01)) * 180 / Math.PI);

    // 基準姿勢がある場合は基準角度からの偏差を計算
    let neckAngle = currentNeckAngle;
    let backCurvature = currentBackAngle;
    let shoulderImbalance = currentShoulderAngle;
    let faceVerticalAngle = currentFaceAngle;
    let gazeVerticalAngle = currentGazeAngle;

    if (baseline?.baselineAngles) {
      // 基準角度からの偏差を計算（絶対値）
      neckAngle = Math.abs(currentNeckAngle - baseline.baselineAngles.neckAngle);
      backCurvature = Math.abs(currentBackAngle - baseline.baselineAngles.backAngle);
      shoulderImbalance = Math.abs(currentShoulderAngle - baseline.baselineAngles.shoulderAngle);
      faceVerticalAngle = Math.abs(currentFaceAngle - baseline.baselineAngles.faceAngle);
      gazeVerticalAngle = Math.abs(currentGazeAngle - baseline.baselineAngles.gazeAngle);
    }
    
    // 顔全体の下向き度合い（鼻が目より下にある場合）
    const faceDownwardTilt = nose.y > eyeMidpoint.y ? (nose.y - eyeMidpoint.y) * 100 : 0;
    
    // 視線方向の判定（基準姿勢を考慮して調整）
    let gazeDirection: 'up' | 'forward' | 'down' = 'forward';
    
    // 基準姿勢がある場合は基準からの偏差で判定（最も厳しい閾値）
    if (baseline?.baselineAngles) {
      // 基準角度からの偏差が一定以上の場合に警告
      if (faceVerticalAngle > 2 || faceDownwardTilt > config.faceDownThresholds.mild) {
        gazeDirection = 'down';
      } else if (faceVerticalAngle > 1) {
        gazeDirection = 'down';
      }
    } else {
      // 基準姿勢がない場合は従来の絶対値での判定
      if (faceVerticalAngle > 30 || faceDownwardTilt > config.faceDownThresholds.mild) {
        gazeDirection = 'down';
      } else if (faceVerticalAngle < -20) {
        gazeDirection = 'up';
      }
    }

    let score = 100;
    let feedback = 'feedback.goodPosture';
    let status: 'good' | 'warning' | 'poor' = 'good';
    let isSlouchingDetected = false;

    // 基準姿勢がある場合の初期設定
    let baselineFeedback = '';
    let baselineStatus: 'good' | 'warning' | 'poor' = 'good';
    
    if (deviationFromBaseline) {
      const deviation = deviationFromBaseline.deviationPercentage;
      if (deviation <= 30) {
        baselineFeedback = 'feedback.baselineKeeping';
        baselineStatus = 'good';
        // 基準姿勢内であれば高いスコアを保持
        score = Math.max(score, 95);
      } else if (deviation > 70) {
        score -= 12;
        baselineFeedback = 'feedback.baselineComparison.multipleConcerns';
        baselineStatus = 'poor';
      } else if (deviation > 55) {
        score -= 6;
        baselineFeedback = 'feedback.baselineComparison.neckForward';
        baselineStatus = 'warning';
      } else if (deviation > 45) {
        score -= 3;
        baselineFeedback = 'feedback.postureAnalysis.baseline.slightDeviation';
        baselineStatus = 'warning';
      }
      
      // 基準姿勢があるときの初期フィードバック設定
      feedback = baselineFeedback;
      status = baselineStatus;
    }

    // 猫背の詳細判定（基準姿勢がある場合は角度偏差で判定）
    if (baseline?.baselineAngles) {
      // 基準姿勢からの角度偏差で猫背判定（最も厳しい閾値）
      if (neckAngle > 3) {
        score -= config.scoringSettings.severePenalty;
        feedback = 'feedback.postureAnalysis.baseline.neckAngleDeviation';
        status = 'poor';
        isSlouchingDetected = true;
      } else if (neckAngle > 2) {
        score -= config.scoringSettings.moderatePenalty;
        feedback = 'feedback.postureAnalysis.baseline.neckAngleWarning';
        status = 'poor';
        isSlouchingDetected = true;
      } else if (neckAngle > 1) {
        score -= config.scoringSettings.mildPenalty;
        feedback = 'feedback.postureAnalysis.baseline.neckAngleCorrect';
        status = 'warning';
        isSlouchingDetected = true;
      }
    } else {
      // 基準姿勢がない場合は従来の絶対値判定
      if (headForwardDistance > config.headForwardThresholds.severe) {
        score -= config.scoringSettings.severePenalty;
        feedback = 'feedback.postureAnalysis.slouching.severeHeadForward';
        status = 'poor';
        isSlouchingDetected = true;
      } else if (headForwardDistance > config.headForwardThresholds.moderate) {
        score -= config.scoringSettings.moderatePenalty;
        feedback = 'feedback.postureAnalysis.slouching.moderateHeadForward';
        status = 'poor';
        isSlouchingDetected = true;
      } else if (headForwardDistance > config.headForwardThresholds.mild) {
        score -= config.scoringSettings.mildPenalty;
        feedback = 'feedback.postureAnalysis.slouching.mildHeadForward';
        status = 'warning';
        isSlouchingDetected = true;
      }
    }

    if (baseline?.baselineAngles) {
      // 基準姿勢からの背中角度偏差で判定（最も厳しい閾値）
      if (backCurvature > 3) {
        score -= config.scoringSettings.severePenalty;
        if (isSlouchingDetected) {
          feedback = 'feedback.postureAnalysis.baseline.complexPosturalIssue';
        } else {
          feedback = 'feedback.postureAnalysis.baseline.backAngleDeviation';
        }
        status = 'poor';
        isSlouchingDetected = true;
      } else if (backCurvature > 2) {
        score -= config.scoringSettings.moderatePenalty;
        if (isSlouchingDetected) {
          feedback = 'feedback.postureAnalysis.baseline.complexPosturalProblem';
        } else {
          feedback = 'feedback.postureAnalysis.baseline.backAngleWarning';
        }
        status = 'poor';
        isSlouchingDetected = true;
      } else if (backCurvature > 1) {
        score -= config.scoringSettings.mildPenalty;
        if (!isSlouchingDetected) {
          feedback = 'feedback.postureAnalysis.baseline.backAngleCorrect';
          status = 'warning';
          isSlouchingDetected = true;
        }
      }
    } else {
      // 基準姿勢がない場合は従来の絶対値判定
      if (backCurvature > config.backCurvatureThresholds.severe) {
        score -= config.scoringSettings.severePenalty;
        if (isSlouchingDetected) {
          feedback = 'feedback.postureAnalysis.slouching.severeBackRounded';
        } else {
          feedback = 'feedback.postureAnalysis.slouching.severeBackOnly';
        }
        status = 'poor';
        isSlouchingDetected = true;
      } else if (backCurvature > config.backCurvatureThresholds.moderate) {
        score -= config.scoringSettings.moderatePenalty;
        if (isSlouchingDetected) {
          feedback = '🚨 猫背が複合的に発生しています。姿勢を正してください。';
        } else {
          feedback = '⚠️ 背中が丸まっています。背筋を伸ばしてください。';
        }
        status = 'poor';
        isSlouchingDetected = true;
      } else if (backCurvature > config.backCurvatureThresholds.mild) {
        score -= config.scoringSettings.mildPenalty;
        if (!isSlouchingDetected) {
          feedback = '⚠️ 背中が少し丸まっています。姿勢を意識してください。';
          status = 'warning';
          isSlouchingDetected = true;
        }
      }
    }

    if (shoulderImbalance > 6) {
      score -= 20;
      if (!isSlouchingDetected) {
        feedback = '⚠️ 肩の高さが不均等です。バランスを整えてください。';
        status = 'warning';
      }
    } else if (shoulderImbalance > 3) {
      score -= 10;
      if (!isSlouchingDetected) {
        feedback = '肩のバランスを意識してください。';
        status = 'warning';
      }
    }

    // 複合的な猫背パターンの検出（より厳しい判定）
    if (headForwardDistance > 0.02 && backCurvature > 4) {
      score -= 20;
      feedback = 'feedback.postureAnalysis.slouching.complexSlouchingDetected';
      status = 'poor';
      isSlouchingDetected = true;
    }

    // 視線・顔向きによる判定（基準姿勢を考慮）
    if (gazeDirection === 'down') {
      if (baseline?.baselineAngles) {
        // 基準姿勢からの顔角度偏差で判定（最も厳しい閾値）
        if (faceVerticalAngle > 3) {
          score -= config.scoringSettings.severePenalty;
          feedback = 'feedback.postureAnalysis.baseline.faceAngleDeviation';
          status = 'poor';
          isSlouchingDetected = true;
        } else if (faceVerticalAngle > 2) {
          score -= config.scoringSettings.moderatePenalty;
          feedback = 'feedback.postureAnalysis.baseline.faceAngleWarning';
          status = 'poor';
          isSlouchingDetected = true;
        } else if (faceVerticalAngle > 1) {
          score -= config.scoringSettings.mildPenalty;
          feedback = 'feedback.postureAnalysis.baseline.faceAngleCorrect';
          status = 'warning';
          isSlouchingDetected = true;
        }
      } else {
        // 基準姿勢がない場合は従来の絶対値判定
        if (faceDownwardTilt > config.faceDownThresholds.severe) {
          score -= config.scoringSettings.severePenalty;
          feedback = 'feedback.postureAnalysis.faceDown.severeFaceDown';
          status = 'poor';
          isSlouchingDetected = true;
        } else if (faceDownwardTilt > config.faceDownThresholds.moderate) {
          score -= config.scoringSettings.moderatePenalty;
          feedback = 'feedback.postureAnalysis.faceDown.faceDown';
          status = 'poor';
          isSlouchingDetected = true;
        } else if (faceDownwardTilt > config.faceDownThresholds.mild) {
          score -= config.scoringSettings.mildPenalty;
          feedback = 'feedback.postureAnalysis.faceDown.gazeUp';
          status = 'warning';
          isSlouchingDetected = true;
        }
      }
    }

    // 複合的な視線+姿勢の猫背判定
    if (gazeDirection === 'down' && headForwardDistance > config.headForwardThresholds.mild) {
      score -= 20;
      feedback = 'feedback.postureAnalysis.faceDown.faceDownHeadForward';
      status = 'poor';
      isSlouchingDetected = true;
    }

    if (gazeDirection === 'down' && backCurvature > config.backCurvatureThresholds.moderate / 2) {
      score -= 15;
      feedback = 'feedback.postureAnalysis.faceDown.backRoundedFaceDown';
      status = 'poor';
      isSlouchingDetected = true;
    }

    // 軽微な猫背でも早期警告
    if (headForwardDistance > config.headForwardThresholds.minimal && 
        backCurvature > config.backCurvatureThresholds.minimal) {
      if (!isSlouchingDetected) {
        score -= 10;
        feedback = 'feedback.postureAnalysis.general.mildPosturalSigns';
        status = 'warning';
        isSlouchingDetected = true;
      }
    }

    // 視線のみの軽微な下向きでも警告
    if (gazeDirection === 'down' && !isSlouchingDetected && 
        faceDownwardTilt > config.faceDownThresholds.minimal) {
      score -= 8;
      feedback = 'feedback.postureAnalysis.general.gazeDownward';
      status = 'warning';
      isSlouchingDetected = true;
    }

    // 緊急度判定（設定可能な基準）
    if (isSlouchingDetected && 
        headForwardDistance > config.headForwardThresholds.moderate && 
        backCurvature > config.backCurvatureThresholds.moderate) {
      feedback = 'feedback.postureAnalysis.general.emergencySlouchingDetected';
      status = 'poor';
    }

    // 視線込みの緊急判定
    if (gazeDirection === 'down' && 
        faceDownwardTilt > config.faceDownThresholds.moderate && 
        (headForwardDistance > config.headForwardThresholds.mild || 
         backCurvature > config.backCurvatureThresholds.mild)) {
      feedback = 'feedback.postureAnalysis.general.emergencySevereFaceDown';
      status = 'poor';
    }

    // 最終的なフィードバック決定
    if (deviationFromBaseline) {
      if (isSlouchingDetected) {
        // 猫背が検出された場合は猫背の詳細を優先
        if (status === 'poor') {
          // すでに適切な猫背フィードバックが設定されているのでそのまま
        } else if (status === 'warning' && baselineStatus === 'good' && score < 85) {
          // 基準姿勢は良好だが軽度の猫背が検出され、かつスコアが85未満の場合のみ
          feedback = 'feedback.postureAnalysis.general.mildPosturalIssue';
        } else if (score >= 85) {
          // スコアが85以上の場合は基準姿勢の良好フィードバックを優先
          feedback = baselineFeedback;
          status = baselineStatus;
        }
      } else {
        // 猫背が検出されていない場合は基準姿勢の判定を使用
        feedback = baselineFeedback;
        status = baselineStatus;
      }
    }

    score = Math.max(0, score);

    // スコアとフィードバックの最終整合性チェック（閾値を統一）
    if (score >= 85 && deviationFromBaseline && !isSlouchingDetected) {
      // 高いスコアで猫背が検出されていない場合は基準姿勢フィードバックを優先
      if (deviationFromBaseline.deviationPercentage <= 30) {
        feedback = 'feedback.baselineKeeping';
        status = 'good';
      } else {
        feedback = 'feedback.postureAnalysis.baseline.excellent';
        status = 'good';
      }
    }

    // 設定可能なスコアベースのステータス調整
    if (score >= config.scoringSettings.goodPostureThreshold) {
      status = status === 'poor' ? status : 'good';
    } else if (score >= config.scoringSettings.warningThreshold) {
      status = status === 'poor' ? status : 'warning';
    } else {
      status = 'poor';
    }

    return {
      score,
      status,
      feedback,
      angles: {
        neckAngle: Math.round(neckAngle),
        shoulderAngle: Math.round(shoulderImbalance),
        backAngle: Math.round(backCurvature),
        gazeAngle: Math.round(gazeVerticalAngle),
        faceAngle: Math.round(faceVerticalAngle),
      },
      gazeDirection,
      deviationFromBaseline,
    };
  }
}
