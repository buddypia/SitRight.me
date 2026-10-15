'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/hooks/useT';
import { buildPeriodicNotification } from '@/i18n/messages';
import { useAppStore, type AppEvent } from '@/stores/appStore';
import { Logo } from '@/components/ui';

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
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4"
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
    body = t.recoveredBody;
  } else {
    const built = buildPeriodicNotification(
      {
        periodicKind: shown.periodicKind ?? 'break',
        minutes: shown.minutes,
        score: shown.score,
        neckLoadKg: shown.neckLoadKg,
        pattern: shown.pattern,
        topPattern: shown.topPattern,
        goodRatioPct: shown.goodRatioPct,
        monitoredSec: shown.monitoredSec,
        recoveries: shown.recoveries,
      },
      t
    );
    title = built.title;
    body = built.body;
    badgeText = built.badgeText;
  }

  const isAlert = shown.kind === 'alert';
  const isRecovered = shown.kind === 'recovered';
  const periodicIcon =
    shown.kind === 'break'
      ? shown.periodicKind === 'check'
        ? '🎯'
        : shown.periodicKind === 'advice'
          ? '💡'
          : shown.periodicKind === 'report'
            ? '📊'
            : '☕'
      : '☕';

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
      {/* Visual Brand Badge */}
      <div className="shrink-0 pt-0.5">
        <div className="relative">
          <Logo size={44} variant={shown.kind} />
          {isRecovered && (
            <span
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#121818] bg-good text-[10px] font-black text-[#090b0e] shadow-sm"
              aria-hidden
            >
              ✓
            </span>
          )}
          {shown.kind === 'break' && (
            <span
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-[#161920] bg-s3 text-[9px] shadow-sm"
              aria-hidden
            >
              {periodicIcon}
            </span>
          )}
        </div>
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
              {t.fixed}
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
