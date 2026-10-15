'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/hooks/useT';
import { Button } from '../ui';
import {
  LICENSE_CATEGORIES,
  THIRD_PARTY_PACKAGES,
  getFullLicenseNotice,
  type LicenseCategory,
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

  // Focus trap and restore
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      opener?.focus();
    };
  }, [onClose]);

  const categoryLabels: Record<LicenseCategory, string> = {
    core: t.licenseCategory_core,
    framework: t.licenseCategory_framework,
    assets: t.licenseCategory_assets,
  };

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
        className="relative z-10 flex max-h-[88dvh] w-full max-w-[640px] flex-col overflow-hidden rounded-[24px] border border-line bg-s1 shadow-2xl outline-hidden animate-fade-up"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
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

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-ink-2">
          <p className="text-[13px] text-ink-2 leading-relaxed">
            {t.licensesIntro}
          </p>

          <div className="space-y-6">
            {LICENSE_CATEGORIES.map((cat) => {
              const packages = THIRD_PARTY_PACKAGES.filter(
                (p) => p.category === cat
              );
              if (packages.length === 0) return null;

              return (
                <section key={cat} className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                    {categoryLabels[cat]}
                  </h3>
                  <div className="space-y-3">
                    {packages.map((pkg) => (
                      <PackageItem
                        key={pkg.id}
                        pkg={pkg}
                        isExpanded={expandedLicense === pkg.id}
                        onToggle={() =>
                          setExpandedLicense((prev) =>
                            prev === pkg.id ? null : pkg.id
                          )
                        }
                        t={t}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
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
  const [copied, setCopied] = useState(false);
  const fullNotice = getFullLicenseNotice(pkg);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullNotice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  return (
    <article className="rounded-2xl border border-line bg-s2/40 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-ink-1">{pkg.name}</h4>
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
        <div className="flex items-center justify-between">
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
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-ink-3 hover:text-ink-1 cursor-pointer transition-colors"
            >
              {copied ? `✓ ${t.licenseCopied}` : t.licenseCopyButton}
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-2.5 max-h-52 overflow-y-auto rounded-xl border border-line bg-s1/90 p-3 text-[11px] font-mono leading-relaxed text-ink-3 whitespace-pre-wrap select-text">
            {fullNotice}
          </div>
        )}
      </div>
    </article>
  );
}
