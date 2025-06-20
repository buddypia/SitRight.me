'use client';

import { forwardRef } from 'react';

interface PoseCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export const PoseCanvas = forwardRef<HTMLCanvasElement, PoseCanvasProps>(
  ({ width = 640, height = 480, className = '' }, ref) => {
    return (
      <canvas
        ref={ref}
        width={width}
        height={height}
        className={`absolute top-0 left-0 pointer-events-none ${className}`}
        style={{ zIndex: 10 }}
      />
    );
  }
);

PoseCanvas.displayName = 'PoseCanvas';