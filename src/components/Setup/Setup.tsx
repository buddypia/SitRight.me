'use client';

import { useEffect, useState } from 'react';
import { cameraPermission, listCameras } from '@/engine/camera';
import { getController } from '@/engine/controller';
import { useT } from '@/hooks/useT';
import { useAppStore } from '@/stores/appStore';
import { CameraPreview } from '../CameraPreview';
import { Button } from '../ui';

const READY_HOLD_MS = 800;

export function Setup() {
  const t = useT();
  const live = useAppStore((s) => s.live);
  const setPhase = useAppStore((s) => s.setPhase);
  const cameraId = useAppStore((s) => s.settings.cameraId);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [ready, setReady] = useState(false);

  const controller = getController();
  const { camera, engine, checks, cameraError } = live;
  const allOk =
    camera === 'on' &&
    engine === 'ready' &&
    checks.face &&
    checks.shoulders &&
    checks.facing;

  useEffect(() => {
    void controller.ensureEngine().catch(() => undefined);
    void cameraPermission().then((state) => {
      if (state === 'granted') void controller.startCamera();
    });
  }, [controller]);

  useEffect(() => {
    if (camera === 'on') void listCameras().then(setCameras);
  }, [camera]);

  // 一瞬だけ条件を満たした状態で進めないよう、少しの間続いたら OK にする
  useEffect(() => {
    if (!allOk) {
      setReady(false);
      return;
    }
    const id = window.setTimeout(() => setReady(true), READY_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [allOk]);

  const cameraOn = camera === 'on';

  return (
    <div className="mx-auto grid max-w-[1180px] content-center gap-8 px-6 pb-12 pt-4 lg:min-h-[calc(100dvh-64px)] lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
      <section className="relative aspect-[4/3] overflow-hidden rounded-[24px] border border-line bg-s1">
        {cameraOn ? (
          <CameraPreview guide tone={allOk ? 'good' : 'neutral'} />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div className="max-w-sm">
              <CameraIcon />
              {cameraError ? (
                <>
                  <p className="mt-4 text-sm leading-relaxed text-poor">
                    {t[`cameraError_${cameraError}`]}
                  </p>
                  <Button
                    className="mt-5"
                    variant="primary"
                    onClick={() => controller.startCamera()}
                  >
                    {t.retry}
                  </Button>
                </>
              ) : (
                <Button
                  className="mt-5"
                  variant="primary"
                  size="lg"
                  disabled={camera === 'starting'}
                  onClick={() => controller.startCamera()}
                >
                  {camera === 'starting'
                    ? t.setupCameraStarting
                    : t.setupCameraButton}
                </Button>
              )}
              <p className="mt-4 text-xs leading-relaxed text-ink-3">
                {t.privacyBody}
              </p>
            </div>
          </div>
        )}
        {cameraOn && engine !== 'ready' && (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-5 pb-4 pt-10 text-sm text-ink-2">
            {engine === 'error' ? (
              <>
                <span className="text-poor">{t.engineError}</span>
                <Button
                  size="sm"
                  className="pointer-events-auto ml-auto shrink-0"
                  onClick={() =>
                    void controller.ensureEngine().catch(() => undefined)
                  }
                >
                  {t.retry}
                </Button>
              </>
            ) : (
              <Spinner />
            )}
            {engine !== 'error' && t.setupModelLoading}
          </div>
        )}
      </section>

      <section className="animate-fade-up">
        <p className="text-xs font-medium tracking-wide text-ink-3">
          {t.setupStep.replace('{n}', '1')}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {t.setupTitle}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{t.setupBody}</p>

        <ul className="mt-6 space-y-2.5" aria-live="polite">
          <Check ok={cameraOn && checks.face} label={t.checkFace} />
          <Check ok={cameraOn && checks.shoulders} label={t.checkShoulders} />
          <Check ok={cameraOn && checks.facing} label={t.checkFacing} />
        </ul>

        {cameraOn && live.issue && !allOk && (
          <IssueNote text={t.issue[live.issue]} />
        )}

        {cameras.length > 1 && (
          <label className="mt-6 block text-xs text-ink-3">
            {t.cameraSelect}
            <select
              value={cameraId ?? ''}
              onChange={(e) =>
                void controller.switchCamera(e.target.value || null)
              }
              className="mt-1.5 block w-full rounded-xl border border-line bg-s2 px-3 py-2 text-sm text-ink-1"
            >
              <option value="">Default</option>
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}

        <p className="mt-6 text-xs leading-relaxed text-ink-3">{t.setupTip}</p>

        <div className="mt-8 flex items-center gap-3">
          <Button variant="ghost" onClick={() => setPhase('welcome')}>
            {t.back}
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={!ready}
            onClick={() => setPhase('calibrate')}
          >
            {t.setupNext}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span
        className={`grid h-6 w-6 place-items-center rounded-full border transition ${ok ? 'border-good bg-good/15 text-good' : 'border-line text-ink-3'}`}
        aria-hidden
      >
        {ok ? (
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M2.5 6.2 5 8.5l4.5-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      <span className={ok ? 'text-ink-1' : 'text-ink-3'}>{label}</span>
      <span className="sr-only">{ok ? '✓' : '…'}</span>
    </li>
  );
}

function IssueNote({ text }: { text: string }) {
  return (
    <p className="mt-4 rounded-xl border border-fair/30 bg-fair/10 px-3 py-2 text-xs leading-relaxed text-fair">
      {text}
    </p>
  );
}

export function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-good"
      aria-hidden
    />
  );
}

function CameraIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 24 24"
      fill="none"
      className="mx-auto text-ink-3"
      aria-hidden
    >
      <rect
        x="2.5"
        y="6"
        width="14"
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="m16.5 10.5 5-3v9l-5-3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
