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
      className="shrink-0 drop-shadow-[0_2px_10px_rgba(255,45,85,0.4)]"
    >
      <defs>
        <linearGradient id="favHeaderBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#141822" />
          <stop offset="1" stopColor="#080a0e" />
        </linearGradient>
      </defs>

      {/* Squircle Rim Base */}
      <rect width="64" height="64" rx="16" fill="url(#favHeaderBg)" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" stroke="#2d3748" strokeWidth="1.5" />

      {/* Soundwave Concentric Rings (ファビコンでも抜ける太い同心円リング) */}
      <circle cx="34" cy="31" r="18" stroke="#ff2d55" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 3" />
      <circle cx="34" cy="31" r="11" stroke="#ff9500" strokeOpacity="0.65" strokeWidth="2.5" />
      <circle cx="34" cy="31" r="5.5" stroke="#ffffff" strokeOpacity="0.95" strokeWidth="2" />

      {/* Lower Upright Monolith Vertebrae (直立した健康なモノリス椎骨ブロック) */}
      <rect x="27" y="49" width="14" height="5" rx="2.5" fill="#10b981" />
      <rect x="32" y="47" width="4" height="3" rx="1" fill="#059669" />

      <rect x="27.5" y="41" width="13" height="5" rx="2.5" fill="#34d399" />
      <rect x="32.5" y="39" width="3" height="3" rx="1" fill="#10b981" />

      <rect x="28" y="33" width="12" height="5" rx="2.5" fill="#4deac4" />

      {/* Forward-Tilted Cervical Monoliths (前傾・悪姿勢でパキッとズレた頸椎ブロック) */}
      <g transform="rotate(-35 32 26)">
        <rect x="25" y="23" width="13" height="5.5" rx="2.75" fill="#ff7a00" />
        <rect x="30" y="21" width="3" height="3" rx="1" fill="#ea580c" />
      </g>

      <g transform="rotate(-52 23 15)">
        <rect x="17" y="11" width="14" height="6.5" rx="3.25" fill="#ff2d55" />
        <circle cx="24" cy="14" r="2" fill="#ffffff" />
      </g>

      {/* Lightning Snap Flash (パキッ！の瞬間閃光) */}
      <polygon points="34,29 39,21 33,26 40,18 35,24 43,20 34,31" fill="#ffffff" />
      <circle cx="34" cy="31" r="3" fill="#ffcc00" />
      <circle cx="34" cy="31" r="1.5" fill="#ffffff" />
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
