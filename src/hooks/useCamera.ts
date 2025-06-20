'use client';

import { useEffect, useRef } from 'react';
import { usePoseStore } from '@/stores/poseStore';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { camera, setCameraState } = usePoseStore();

  const startCamera = async () => {
    try {
      setCameraState({ error: null });
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setCameraState({
        isActive: true,
        stream,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Camera access failed';
      setCameraState({
        isActive: false,
        stream: null,
        error: errorMessage,
      });
    }
  };

  const stopCamera = () => {
    if (camera.stream) {
      camera.stream.getTracks().forEach(track => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraState({
      isActive: false,
      stream: null,
      error: null,
    });
  };

  useEffect(() => {
    return () => {
      if (camera.stream) {
        camera.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [camera.stream]);

  return {
    videoRef,
    startCamera,
    stopCamera,
    isActive: camera.isActive,
    error: camera.error,
  };
};