'use client';

import { useEffect, useRef, useState } from 'react';
import {
  downloadCsv,
  downloadJson,
  exportAllStatsToJson,
  exportDayStatsToSummaryCsv,
  exportDayStatsToTimelineCsv,
} from '@/core/export';
import { localDateKey, type DayStats } from '@/core/stats';
import type { Locale, Messages } from '@/i18n/messages';

export function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function ExportMenu({
  history,
  locale,
  t,
}: {
  history: DayStats[];
  locale: Locale;
  t: Messages;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleExport = (type: 'summary' | 'timeline' | 'json') => {
    const todayKey = localDateKey(new Date());
    if (type === 'summary') {
      downloadCsv(
        exportDayStatsToSummaryCsv(history, { locale, t }),
        `sitright-daily-summary-${todayKey}.csv`
      );
    } else if (type === 'timeline') {
      downloadCsv(
        exportDayStatsToTimelineCsv(history, { locale, t }),
        `sitright-timeline-${todayKey}.csv`
      );
    } else if (type === 'json') {
      downloadJson(
        exportAllStatsToJson(history),
        `sitright-stats-${todayKey}.json`
      );
    }
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-ink-2 hover:bg-white/10 hover:text-ink-1 transition cursor-pointer"
        title={t.exportData}
      >
        <DownloadIcon />
        <span>{t.exportButton}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 sm:left-auto sm:right-0 top-full z-30 mt-1.5 min-w-[190px] rounded-xl border border-line bg-s1/95 p-1.5 shadow-2xl backdrop-blur-md"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('summary')}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-ink-2 hover:bg-white/10 hover:text-ink-1 transition cursor-pointer"
          >
            <span>📊</span>
            <span>{t.exportSummaryCsv}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('timeline')}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-ink-2 hover:bg-white/10 hover:text-ink-1 transition cursor-pointer"
          >
            <span>⏱️</span>
            <span>{t.exportTimelineCsv}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('json')}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-ink-2 hover:bg-white/10 hover:text-ink-1 transition cursor-pointer"
          >
            <span>💾</span>
            <span>{t.exportJson}</span>
          </button>
        </div>
      )}
    </div>
  );
}
