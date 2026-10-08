'use client';

import { useEffect, useRef } from 'react';
import { FACE, POSE } from '@/core/metrics';
import { getController } from '@/engine/controller';

interface Props {
  /** 骨格の線の色 */
  tone?: 'good' | 'fair' | 'poor' | 'neutral';
  /** セットアップ時の頭と肩の位置ガイド */
  guide?: boolean;
  className?: string;
}

const TONES = {
  good: '#4deac4',
  fair: '#ffbe5c',
  poor: '#ff6b5b',
  neutral: '#b3b9c2',
};

/** カメラ映像（鏡像）と、判定に使っている点だけを控えめに重ねて表示する */
export function CameraPreview({
  tone = 'neutral',
  guide = false,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toneRef = useRef(tone);
  toneRef.current = tone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const controller = getController();
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(rect.width * dpr);
      const ch = Math.round(rect.height * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      ctx.fillStyle = '#0d1014';
      ctx.fillRect(0, 0, cw, ch);
      const video = controller.video;
      if (!video || video.readyState < 2 || !video.videoWidth) return;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const ox = (cw - dw) / 2;
      const oy = (ch - dh) / 2;

      ctx.save();
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
      ctx.filter = 'saturate(0.85) brightness(0.92)';
      ctx.drawImage(video, ox, oy, dw, dh);
      ctx.restore();
      ctx.filter = 'none';

      // 鏡像座標へ変換
      const X = (x: number) => cw - (ox + x * dw);
      const Y = (y: number) => oy + y * dh;

      if (guide) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.setLineDash([6 * dpr, 6 * dpr]);
        ctx.lineWidth = 1.5 * dpr;
        const cx = cw / 2;
        ctx.beginPath();
        ctx.ellipse(cx, ch * 0.36, ch * 0.13, ch * 0.17, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - ch * 0.55, ch * 0.98);
        ctx.quadraticCurveTo(
          cx - ch * 0.5,
          ch * 0.66,
          cx - ch * 0.14,
          ch * 0.62
        );
        ctx.moveTo(cx + ch * 0.55, ch * 0.98);
        ctx.quadraticCurveTo(
          cx + ch * 0.5,
          ch * 0.66,
          cx + ch * 0.14,
          ch * 0.62
        );
        ctx.stroke();
        ctx.restore();
      }

      const frame = controller.latestFrame;
      if (!frame) return;
      const color = TONES[toneRef.current];
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      const dot = (x: number, y: number, r = 3.5) => {
        ctx.beginPath();
        ctx.arc(X(x), Y(y), r * dpr, 0, Math.PI * 2);
        ctx.fill();
      };

      const pose = frame.pose;
      if (pose) {
        const ls = pose[POSE.leftShoulder];
        const rs = pose[POSE.rightShoulder];
        if ((ls.visibility ?? 1) > 0.5 && (rs.visibility ?? 1) > 0.5) {
          ctx.beginPath();
          ctx.moveTo(X(ls.x), Y(ls.y));
          ctx.lineTo(X(rs.x), Y(rs.y));
          ctx.stroke();
          dot(ls.x, ls.y, 4.5);
          dot(rs.x, rs.y, 4.5);
        }
      }
      const face = frame.face;
      if (face && pose) {
        const a = face[FACE.sideA];
        const b = face[FACE.sideB];
        const ls = pose[POSE.leftShoulder];
        const rs = pose[POSE.rightShoulder];
        const earX = (a.x + b.x) / 2;
        const earY = (a.y + b.y) / 2;
        const shX = (ls.x + rs.x) / 2;
        const shY = (ls.y + rs.y) / 2;
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.setLineDash([4 * dpr, 4 * dpr]);
        ctx.beginPath();
        ctx.moveTo(X(shX), Y(shY));
        ctx.lineTo(X(earX), Y(earY));
        ctx.stroke();
        ctx.restore();
        dot(a.x, a.y, 3);
        dot(b.x, b.y, 3);
        dot(earX, earY, 3.5);
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [guide]);

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full ${className}`}
      aria-hidden
    />
  );
}
