'use client';

import { useCallback, useEffect, useState } from 'react';
import { getController } from '@/engine/controller';
import { useT } from '@/hooks/useT';
import { useAppStore } from '@/stores/appStore';
import { Calibrate } from '../Calibrate';
import { LanguageSelector } from '../LanguageSelector';
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
          <LanguageSelector />
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
      className="shrink-0 drop-shadow-[0_2px_10px_rgba(255,149,0,0.35)]"
    >
      <defs>
        {/* Dark titanium obsidian background */}
        <linearGradient id="v10cHeaderBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#181c24" />
          <stop offset="1" stopColor="#090b0e" />
        </linearGradient>
        <linearGradient id="v10cHeaderRim" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#363f52" />
          <stop offset="1" stopColor="#141820" />
        </linearGradient>

        {/* Vertebrae Block Metal Shading */}
        <linearGradient id="v10cHeaderBlockGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#384356" />
          <stop offset="50%" stopColor="#222a38" />
          <stop offset="100%" stopColor="#12161f" />
        </linearGradient>
        <linearGradient id="v10cHeaderBlockTilted" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#445268" />
          <stop offset="50%" stopColor="#2a3446" />
          <stop offset="100%" stopColor="#141a24" />
        </linearGradient>

        {/* 3D Acoustic Cone Horn Wedge */}
        <linearGradient id="v10cHeaderHornGrad" x1="0" y1="0.5" x2="1" y2="0.5">
          <stop offset="0%" stopColor="#ff7a00" />
          <stop offset="100%" stopColor="#ff9500" />
        </linearGradient>
      </defs>

      {/* Squircle Base with Subtle Beveled Rim */}
      <rect width="64" height="64" rx="16" fill="url(#v10cHeaderBg)" />
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" stroke="url(#v10cHeaderRim)" strokeWidth="1.5" />

      {/* Double Solid Acoustic Arcs */}
      <path d="M 45,18 A 20 20 0 0 1 45,46" stroke="#ff3b30" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 40,22 A 14 14 0 0 1 40,42" stroke="#ff9500" strokeWidth="3" strokeLinecap="round" />

      {/* Lower 2 Upright Vertebrae */}
      <g>
        <rect x="23" y="41" width="14" height="11" rx="2.5" fill="url(#v10cHeaderBlockGrad)" stroke="#475569" strokeWidth="0.8" />
        <rect x="17" y="44" width="7" height="5.5" rx="1.5" fill="url(#v10cHeaderBlockGrad)" stroke="#475569" strokeWidth="0.8" />
      </g>

      <g>
        <rect x="23" y="27" width="14" height="11" rx="2.5" fill="url(#v10cHeaderBlockGrad)" stroke="#475569" strokeWidth="0.8" />
        <rect x="17" y="30" width="7" height="5.5" rx="1.5" fill="url(#v10cHeaderBlockGrad)" stroke="#475569" strokeWidth="0.8" />
      </g>

      {/* Upper Forward-Tilted Vertebra */}
      <g transform="rotate(-18 28 26)">
        <rect x="22" y="13" width="14" height="11" rx="2.5" fill="url(#v10cHeaderBlockTilted)" stroke="#475569" strokeWidth="0.8" />
        <rect x="16" y="16" width="7" height="5.5" rx="1.5" fill="url(#v10cHeaderBlockTilted)" stroke="#475569" strokeWidth="0.8" />
      </g>

      {/* 3D Acoustic Cone Horn */}
      <polygon points="26,27 40,20 40,34" fill="url(#v10cHeaderHornGrad)" />
      <polygon points="26,27 40,20 34,26" fill="#ffcc00" />

      {/* Core Acoustic Spark */}
      <circle cx="26" cy="27" r="2.2" fill="#ffffff" />
      <circle cx="26" cy="27" r="1.2" fill="#ff9500" />
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
