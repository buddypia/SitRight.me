'use client';

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';
import { PoseResults, PoseLandmark } from '@/types/pose';

export class PoseDetectionService {
  private landmarker: PoseLandmarker | null = null;
  private drawingUtils: DrawingUtils | null = null;

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    // DrawingUtilsの初期化は描画時に遅延実行する
  }

  detectPose(video: HTMLVideoElement, timestamp: number): PoseResults | null {
    if (!this.landmarker || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const results = this.landmarker.detectForVideo(video, timestamp);

    if (results.landmarks && results.landmarks.length > 0) {
      const landmarks: PoseLandmark[] = results.landmarks[0].map(landmark => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility,
      }));

      const worldLandmarks: PoseLandmark[] = results.worldLandmarks
        ? results.worldLandmarks[0].map(landmark => ({
            x: landmark.x,
            y: landmark.y,
            z: landmark.z,
            visibility: landmark.visibility,
          }))
        : [];

      return {
        landmarks,
        worldLandmarks,
      };
    }

    return null;
  }

  drawLandmarks(
    canvas: HTMLCanvasElement,
    landmarks: PoseLandmark[],
    connections?: [number, number][]
  ): void {
    // DrawingUtilsを遅延初期化
    if (!this.drawingUtils) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        this.drawingUtils = new DrawingUtils(ctx);
      }
    }

    if (!this.drawingUtils) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (landmarks && landmarks.length > 0) {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const normalizedLandmarks = landmarks.map(landmark => ({
        x: landmark.x * canvasWidth,
        y: landmark.y * canvasHeight,
        visibility: landmark.visibility || 0,
      }));

      normalizedLandmarks.forEach((point, index) => {
        if (point.visibility > 0.5) {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#00ff00';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });

      if (connections) {
        ctx.strokeStyle = '#0066ff';
        ctx.lineWidth = 3;
        connections.forEach(([start, end]) => {
          const startPoint = normalizedLandmarks[start];
          const endPoint = normalizedLandmarks[end];
          
          if (startPoint && endPoint && 
              startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(endPoint.x, endPoint.y);
            ctx.stroke();
          }
        });
      }
    }
  }

  isInitialized(): boolean {
    return this.landmarker !== null;
  }
}

export const POSE_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31],
  [24, 26], [26, 28], [28, 30], [30, 32],
  [15, 17], [15, 19], [15, 21], [17, 19],
  [16, 18], [16, 20], [16, 22], [18, 20],
  [27, 31], [28, 32]
];