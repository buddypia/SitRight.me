'use client';

import type { PostureAssessment } from '@/core/types';
import type { Messages } from '@/i18n/messages';
import { format } from '@/i18n/messages';
import type { LiveState } from '@/stores/appStore';

export type DisplayStatus =
  | 'good'
  | 'fair'
  | 'poor'
  | 'paused'
  | 'away'
  | 'checking';

export function displayStatus(live: LiveState): DisplayStatus {
  if (live.paused) return 'paused';
  if (live.away) return 'away';
  if (!live.assessment) return 'checking';
  return live.assessment.level;
}

export const STATUS_COLOR: Record<DisplayStatus, string> = {
  good: 'var(--good)',
  fair: 'var(--fair)',
  poor: 'var(--poor)',
  paused: 'var(--ink-3)',
  away: 'var(--ink-3)',
  checking: 'var(--ink-3)',
};

export function statusLabel(s: DisplayStatus, t: Messages): string {
  return {
    good: t.statusGood,
    fair: t.statusFair,
    poor: t.statusPoor,
    paused: t.statusPaused,
    away: t.statusAway,
    checking: t.statusChecking,
  }[s];
}

export function StatusCard({
  live,
  t,
  alertDelaySec,
}: {
  live: LiveState;
  t: Messages;
  alertDelaySec: number;
}) {
  const status = displayStatus(live);
  const a: PostureAssessment | null = live.assessment;
  const color = STATUS_COLOR[status];
  const pattern =
    a?.pattern && a.level !== 'good' ? t.pattern[a.pattern] : null;
  const measuring = status === 'good' || status === 'fair' || status === 'poor';

  let detail: string;
  if (status === 'paused') detail = '';
  else if (status === 'away') detail = '';
  else if (status === 'checking')
    detail = live.issue ? t.issue[live.issue] : t.loading;
  else if (pattern) detail = pattern.fix;
  else detail = t.calibrateTip2;

  return (
    <section className="panel relative overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.16] blur-3xl transition-colors duration-700"
        style={{ background: color }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            className="flex items-center gap-2 text-[13px] font-medium"
            style={{ color }}
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5">
              {measuring && status !== 'good' && (
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: color }}
                />
              )}
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ background: color }}
              />
            </span>
            {statusLabel(status, t)}
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-ink-1">
            {pattern
              ? pattern.name
              : measuring
                ? t.statusGood
                : statusLabel(status, t)}
          </h2>
          {pattern && (
            <p className="mt-1 text-sm text-ink-2">{pattern.short}</p>
          )}
        </div>
        <ScoreRing
          score={measuring && a ? a.score : null}
          color={color}
          label={t.scoreLabel}
        />
      </div>
      {detail && (
        <p className="relative mt-4 text-[13px] leading-relaxed text-ink-2">
          {detail}
        </p>
      )}

      {measuring && (
        <div className="relative mt-4">
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-[width] duration-300 ease-linear"
              style={{
                width: `${Math.round(live.alertProgress * 100)}%`,
                background: color,
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-3">
            {format(t.alertIn, { s: alertDelaySec })}
          </p>
        </div>
      )}
    </section>
  );
}

function ScoreRing({
  score,
  color,
  label,
}: {
  score: number | null;
  color: string;
  label: string;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const v = score === null ? 0 : score / 100;
  return (
    <div
      className="relative grid h-[68px] w-[68px] shrink-0 place-items-center"
      role="meter"
      aria-label={label}
      aria-valuenow={score ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{
            transition: 'stroke-dashoffset 500ms ease, stroke 500ms ease',
          }}
        />
      </svg>
      <span className="font-mono text-lg font-semibold tabular-nums text-ink-1">
        {score ?? '–'}
      </span>
    </div>
  );
}
