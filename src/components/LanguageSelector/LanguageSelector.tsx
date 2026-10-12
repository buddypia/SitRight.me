'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/hooks/useT';
import { LOCALE_OPTIONS, LOCALE_REGISTRY, type Locale } from '@/i18n/messages';
import { useAppStore } from '@/stores/appStore';

export function LanguageSelector() {
  const t = useT();
  const locale = useAppStore((s) => s.settings.locale);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown on click outside (pointerdown for mobile & desktop) or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const selectLocale = (next: Locale) => {
    updateSettings({ locale: next });
    setMenuOpen(false);
  };

  // Keyboard navigation for desktop radiogroup (ArrowLeft / ArrowRight)
  const handleDesktopKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % LOCALE_OPTIONS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + LOCALE_OPTIONS.length) % LOCALE_OPTIONS.length;
    }

    if (nextIndex >= 0) {
      const targetOpt = LOCALE_OPTIONS[nextIndex];
      selectLocale(targetOpt.value);
      optionRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Desktop / Tablet: Direct 1-click segmented pill control with W3C roving tabIndex */}
      <div
        role="radiogroup"
        aria-label={t.language}
        className="hidden sm:inline-flex h-8 items-center rounded-full border border-line bg-s2/80 p-0.5 shadow-xs"
      >
        <span className="flex items-center pl-2 pr-1 text-ink-3" aria-hidden>
          <GlobeIcon />
        </span>
        {LOCALE_OPTIONS.map((opt, idx) => {
          const active = locale === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                optionRefs.current[idx] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              onKeyDown={(e) => handleDesktopKeyDown(e, idx)}
              onClick={() => selectLocale(opt.value)}
              className={`h-7 cursor-pointer rounded-full px-2.5 text-xs font-medium transition-all duration-150 ${
                active
                  ? 'bg-s3 text-ink-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_1px_3px_rgba(0,0,0,0.3)]'
                  : 'text-ink-3 hover:bg-white/5 hover:text-ink-1'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Mobile: Compact Globe dropdown button to save horizontal space */}
      <div className="relative sm:hidden" ref={menuRef}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={t.language}
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-s2/80 px-2.5 text-xs text-ink-2 transition hover:bg-s3 hover:text-ink-1"
        >
          <GlobeIcon />
          <span className="font-medium">
            {LOCALE_REGISTRY[locale]?.nativeName ?? locale.toUpperCase()}
          </span>
          <ChevronDownIcon
            className={`transition-transform duration-200 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {menuOpen && (
          <div
            role="menu"
            aria-label={t.language}
            className="absolute right-0 top-full z-50 mt-1.5 min-w-[130px] rounded-xl border border-line bg-s1/95 p-1 shadow-2xl backdrop-blur-md animate-fade-up"
          >
            {LOCALE_OPTIONS.map((opt) => {
              const active = locale === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    selectLocale(opt.value);
                    buttonRef.current?.focus();
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                    active
                      ? 'bg-s3 text-good'
                      : 'text-ink-2 hover:bg-white/5 hover:text-ink-1'
                  }`}
                >
                  <span>{opt.label}</span>
                  {active && <CheckIcon />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function GlobeIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20M12 2a14.5 14.5 0 0 1 0 20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function ChevronDownIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
