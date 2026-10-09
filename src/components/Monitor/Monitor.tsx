'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getController } from '@/engine/controller';
import {
  notificationsSupported,
  requestNotificationPermission,
} from '@/engine/notifier';
import { useDocumentPip } from '@/hooks/useDocumentPip';
import { useT } from '@/hooks/useT';
import { useAppStore } from '@/stores/appStore';
import { CameraPreview } from '../CameraPreview';
import { PostureScene } from '../PostureScene';
import { Button, Toggle } from '../ui';
import { Metrics } from './Metrics';
import { MiniMonitor } from './MiniMonitor';
import { StatusCard, displayStatus } from './StatusCard';
import { TodayPanel } from './TodayPanel';

export function Monitor() {
  const t = useT();
  const controller = getController();
  const live = useAppStore((s) => s.live);
  const settings = useAppStore((s) => s.settings);
  const history = useAppStore((s) => s.history);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setPhase = useAppStore((s) => s.setPhase);
  const pip = useDocumentPip();

  useEffect(() => {
    if (live.camera === 'off') void controller.startCamera();
  }, [controller, live.camera]);

  const status = displayStatus(live);
  const tone =
    status === 'good' || status === 'fair' || status === 'poor'
      ? status
      : 'neutral';
  const measuring = tone !== 'neutral';

  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-10 pt-2 sm:px-6">
      {live.camera === 'error' && live.cameraError && (
        <Banner
          tone="poor"
          text={t[`cameraError_${live.cameraError}`]}
          action={t.retry}
          onAction={() => controller.startCamera()}
        />
      )}
      {live.baselineSuspect && (
        <Banner
          tone="fair"
          text={t.baselineSuspect}
          action={t.recalibrate}
          onAction={() => setPhase('calibrate')}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <section className="relative h-[min(64dvh,640px)] min-h-[420px] overflow-hidden rounded-[24px] border border-line lg:h-auto lg:min-h-[560px]">
          {pip.pipWindow ? (
            <div className="grid h-full w-full place-items-center bg-[#14171c]">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-ink-3">{t.pipActive}</p>
                <Button size="sm" onClick={pip.close}>
                  {t.pipClose}
                </Button>
              </div>
            </div>
          ) : (
            <PostureScene
              rig={live.rig}
              severity={measuring ? (live.assessment?.severity ?? null) : null}
              xray={settings.xray}
              avatar={settings.avatar}
              lowPower={settings.powerSaver}
              t={t}
              className="h-full w-full"
            />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/50 to-transparent p-5">
            <div>
              <h2 className="text-sm font-semibold text-ink-1">{t.sideView}</h2>
              <p className="mt-0.5 text-[11px] text-ink-3">{t.sideViewHint}</p>
            </div>
            <div className="flex items-center gap-2">
              {pip.supported && (
                <button
                  type="button"
                  onClick={() =>
                    pip.pipWindow
                      ? pip.close()
                      : void pip.open({ width: 340, height: 400 })
                  }
                  className="pointer-events-auto flex h-8 items-center gap-1.5 rounded-full border border-[rgba(77,234,196,0.4)] bg-[rgba(77,234,196,0.15)] px-3 text-xs font-medium text-good backdrop-blur hover:bg-[rgba(77,234,196,0.25)]"
                >
                  <PipIcon />
                  {pip.pipWindow ? t.pipClose : t.pipOpen}
                </button>
              )}
              <label className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/35 py-1 pl-3 pr-1 text-xs text-ink-2 backdrop-blur">
                {t.xray}
                <Toggle
                  checked={settings.xray}
                  onChange={(v) => updateSettings({ xray: v })}
                  label={t.xray}
                />
              </label>
            </div>
          </div>
          <Legend t={t} />
        </section>

        <div className="flex flex-col gap-4">
          <StatusCard
            live={live}
            t={t}
            alertDelaySec={settings.alertDelaySec}
          />
          <NotificationCard />
          <Metrics assessment={live.assessment} t={t} dimmed={!measuring} />
          <section className="panel overflow-hidden">
            {settings.showCamera ? (
              <div className="relative aspect-video">
                <CameraPreview tone={tone} />
                <button
                  type="button"
                  onClick={() => updateSettings({ showCamera: false })}
                  className="absolute right-2 top-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-ink-2 backdrop-blur hover:text-ink-1"
                >
                  {t.hideCamera}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 px-5 py-3.5">
                <p className="text-xs text-ink-3">{t.cameraHidden}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => updateSettings({ showCamera: true })}
                >
                  {t.showCamera}
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>

      <div className="mt-4">
        <TodayPanel
          history={history}
          t={t}
          locale={settings.locale}
          sittingMin={live.sittingMin}
        />
      </div>
      <p className="mt-6 text-center text-[11px] text-ink-3">{t.disclaimer}</p>
      {pip.pipWindow &&
        createPortal(
          <MiniMonitor
            live={live}
            t={t}
            xray={settings.xray}
            avatar={settings.avatar}
            lowPower={settings.powerSaver}
          />,
          pip.pipWindow.document.body
        )}
    </div>
  );
}

function PipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

function Legend({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-3">
      <span className="flex items-center gap-1.5">
        <span className="h-0 w-4 border-t border-dashed border-good" />
        {t.plumbLine}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border border-good" />
        {t.ideal}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-fair" />
        {t.you}
      </span>
    </div>
  );
}

function Banner({
  tone,
  text,
  action,
  onAction,
}: {
  tone: 'fair' | 'poor';
  text: string;
  action: string;
  onAction: () => void;
}) {
  const cls =
    tone === 'poor'
      ? 'border-poor/30 bg-poor/10 text-poor'
      : 'border-fair/30 bg-fair/10 text-fair';
  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${cls}`}
      role="status"
    >
      <span>{text}</span>
      <Button size="sm" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

function NotificationCard() {
  const t = useT();
  const desktopNotify = useAppStore((s) => s.settings.desktopNotify);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [permission, setPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setPermission(
      notificationsSupported() ? Notification.permission : 'unsupported'
    );
  }, []);

  if (
    desktopNotify ||
    dismissed ||
    permission === 'unsupported' ||
    permission === 'granted'
  )
    return null;

  return (
    <section className="panel flex items-start gap-3 p-4">
      <BellIcon />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink-1">
          {t.enableNotifications}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-3">
          {permission === 'denied'
            ? t.notificationsDenied
            : t.notificationsHint}
        </p>
        <div className="mt-3 flex gap-2">
          {permission !== 'denied' && (
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                const result = await requestNotificationPermission();
                setPermission(result);
                if (result === 'granted')
                  updateSettings({ desktopNotify: true });
              }}
            >
              {t.enableNotifications}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            {t.dismiss}
          </Button>
        </div>
      </div>
    </section>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 shrink-0 text-good"
      aria-hidden
    >
      <path
        d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15l1.5-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 20.5a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
