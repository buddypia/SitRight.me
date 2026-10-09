'use client';

import { useMemo } from 'react';
import { goodRatio, localDateKey, type DayStats } from '@/core/stats';
import type { PosturePattern } from '@/core/types';
import type { Locale, Messages } from '@/i18n/messages';
import { format } from '@/i18n/messages';

const scoreColor = (s: number) =>
  s >= 70 ? 'var(--good)' : s >= 40 ? 'var(--fair)' : 'var(--poor)';

const fmtDuration = (sec: number, locale: Locale) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (locale === 'ja') return h > 0 ? `${h}時間${m}分` : `${m}分`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export function TodayPanel({
  history,
  t,
  locale,
  sittingMin,
}: {
  history: DayStats[];
  t: Messages;
  locale: Locale;
  sittingMin: number;
}) {
  const todayKey = localDateKey(new Date());
  const today = history.find((d) => d.date === todayKey);
  const ratio = today ? goodRatio(today) : 0;

  const minuteNow = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();
  const timeline = useMemo(() => {
    const map = new Map(today?.timeline.map(([m, s]) => [m, s]) ?? []);
    return Array.from({ length: 60 }, (_, i) => {
      const m = minuteNow - 59 + i;
      return { m, score: map.get(m) ?? null };
    });
  }, [today, minuteNow]);

  const breakdown = useMemo(() => {
    const entries = Object.entries(today?.patternSec ?? {}) as [
      PosturePattern,
      number,
    ][];
    const total = entries.reduce((s, [, v]) => s + v, 0);
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([p, sec]) => ({ p, sec, share: total ? sec / total : 0 }));
  }, [today]);

  const week = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = localDateKey(d);
      const stats = history.find((h) => h.date === key);
      return {
        key,
        label: d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
          weekday: 'short',
        }),
        ratio: stats && stats.monitoredSec > 60 ? goodRatio(stats) : null,
        isToday: key === todayKey,
      };
    });
  }, [history, locale, todayKey]);

  return (
    <section className="panel grid gap-6 p-5 md:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="min-w-[180px]">
        <p className="text-[13px] font-medium text-ink-2">{t.todayTitle}</p>
        <p
          className="mt-3 font-mono text-[44px] font-semibold leading-none tabular-nums"
          style={{
            color: today?.monitoredSec
              ? scoreColor(ratio * 100)
              : 'var(--ink-3)',
          }}
        >
          {today?.monitoredSec ? Math.round(ratio * 100) : '–'}
          <span className="ml-1 text-lg text-ink-3">%</span>
        </p>
        <p className="mt-1 text-xs text-ink-3">{t.goodRatio}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <div>
            <dt className="text-ink-3">{t.monitored}</dt>
            <dd className="mt-0.5 font-mono text-sm tabular-nums text-ink-1">
              {fmtDuration(today?.monitoredSec ?? 0, locale)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">{t.alertsCount}</dt>
            <dd className="mt-0.5 font-mono text-sm tabular-nums text-ink-1">
              {format(t.times, { n: today?.alerts ?? 0 })}
            </dd>
          </div>
          <div>
            <dt className="text-ink-3">{t.sitting}</dt>
            <dd className="mt-0.5 font-mono text-sm tabular-nums text-ink-1">
              {format(t.minutes, { n: Math.floor(sittingMin) })}
            </dd>
          </div>
        </dl>
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-2">{t.timelineTitle}</p>
        <div
          className="mt-4 flex h-[92px] items-end gap-[2px]"
          role="img"
          aria-label={t.timelineTitle}
        >
          {timeline.map(({ m, score }) => (
            <div
              key={m}
              className="flex-1 rounded-[2px] transition-all duration-500"
              style={{
                height: score === null ? '6%' : `${Math.max(8, score)}%`,
                background:
                  score === null ? 'rgba(255,255,255,0.05)' : scoreColor(score),
                opacity: score === null ? 1 : 0.85,
              }}
              title={
                score === null
                  ? undefined
                  : `${String(Math.floor((((m % 1440) + 1440) % 1440) / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')} — ${Math.round(score)}`
              }
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-ink-3">
          <span>−60</span>
          <span>−30</span>
          <span>now</span>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-2">{t.breakdownTitle}</p>
        {breakdown.length === 0 ? (
          <p className="mt-4 text-xs text-ink-3">{t.noBreakdown}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {breakdown.map(({ p, sec, share }) => (
              <li key={p}>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-1">{t.pattern[p].name}</span>
                  <span className="font-mono tabular-nums text-ink-3">
                    {fmtDuration(sec, locale)}
                  </span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full bg-fair"
                    style={{ width: `${Math.max(4, share * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-2">{t.weekTitle}</p>
        <div className="mt-4 flex h-[92px] items-end gap-2">
          {week.map((d) => (
            <div
              key={d.key}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <div
                className="w-full max-w-[22px] rounded-[4px] transition-all duration-500"
                style={{
                  height:
                    d.ratio === null ? '6%' : `${Math.max(8, d.ratio * 100)}%`,
                  background:
                    d.ratio === null
                      ? 'rgba(255,255,255,0.05)'
                      : scoreColor(d.ratio * 100),
                  outline: d.isToday
                    ? '1px solid rgba(255,255,255,0.35)'
                    : undefined,
                  outlineOffset: 2,
                }}
                title={
                  d.ratio === null ? t.noData : `${Math.round(d.ratio * 100)}%`
                }
              />
              <span
                className={`text-[10px] ${d.isToday ? 'text-ink-1' : 'text-ink-3'}`}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
