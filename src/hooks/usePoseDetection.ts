'use client';

import { useEffect, useRef, useState } from 'react';
import { PoseDetectionService, POSE_CONNECTIONS } from '@/utils/poseDetection';
import { usePoseStore } from '@/stores/poseStore';

export const usePoseDetection = (videoRef: React.RefObject<HTMLVideoElement>) => {
  const [poseService] = useState(() => new PoseDetectionService());
  const [isInitialized, setIsInitialized] = useState(false);
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { setPoseResults, setProcessing } = usePoseStore();

  useEffect(() => {
    const initializePoseDetection = async () => {
      try {
        setProcessing(true);
        await poseService.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize pose detection:', error);
      } finally {
        setProcessing(false);
      }
    };

    initializePoseDetection();
  }, [poseService, setProcessing]);

  const startDetection = () => {
    if (!isInitialized || !videoRef.current || !canvasRef.current) return;

    const detectFrame = () => {
      if (videoRef.current && canvasRef.current && poseService.isInitialized()) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        const videoRect = video.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        if (Math.abs(videoRect.width - canvasRect.width) > 1 || 
            Math.abs(videoRect.height - canvasRect.height) > 1) {
          canvas.style.width = `${videoRect.width}px`;
          canvas.style.height = `${videoRect.height}px`;
        }

        const timestamp = performance.now();
        const results = poseService.detectPose(video, timestamp);

        if (results) {
          setPoseResults(results);
          poseService.drawLandmarks(
            canvas,
            results.landmarks,
            POSE_CONNECTIONS
          );
        }
      }

      animationRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const stopDetection = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setPoseResults(null);
  };

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

  return {
    canvasRef,
    startDetection,
    stopDetection,
    isInitialized,
  };
};