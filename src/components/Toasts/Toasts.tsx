'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/hooks/useT';
import { format } from '@/i18n/messages';
import { useAppStore, type AppEvent } from '@/stores/appStore';

const DURATION: Record<AppEvent['kind'], number> = {
  alert: 9000,
  recovered: 2600,
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
  let tone: string;
  if (shown.kind === 'alert') {
    const p = t.pattern[shown.pattern];
    title = `${t.alertTitle} · ${p.name}`;
    body = p.fix;
    tone = 'border-fair/40';
  } else if (shown.kind === 'recovered') {
    title = t.recoveredToast;
    tone = 'border-good/40';
  } else {
    title = t.breakTitle;
    body = format(t.breakBody, { n: shown.minutes });
    tone = 'border-good/40';
  }

  return (
    <div
      key={shown.id}
      className={`pointer-events-auto flex max-w-[520px] animate-fade-up items-start gap-3 rounded-2xl border bg-s2/95 px-4 py-3 shadow-2xl backdrop-blur-sm ${tone}`}
    >
      <span
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${shown.kind === 'alert' ? 'bg-fair' : 'bg-good'}`}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-1">{title}</p>
        {body && (
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">
            {body}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-2 text-xs text-ink-3 hover:text-ink-1"
      >
        {t.dismiss}
      </button>
    </div>
  );
}
