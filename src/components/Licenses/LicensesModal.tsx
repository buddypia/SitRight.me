'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/hooks/useT';
import { Button } from '../ui';
import {
  LICENSE_TEXTS,
  THIRD_PARTY_PACKAGES,
  type LicenseEntry,
} from './licensesData';

export function LicensesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return <LicensesModalContent onClose={onClose} />;
}

function LicensesModalContent({ onClose }: { onClose: () => void }) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null);

  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t.licensesModalTitle}
    >
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 flex max-h-[88dvh] w-full max-w-[620px] flex-col overflow-hidden rounded-[24px] border border-line bg-s1 shadow-2xl outline-hidden animate-fade-up"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-good/15 text-good text-sm font-semibold">
              📜
            </span>
            <h2 className="text-base font-semibold text-ink-1">
              {t.licensesModalTitle}
            </h2>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t.close}
          </Button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-ink-2">
          <p className="text-[13px] text-ink-2 leading-relaxed">
            {t.licensesIntro}
          </p>

          <div className="space-y-3">
            {THIRD_PARTY_PACKAGES.map((pkg) => (
              <PackageItem
                key={pkg.id}
                pkg={pkg}
                isExpanded={expandedLicense === pkg.id}
                onToggle={() =>
                  setExpandedLicense((prev) => (prev === pkg.id ? null : pkg.id))
                }
                t={t}
              />
            ))}
          </div>
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

function PackageItem({
  pkg,
  isExpanded,
  onToggle,
  t,
}: {
  pkg: LicenseEntry;
  isExpanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useT>;
}) {
  const fullText = LICENSE_TEXTS[pkg.license];

  return (
    <article className="rounded-2xl border border-line bg-s2/40 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink-1">{pkg.name}</h3>
            {pkg.version && (
              <span className="text-[11px] font-mono text-ink-3">
                {pkg.version}
              </span>
            )}
            <span className="inline-block rounded-md border border-line bg-s1 px-2 py-0.5 text-[10px] font-mono font-medium text-ink-2">
              {pkg.license}
            </span>
          </div>
          <p className="mt-1 text-[12px] font-mono text-ink-2">
            {pkg.copyright}
          </p>
        </div>
        {pkg.url && (
          <a
            href={pkg.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-good hover:underline shrink-0"
          >
            {t.licensesSourceLink} ↗
          </a>
        )}
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
        {pkg.description}
      </p>

      <div className="mt-3 pt-2.5 border-t border-line/60">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          className="text-[11px] font-medium text-good hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>{isExpanded ? '▾' : '▸'}</span>
          <span>{isExpanded ? t.licenseHideText : t.licenseViewText}</span>
        </button>

        {isExpanded && (
          <div className="mt-2.5 max-h-48 overflow-y-auto rounded-xl border border-line bg-s1/90 p-3 text-[11px] font-mono leading-relaxed text-ink-3 whitespace-pre-wrap select-text">
            {fullText}
          </div>
        )}
      </div>
    </article>
  );
}
