'use client';

import { useCallback, useEffect, useState } from 'react';
import { getController } from '@/engine/controller';
import { useT } from '@/hooks/useT';
import { useAppStore } from '@/stores/appStore';
import { Calibrate } from '../Calibrate';
import { Monitor, STATUS_COLOR, displayStatus, statusLabel } from '../Monitor';
import { SettingsSheet } from '../Settings';
import { Setup, Spinner } from '../Setup';
import { Toasts } from '../Toasts';
import { Welcome } from '../Welcome';
import { Button } from '../ui';

export function App() {
  const t = useT();
  const hydrated = useAppStore((s) => s.hydrated);
  const phase = useAppStore((s) => s.phase);
  const locale = useAppStore((s) => s.settings.locale);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    // 開発時のみ、検証用に状態を参照できるようにする
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as Record<string, unknown>).__sitright = {
        store: useAppStore,
        controller: getController(),
      };
    }
  }, []);

  useEffect(() => {
    const controller = getController();
    // bfcache に入る場合（persisted）は破棄しない。戻ったときにそのまま再開できるようにする
    const onUnload = (e: PageTransitionEvent) => {
      if (!e.persisted) controller.dispose();
    };
    window.addEventListener('pagehide', onUnload);
    return () => window.removeEventListener('pagehide', onUnload);
  }, []);

  useEffect(() => {
    // トップに戻ったらカメラを止める（計測していないのにカメラが点きっぱなしにならないように）
    if (phase === 'welcome') getController().stopCamera();
  }, [phase]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-ink-3">
        <span className="flex items-center gap-2">
          <Spinner />
          {t.loading}
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main key={phase}>
        {phase === 'welcome' && <Welcome />}
        {phase === 'setup' && <Setup />}
        {phase === 'calibrate' && <Calibrate />}
        {phase === 'monitor' && <Monitor />}
      </main>
      <Toasts />
      <SettingsSheet open={settingsOpen} onClose={closeSettings} />
    </div>
  );
}

function Header({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useT();
  const phase = useAppStore((s) => s.phase);
  const setPhase = useAppStore((s) => s.setPhase);
  const live = useAppStore((s) => s.live);
  const controller = getController();
  const status = displayStatus(live);

  return (
    <header className="sticky top-0 z-30 border-b border-transparent bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => phase !== 'monitor' && setPhase('welcome')}
          className="flex items-center gap-2.5"
          aria-label="SitRight"
        >
          <Logo />
          <span className="text-[15px] font-semibold tracking-tight">
            SitRight
          </span>
          <span className="hidden text-xs text-ink-3 md:inline">
            {t.appTagline}
          </span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {phase === 'monitor' && (
            <>
              <span
                className="mr-1 hidden items-center gap-2 rounded-full border border-line px-3 py-1 text-xs sm:flex"
                style={{ color: STATUS_COLOR[status] }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: STATUS_COLOR[status] }}
                />
                {statusLabel(status, t)}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => controller.setPaused(!live.paused)}
              >
                {live.paused ? t.resume : t.pause}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPhase('calibrate')}
              >
                {t.recalibrate}
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpenSettings}
            aria-label={t.settings}
          >
            <GearIcon />
            <span className="hidden sm:inline">{t.settings}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      className="shrink-0 drop-shadow-[0_2px_8px_rgba(255,149,0,0.3)]"
    >
      <defs>
        {/* Dark titanium obsidian background */}
        <linearGradient id="pureMonoHeaderBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12151d" />
          <stop offset="1" stopColor="#07090c" />
        </linearGradient>
        <linearGradient id="pureMonoHeaderRim" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2d3545" />
          <stop offset="1" stopColor="#10131a" />
        </linearGradient>

        {/* Sleek Monolith Segment Shading (Matte Graphite) */}
        <linearGradient id="graphiteHeaderSegment" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4454" />
          <stop offset="100%" stopColor="#1e2430" />
        </linearGradient>

        <linearGradient id="tiltedHeaderSegment" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a5568" />
          <stop offset="100%" stopColor="#242c3b" />
        </linearGradient>
      </defs>

      {/* Squircle Base with Subtle Beveled Rim */}
      <rect width="64" height="64" rx="16" fill="url(#pureMonoHeaderBg)" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" stroke="url(#pureMonoHeaderRim)" strokeWidth="1.5" />

      {/* Paper-Thin Acoustic Shockwave Rings (抽象案4の極薄光輪音波リング) */}
      <circle cx="34" cy="30" r="18" stroke="#ff3b30" strokeOpacity="0.25" strokeWidth="1.2" strokeDasharray="2 3" />
      <circle cx="34" cy="30" r="12" stroke="#ff9500" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="34" cy="30" r="6" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.5" />

      {/* Lower 3 Upright Monolith Segments (整然と直立した浮遊モノリス柱) */}
      <rect x="28" y="50" width="12" height="4.5" rx="2" fill="url(#graphiteHeaderSegment)" />
      <rect x="28" y="43" width="12" height="4.5" rx="2" fill="url(#graphiteHeaderSegment)" />
      <rect x="28" y="36" width="12" height="4.5" rx="2" fill="url(#graphiteHeaderSegment)" />

      {/* Upper 2 Tilted Monolith Segments (悪姿勢で前方にズレ・傾斜した浮遊ブロック) */}
      <g transform="rotate(-30 31 29)">
        <rect x="25" y="27" width="12" height="4.5" rx="2" fill="url(#tiltedHeaderSegment)" />
      </g>
      <g transform="rotate(-48 24 20)">
        <rect x="18" y="17" width="12" height="4.5" rx="2" fill="#e2e8f0" />
      </g>

      {/* Pure Acoustic Spark (中心の繊細な純白光点) */}
      <circle cx="34" cy="30" r="2.2" fill="#ffffff" />
      <circle cx="34" cy="30" r="1" fill="#ffcc00" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
