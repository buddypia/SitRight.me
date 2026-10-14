'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getController } from '@/engine/controller';
import {
  recordSessionEnd,
  recordStepTransition,
} from '@/engine/telemetry';
import { useT } from '@/hooks/useT';
import { useAppStore } from '@/stores/appStore';
import { Calibrate } from '../Calibrate';
import { LanguageSelector } from '../LanguageSelector';
import { Monitor, STATUS_COLOR, displayStatus, statusLabel } from '../Monitor';
import { SettingsSheet } from '../Settings';
import { Setup, Spinner } from '../Setup';
import { Toasts } from '../Toasts';
import { Welcome } from '../Welcome';
import { Button, Logo } from '../ui';

export function App() {
  const t = useT();
  const hydrated = useAppStore((s) => s.hydrated);
  const phase = useAppStore((s) => s.phase);
  const locale = useAppStore((s) => s.settings.locale);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevPhaseRef = useRef<string | null>(null);

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
      recordSessionEnd('monitor');
      if (!e.persisted) controller.dispose();
    };
    window.addEventListener('pagehide', onUnload);
    return () => {
      recordSessionEnd('monitor');
      window.removeEventListener('pagehide', onUnload);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    prevPhaseRef.current = recordStepTransition(prevPhaseRef.current, phase);

    // トップに戻ったらカメラを止める（計測していないのにカメラが点きっぱなしにならないように）
    if (phase === 'welcome') getController().stopCamera();
  }, [hydrated, phase]);

  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-ink-3">
        <span className="flex items-center gap-2.5">
          <Logo size={28} />
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
                className="mr-1 hidden items-center gap-2 rounded-full border border-line px-3 py-1 text-xs md:flex"
                style={{ color: STATUS_COLOR[status] }}
              >
                {status === 'loading' ? (
                  <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                ) : status === 'good' ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="shrink-0 text-good"
                    aria-hidden
                  >
                    <path
                      d="M8 1.5v13"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeDasharray="1.5 2"
                      strokeLinecap="round"
                      opacity="0.45"
                    />
                    <circle cx="8" cy="3.5" r="2" fill="currentColor" />
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                    <circle cx="8" cy="12.5" r="1.8" fill="currentColor" />
                  </svg>
                ) : (
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: STATUS_COLOR[status] }}
                  />
                )}
                {status === 'good' ? t.alignmentOptimal : statusLabel(status, t)}
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
