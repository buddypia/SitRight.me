'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/hooks/useT';
import { format } from '@/i18n/messages';
import { useAppStore, type AppEvent } from '@/stores/appStore';

const DURATION: Record<AppEvent['kind'], number> = {
  alert: 9000,
  recovered: 3000,
  break: 15000,
};

/** 判定エンジンからのイベント（通知・回復・休憩）を画面上部に表示する */
export function Toasts() {
  const event = useAppStore((s) => s.live.event);
  const [expiredId, setExpiredId] = useState<number | null>(null);
  const shown: AppEvent | null = event && event.id !== expiredId ? event : null;

  useEffect(() => {
    if (!event) return;
    const id = window.setTimeout(
      () => setExpiredId(event.id),
      DURATION[event.kind]
    );
    return () => window.clearTimeout(id);
  }, [event]);

  // ライブリージョンは常に置いておき、中身だけ差し替える（同時にマウントすると読み上げられないことがある）
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4"
      role="status"
      aria-live="assertive"
    >
      {shown && (
        <Toast shown={shown} onDismiss={() => setExpiredId(shown.id)} />
      )}
    </div>
  );
}

function Toast({
  shown,
  onDismiss,
}: {
  shown: AppEvent;
  onDismiss: () => void;
}) {
  const t = useT();
  let title: string;
  let body = '';
  let badgeText = '';

  if (shown.kind === 'alert') {
    const p = t.pattern[shown.pattern];
    title = p.short;
    body = p.fix;
    badgeText = p.name;
  } else if (shown.kind === 'recovered') {
    title = t.recoveredToast;
    body = '頸椎と背骨のアライメントが整いました。';
  } else {
    title = t.breakTitle;
    body = format(t.breakBody, { n: shown.minutes });
    badgeText = `${shown.minutes}m`;
  }

  const isAlert = shown.kind === 'alert';
  const isRecovered = shown.kind === 'recovered';

  return (
    <div
      key={shown.id}
      className={`pointer-events-auto relative flex max-w-[520px] animate-fade-up items-start gap-3.5 overflow-hidden rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-xl ${
        isAlert
          ? 'border-fair/50 bg-[#161920]/95 shadow-[0_12px_36px_rgba(255,107,91,0.18)]'
          : isRecovered
            ? 'border-good/50 bg-[#121818]/95 shadow-[0_12px_36px_rgba(77,234,196,0.15)]'
            : 'border-good/40 bg-s2/95'
      }`}
    >
      {/* 3D Visual Badge */}
      <div className="shrink-0 pt-0.5">
        {isAlert ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/spine-alert.png"
              alt=""
              width={46}
              height={46}
              className="rounded-xl object-contain drop-shadow-[0_0_10px_rgba(255,45,85,0.5)]"
            />
          </div>
        ) : isRecovered ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-good/30 bg-good/15 text-lg font-bold text-good shadow-[0_0_12px_rgba(77,234,196,0.3)]">
            ✓
          </div>
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-good/30 bg-s3 text-lg">
            ☕️
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-ink-1">{title}</p>
            {badgeText && (
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                  isAlert
                    ? 'border border-fair/30 bg-fair/15 text-fair'
                    : 'border border-good/30 bg-good/15 text-good'
                }`}
              >
                {badgeText}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-ink-3 transition-colors hover:text-ink-1"
            aria-label={t.dismiss}
          >
            ✕
          </button>
        </div>

        {body && (
          <p className="mt-1 text-xs leading-relaxed text-ink-2">{body}</p>
        )}

        {isAlert && (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg bg-fair/20 px-2.5 py-0.5 text-xs font-bold text-fair transition-all hover:bg-fair hover:text-bg"
            >
              直した！
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Duration Countdown Progress Bar */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/5">
        <div
          className={`h-full ${
            isAlert ? 'bg-fair' : isRecovered ? 'bg-good' : 'bg-good'
          }`}
          style={{
            animation: `toast-progress ${DURATION[shown.kind]}ms linear forwards`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
