'use client';

import { useEffect, useState } from 'react';
import { getController } from '@/engine/controller';
import { playChime } from '@/engine/notifier';
import { useT } from '@/hooks/useT';
import { useAppStore } from '@/stores/appStore';
import { CameraPreview } from '../CameraPreview';
import { Button } from '../ui';

export function Calibrate() {
  const t = useT();
  const controller = getController();
  const calibration = useAppStore((s) => s.live.calibration);
  const issue = useAppStore((s) => s.live.issue);
  const camera = useAppStore((s) => s.live.camera);
  const cameraError = useAppStore((s) => s.live.cameraError);
  const sound = useAppStore((s) => s.settings.sound);
  const setPhase = useAppStore((s) => s.setPhase);
  const [started, setStarted] = useState(false);

  useEffect(() => () => controller.cancelCalibration(), [controller]);

  // カメラが途中で止まったら、計測をやめて「開始」からやり直してもらう
  if (camera === 'error' && started) setStarted(false);
  useEffect(() => {
    if (camera === 'off') void controller.startCamera();
    if (camera === 'error') controller.cancelCalibration();
  }, [controller, camera]);

  const done = calibration?.state === 'done';
  useEffect(() => {
    if (!done) return;
    if (sound) playChime('good', 0.4);
    const id = window.setTimeout(() => {
      controller.cancelCalibration();
      setPhase('monitor');
    }, 1100);
    return () => window.clearTimeout(id);
  }, [done, controller, setPhase, sound]);

  const progress =
    calibration && calibration.state !== 'done'
      ? calibration.progress
      : done
        ? 1
        : 0;
  let status = t.calibrateBody;
  if (started && !done) {
    if (issue) status = t.calibrateWaiting;
    else if (calibration?.state === 'unstable') status = t.calibrateUnstable;
    else status = t.calibrateHold;
  }
  if (done) status = t.calibrateDone;
  const cameraFailed = camera === 'error' && !!cameraError;
  if (cameraFailed) status = t[`cameraError_${cameraError}`];

  const tone = done
    ? 'good'
    : started && calibration?.state === 'unstable'
      ? 'fair'
      : 'neutral';

  return (
    <div className="mx-auto grid max-w-[1180px] content-center gap-8 px-6 pb-12 pt-4 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
      <section className="relative aspect-4/3 overflow-hidden rounded-[24px] border border-line bg-s1">
        <CameraPreview tone={tone} />
        {started && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <ProgressRing value={progress} done={done} />
          </div>
        )}
      </section>

      <section className="animate-fade-up">
        <p className="text-xs font-medium tracking-wide text-ink-3">
          {t.setupStep.replace('{n}', '2')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {t.calibrateTitle}
        </h1>
        <ol className="mt-6 space-y-3">
          {[t.calibrateTip1, t.calibrateTip2, t.calibrateTip3].map((tip, i) => (
            <li
              key={tip}
              className="flex gap-3 text-sm leading-relaxed text-ink-2"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-s3 text-xs font-semibold text-ink-1">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ol>
        <p
          className={`mt-6 min-h-[3em] text-sm leading-relaxed ${cameraFailed ? 'text-poor' : done ? 'text-good' : calibration?.state === 'unstable' && started ? 'text-fair' : 'text-ink-2'}`}
          aria-live="polite"
        >
          {status}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              controller.cancelCalibration();
              setPhase('setup');
            }}
          >
            {t.back}
          </Button>
          {cameraFailed ? (
            <Button
              variant="primary"
              onClick={() => void controller.startCamera()}
            >
              {t.retry}
            </Button>
          ) : (
            !started && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setStarted(true);
                  controller.startCalibration();
                }}
              >
                {t.calibrateStart}
              </Button>
            )
          )}
        </div>
      </section>
    </div>
  );
}

function ProgressRing({ value, done }: { value: number; done: boolean }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const seconds = Math.max(0, Math.ceil(3 - value * 3));
  return (
    <div className="relative grid h-40 w-40 place-items-center rounded-full bg-black/45 backdrop-blur-xs">
      <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="6"
        />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="var(--good)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
          style={{ transition: 'stroke-dashoffset 120ms linear' }}
        />
      </svg>
      <span className="font-mono text-4xl font-semibold tabular-nums text-ink-1">
        {done ? (
          <svg width="44" height="44" viewBox="0 0 12 12" className="text-good">
            <path
              d="M2.5 6.2 5 8.5l4.5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          seconds
        )}
      </span>
    </div>
  );
}
