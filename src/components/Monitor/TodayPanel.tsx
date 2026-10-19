'use client';

import { useMemo, useState } from 'react';
import {
  findPeakCollapseHour,
  goodRatio,
  localDateKey,
  recoveryRate,
  type DayStats,
} from '@/core/stats';
import type { PosturePattern } from '@/core/types';
import {
  format,
  formatDuration,
  LOCALE_REGISTRY,
  type Locale,
  type Messages,
} from '@/i18n/messages';
import { ExportMenu } from './ExportMenu';

const scoreColor = (s: number) =>
  s >= 70 ? 'var(--good)' : s >= 40 ? 'var(--fair)' : 'var(--poor)';

const scoreStatusText = (s: number, t: Messages) =>
  s >= 70 ? t.statusGood : s >= 40 ? t.statusFair : t.statusPoor;

const formatMinuteClock = (m: number) => {
  const wrapped = ((m % 1440) + 1440) % 1440;
  const hh = String(Math.floor(wrapped / 60)).padStart(2, '0');
  const mm = String(wrapped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
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

  const [hoveredStat, setHoveredStat] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [hoveredMinute, setHoveredMinute] = useState<string | null>(null);
  const [hoveredBreakdown, setHoveredBreakdown] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const peak = useMemo(
    () => (today ? findPeakCollapseHour(today.timeline) : null),
    [today]
  );
  const recRate = useMemo(() => (today ? recoveryRate(today) : null), [today]);

  const minuteNow = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();
  const timeline = useMemo(() => {
    const map = new Map(today?.timeline.map(([m, s]) => [m, s]) ?? []);
    return Array.from({ length: 60 }, (_, i) => {
      const m = minuteNow - 59 + i;
      const score = map.get(m) ?? null;
      const time = formatMinuteClock(m);
      const label =
        score === null
          ? format(t.timelineBarEmpty, { time })
          : format(t.timelineBarMeasured, {
              time,
              score: Math.round(score),
              status: scoreStatusText(score, t),
            });
      return { m, score, label };
    });
  }, [today, minuteNow, t]);

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

  const topPattern = breakdown[0]?.p ?? null;
  const insightText = useMemo(() => {
    if (!today || today.monitoredSec < 60) return null;
    if (breakdown.length === 0 || ratio >= 0.85) {
      return t.insightGood;
    }
    if (topPattern && t.insightTips[topPattern]) {
      return t.insightTips[topPattern];
    }
    return null;
  }, [today, breakdown, ratio, topPattern, t]);

  const week = useMemo(() => {
    const bcp47 = LOCALE_REGISTRY[locale].bcp47;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = localDateKey(d);
      const stats = history.find((h) => h.date === key);
      const weekday = d.toLocaleDateString(bcp47, { weekday: 'short' });
      const dateLabel = d.toLocaleDateString(bcp47, {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short',
      });
      const dayRatio =
        stats && stats.monitoredSec > 0 ? goodRatio(stats) : null;
      const monitoredSec = stats?.monitoredSec ?? 0;
      const summary =
        dayRatio === null
          ? format(t.weekBarEmpty, { date: dateLabel })
          : format(t.weekBarMeasured, {
              date: dateLabel,
              pct: Math.round(dayRatio * 100),
              duration: formatDuration(monitoredSec, t),
            });
      return {
        key,
        label: weekday,
        ratio: dayRatio,
        isToday: key === todayKey,
        summary,
      };
    });
  }, [history, locale, todayKey, t]);

  return (
    <section className="panel grid gap-6 p-5 md:grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
      {/* 1. 今日の記録サマリー */}
      <div
        className="group/today relative min-w-[180px]"
        onMouseLeave={() => setHoveredStat(null)}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className="flex cursor-help items-center gap-1.5 text-[13px] font-medium text-ink-2"
            title={t.goodRatioHint}
            onMouseEnter={() =>
              setHoveredStat({ title: t.goodRatio, body: t.goodRatioHint })
            }
          >
            <span>{t.todayTitle}</span>
            <HelpBadge />
          </p>
          <div onMouseEnter={() => setHoveredStat(null)}>
            <ExportMenu history={history} locale={locale} t={t} />
          </div>
        </div>
        <div
          className="mt-3 cursor-help"
          title={t.goodRatioHint}
          onMouseEnter={() =>
            setHoveredStat({ title: t.goodRatio, body: t.goodRatioHint })
          }
        >
          <p
            className="text-[44px] font-semibold leading-none tabular-nums"
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
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          <div
            className="cursor-help"
            title={t.monitoredHint}
            onMouseEnter={() =>
              setHoveredStat({ title: t.monitored, body: t.monitoredHint })
            }
          >
            <dt className="text-ink-3">{t.monitored}</dt>
            <dd className="mt-0.5 text-sm tabular-nums text-ink-1">
              {formatDuration(today?.monitoredSec ?? 0, t)}
            </dd>
          </div>
          <div
            className="cursor-help"
            title={t.sittingHint}
            onMouseEnter={() =>
              setHoveredStat({ title: t.sitting, body: t.sittingHint })
            }
          >
            <dt className="text-ink-3">{t.sitting}</dt>
            <dd className="mt-0.5 text-sm tabular-nums text-ink-1">
              {format(t.minutes, { n: Math.floor(sittingMin) })}
            </dd>
          </div>
          <div
            className="cursor-help"
            title={t.alertsCountHint}
            onMouseEnter={() =>
              setHoveredStat({ title: t.alertsCount, body: t.alertsCountHint })
            }
          >
            <dt className="text-ink-3">{t.alertsCount}</dt>
            <dd className="mt-0.5 text-sm tabular-nums text-ink-1">
              {format(t.times, { n: today?.alerts ?? 0 })}
            </dd>
          </div>
          <div
            className="cursor-help"
            title={t.resetsCountHint}
            onMouseEnter={() =>
              setHoveredStat({ title: t.resetsCount, body: t.resetsCountHint })
            }
          >
            <dt className="text-ink-3">{t.resetsCount}</dt>
            <dd className="mt-0.5 flex items-baseline gap-1 text-sm tabular-nums text-good">
              <span>{format(t.times, { n: today?.recoveries ?? 0 })}</span>
              {recRate !== null && (
                <span className="text-[11px] text-ink-3">
                  ({Math.round(recRate * 100)}%)
                </span>
              )}
            </dd>
          </div>
        </dl>
        <div
          role="tooltip"
          className={`pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-64 rounded-xl border border-white/15 bg-[#141820]/95 px-3 py-2 text-[11px] leading-relaxed text-ink-2 shadow-xl transition-opacity duration-150 ${
            hoveredStat
              ? 'visible opacity-100'
              : 'invisible opacity-0'
          }`}
        >
          <p className="font-semibold text-ink-1">
            {hoveredStat?.title ?? t.goodRatio}
          </p>
          <p className="mt-0.5 text-ink-3">
            {hoveredStat?.body ?? t.goodRatioHint}
          </p>
        </div>
      </div>

      {/* 2. 直近60分タイムライングラフ */}
      <div
        className="group/timeline relative min-w-0"
        onMouseLeave={() => setHoveredMinute(null)}
      >
        <div className="flex items-center justify-between gap-2">
          <p
            className="flex cursor-help items-center gap-1.5 text-[13px] font-medium text-ink-2"
            title={t.timelineHint}
            onMouseEnter={() => setHoveredMinute(null)}
          >
            <span>{t.timelineTitle}</span>
            <HelpBadge />
          </p>
          {peak && (
            <span className="text-[11px] tabular-nums text-fair/90">
              {format(t.peakCollapse, {
                start: peak.startHour,
                end: peak.endHour,
              })}
            </span>
          )}
        </div>
        <div
          className="relative mt-4 flex h-[92px] items-end gap-[2px]"
          role="img"
          aria-label={`${t.timelineTitle}: ${t.timelineHint}`}
        >
          {/* 70点（良好）と40点（注意）の目安ライン */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[70%] border-t border-dashed border-white/[0.07]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-[40%] border-t border-dashed border-white/[0.05]"
            aria-hidden
          />
          {timeline.map(({ m, score, label }) => (
            <div
              key={m}
              className="group/bar relative flex h-full flex-1 cursor-help items-end rounded-[2px] transition-colors hover:bg-white/[0.08]"
              title={label}
              aria-label={label}
              onMouseEnter={() => setHoveredMinute(label)}
            >
              <div
                className="w-full rounded-[2px] transition-all duration-500 group-hover/bar:brightness-125"
                style={{
                  height: score === null ? '6%' : `${Math.max(8, score)}%`,
                  background:
                    score === null
                      ? 'rgba(255,255,255,0.08)'
                      : scoreColor(score),
                  opacity: score === null ? 1 : 0.85,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-ink-3">
          <span>{t.timelineAgo60}</span>
          <span>{t.timelineAgo30}</span>
          <span>{t.timelineNow}</span>
        </div>
        <div
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl border border-white/15 bg-[#141820]/95 px-3 py-2 text-[11px] leading-relaxed text-ink-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover/timeline:visible group-hover/timeline:opacity-100"
        >
          <p className="font-semibold tabular-nums text-ink-1">
            {hoveredMinute ?? t.timelineTitle}
          </p>
          <p className="mt-0.5 text-ink-3">{t.timelineHint}</p>
        </div>
      </div>

      {/* 3. 多かった崩れ方（内訳グラフ） */}
      <div
        className="group/breakdown relative min-w-0"
        onMouseLeave={() => setHoveredBreakdown(null)}
      >
        <p
          className="flex cursor-help items-center gap-1.5 text-[13px] font-medium text-ink-2"
          title={t.breakdownHint}
          onMouseEnter={() => setHoveredBreakdown(null)}
        >
          <span>{t.breakdownTitle}</span>
          <HelpBadge />
        </p>
        {breakdown.length === 0 ? (
          <p
            className="mt-4 cursor-help text-xs text-ink-3"
            title={t.breakdownHint}
          >
            {t.noBreakdown}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {breakdown.map(({ p, sec, share }) => {
              const pat = t.pattern[p];
              const pct = Math.round(share * 100);
              const titleText = format(t.breakdownBarDetail, {
                name: pat.name,
                duration: formatDuration(sec, t),
                pct,
              });
              const bodyText = `${pat.detail} ${pat.fix}`;
              return (
                <li
                  key={p}
                  className="cursor-help rounded-lg px-1.5 py-1 -mx-1.5 transition-colors hover:bg-white/[0.04]"
                  title={`${titleText} — ${bodyText}`}
                  onMouseEnter={() =>
                    setHoveredBreakdown({ title: titleText, body: bodyText })
                  }
                >
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-1">{pat.name}</span>
                    <span className="tabular-nums text-ink-3">
                      {formatDuration(sec, t)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-fair"
                      style={{ width: `${Math.max(4, share * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl border border-white/15 bg-[#141820]/95 px-3 py-2 text-[11px] leading-relaxed text-ink-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover/breakdown:visible group-hover/breakdown:opacity-100"
        >
          <p className="font-semibold text-ink-1">
            {hoveredBreakdown?.title ?? t.breakdownTitle}
          </p>
          <p className="mt-0.5 text-ink-3">
            {hoveredBreakdown?.body ?? t.breakdownHint}
          </p>
        </div>
      </div>

      {/* 4. 過去7日グラフ */}
      <div
        className="group/week relative min-w-0"
        onMouseLeave={() => setHoveredDay(null)}
      >
        <p
          className="flex cursor-help items-center gap-1.5 text-[13px] font-medium text-ink-2"
          title={t.weekHint}
          onMouseEnter={() => setHoveredDay(null)}
        >
          <span>{t.weekTitle}</span>
          <HelpBadge />
        </p>
        <div
          className="mt-4 flex h-[92px] items-end gap-2"
          role="img"
          aria-label={`${t.weekTitle}: ${t.weekHint}`}
        >
          {week.map((d) => (
            <div
              key={d.key}
              className="group/day flex h-full flex-1 cursor-help flex-col items-center justify-end gap-1.5 rounded-lg px-0.5 transition-colors hover:bg-white/[0.06]"
              title={d.summary}
              aria-label={d.summary}
              onMouseEnter={() => setHoveredDay(d.summary)}
            >
              <div
                className="relative flex w-full max-w-[22px] flex-1 items-end overflow-hidden rounded-[4px] bg-white/[0.04]"
                style={{
                  outline: d.isToday
                    ? '1px solid rgba(255,255,255,0.35)'
                    : undefined,
                  outlineOffset: 2,
                }}
              >
                <div
                  className="w-full rounded-[4px] transition-all duration-500 group-hover/day:brightness-125"
                  style={{
                    height:
                      d.ratio === null
                        ? '6%'
                        : `${Math.max(8, d.ratio * 100)}%`,
                    background:
                      d.ratio === null
                        ? 'rgba(255,255,255,0.08)'
                        : scoreColor(d.ratio * 100),
                  }}
                />
              </div>
              <span
                className={`text-[10px] leading-none ${
                  d.isToday ? 'font-medium text-ink-1' : 'text-ink-3'
                }`}
              >
                {d.label}
              </span>
            </div>
          ))}
        </div>
        <div
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl border border-white/15 bg-[#141820]/95 px-3 py-2 text-[11px] leading-relaxed text-ink-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover/week:visible group-hover/week:opacity-100"
        >
          <p className="font-semibold tabular-nums text-ink-1">
            {hoveredDay ?? t.weekTitle}
          </p>
          <p className="mt-0.5 text-ink-3">{t.weekHint}</p>
        </div>
      </div>

      {insightText && (
        <div className="col-span-full mt-2 rounded-xl border border-white/8 bg-s2/60 p-3.5 backdrop-blur-xs">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-good/10 px-2 py-0.5 text-[11px] font-medium text-good">
                <span className="h-1.5 w-1.5 rounded-full bg-good" />
                {t.insightTitle}
              </span>
              {topPattern && ratio < 0.85 && (
                <span className="text-xs font-semibold text-ink-1">
                  {t.pattern[topPattern].name}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-ink-2">{insightText}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function HelpBadge() {
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[10px] font-semibold leading-none text-ink-3"
      aria-hidden
    >
      ?
    </span>
  );
}
