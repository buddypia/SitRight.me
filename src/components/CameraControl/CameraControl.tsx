'use client';

import { useCamera } from '@/hooks/useCamera';
import { usePoseDetection } from '@/hooks/usePoseDetection';
import { usePostureAnalysis } from '@/hooks/usePostureAnalysis';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export const CameraControl = () => {
  const { t } = useTranslation();
  const { videoRef, startCamera, stopCamera, isActive, error } = useCamera();
  const { canvasRef, startDetection, stopDetection, isInitialized } = usePoseDetection(videoRef);
  const containerRef = useRef<HTMLDivElement>(null);
  
  usePostureAnalysis();

  useEffect(() => {
    const syncCanvasSize = () => {
      if (videoRef.current && canvasRef.current && containerRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        const rect = video.getBoundingClientRect();
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };

    const resizeObserver = new ResizeObserver(syncCanvasSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [videoRef, canvasRef]);

  const handleStart = async () => {
    await startCamera();
    if (isInitialized) {
      startDetection();
    }
  };

  const handleStop = () => {
    stopCamera();
    stopDetection();
  };

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="relative w-full">
        <video
          ref={videoRef}
          className="w-full bg-black rounded-lg"
          width={640}
          height={480}
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute top-0 left-0 pointer-events-none rounded-lg"
          style={{ zIndex: 10 }}
        />
      </div>

      <div className="flex gap-4 justify-center">
        {!isActive ? (
          <button
            onClick={handleStart}
            disabled={!isInitialized}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInitialized ? t('camera.startCamera') : t('camera.initializing')}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {t('camera.stopCamera')}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {t('camera.error', { error })}
        </div>
      )}
    </div>
  );
};