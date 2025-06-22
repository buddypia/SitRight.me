export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PoseResults {
  landmarks: PoseLandmark[];
  worldLandmarks: PoseLandmark[];
}

export interface PostureAnalysis {
  score: number;
  status: 'good' | 'warning' | 'poor';
  feedback: string;
  angles: {
    neckAngle: number;
    shoulderAngle: number;
    gazeAngle: number;
    faceAngle: number;
  };
  isSlouchingDetected?: boolean;
  slouchingSeverity?: 'mild' | 'moderate' | 'severe';
  gazeDirection?: 'up' | 'forward' | 'down';
  deviationFromBaseline?: {
    totalDeviation: number;
    keyPointDeviations: {
      head: number;
      shoulders: number;
    };
    deviationPercentage: number;
  };
}

export interface CameraState {
  isActive: boolean;
  stream: MediaStream | null;
  error: string | null;
}

export interface BaselinePosture {
  landmarks: PoseLandmark[];
  timestamp: number;
  description?: string;
  baselineAngles: {
    neckAngle: number;
    shoulderAngle: number;
    gazeAngle: number;
    faceAngle: number;
  };
}