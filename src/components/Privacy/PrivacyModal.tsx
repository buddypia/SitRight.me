'use client';

import { useEffect, useRef } from 'react';
import { useT } from '@/hooks/useT';
import { Button } from '../ui';

export function PrivacyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.toggleAttribute('inert', !open);
    if (!open) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();
    return () => opener?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t.privacyModalTitle}
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[88dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] border border-line bg-s1 shadow-2xl outline-hidden animate-fade-up"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-good/15 text-good text-sm font-semibold">
              ✓
            </span>
            <h2 className="text-base font-semibold text-ink-1">
              {t.privacyModalTitle}
            </h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t.close}
          </Button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-ink-2">
          {/* 1. Camera & Biometrics */}
          <section className="rounded-2xl border border-line bg-s2/50 p-4">
            <h3 className="font-semibold text-ink-1 flex items-center gap-2">
              <span>📷</span> {t.privacyCameraTitle}
            </h3>
            <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">
              {t.privacyCameraBody}
            </p>
          </section>

          {/* 2. Local Storage */}
          <section className="rounded-2xl border border-line bg-s2/50 p-4">
            <h3 className="font-semibold text-ink-1 flex items-center gap-2">
              <span>💾</span> {t.privacyStorageTitle}
            </h3>
            <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">
              {t.privacyStorageBody}
            </p>
          </section>

          {/* 3. Telemetry & External Transmission */}
          <section className="rounded-2xl border border-line bg-s2/50 p-4">
            <h3 className="font-semibold text-ink-1 flex items-center gap-2">
              <span>📡</span> {t.privacyTelemetryTitle}
            </h3>
            <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">
              {t.privacyTelemetryIntro}
            </p>
            <ul className="mt-2.5 space-y-1.5 text-[12px] text-ink-3">
              <li className="flex items-start gap-1.5">
                <span className="text-good font-bold">•</span>
                <span>{t.privacyTelemetryItem1}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-good font-bold">•</span>
                <span>{t.privacyTelemetryItem2}</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-good font-bold">•</span>
                <span>{t.privacyTelemetryItem3}</span>
              </li>
            </ul>
          </section>

          {/* 4. User Controls */}
          <section className="rounded-2xl border border-line bg-s2/50 p-4">
            <h3 className="font-semibold text-ink-1 flex items-center gap-2">
              <span>⚙️</span> {t.privacyControlTitle}
            </h3>
            <p className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">
              {t.privacyControlBody}
            </p>
          </section>
        </div>

        <footer className="border-t border-line px-6 py-3.5 flex justify-end">
          <Button variant="primary" size="sm" onClick={onClose}>
            {t.close}
          </Button>
        </footer>
      </div>
    </div>
  );
}
