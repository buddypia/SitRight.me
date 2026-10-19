'use client';

import type { PostureAssessment } from '@/core/types';
import type { Messages } from '@/i18n/messages';
import { format } from '@/i18n/messages';
import type { LiveState } from '@/stores/appStore';
import { Logo } from '../ui';

export type DisplayStatus =
  'good' | 'fair' | 'poor' | 'paused' | 'away' | 'checking' | 'loading';

export function displayStatus(live: LiveState): DisplayStatus {
  if (live.paused) return 'paused';
  if (live.away) return 'away';
  if (live.engine === 'loading') return 'loading';
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
  loading: 'var(--ink-3)',
};

/** 計測中でかつ姿勢が崩れている（注意・要改善）状態 */
export function isPostureCollapsed(s: DisplayStatus): boolean {
  return s === 'fair' || s === 'poor';
}

export function statusLabel(s: DisplayStatus, t: Messages): string {
  return {
    good: t.statusGood,
    fair: t.statusFair,
    poor: t.statusPoor,
    paused: t.statusPaused,
    away: t.statusAway,
    checking: t.statusChecking,
    loading: t.modelLoadingVision,
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
  const isGood = status === 'good';
  const isLoading = status === 'loading';

  let detail: string;
  if (status === 'paused') detail = '';
  else if (status === 'away') detail = '';
  else if (isLoading) detail = t.setupModelLoading;
  else if (status === 'checking')
    detail = live.issue ? t.issue[live.issue] : t.loading;
  else if (pattern) detail = pattern.fix;
  else detail = t.alignmentBalanced;

  // 上部バッジ：良い姿勢のときは見出し（良い姿勢）と重ならない「正しい姿勢」、
  // 崩れているときは「やや崩れています」などの状態を出す
  const badgeLabel = isGood
    ? t.alignmentOptimal
    : isLoading
      ? t.modelLoadingVision
      : statusLabel(status, t);

  const subtitleText = pattern
    ? pattern.short
    : isGood
      ? t.alignmentBalanced
      : '\u00A0';

  return (
    <section className="panel relative p-5">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        aria-hidden
      >
        <div
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.16] blur-3xl transition-colors duration-700"
          style={{ background: color }}
        />
      </div>
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p
            className="flex h-5 items-center gap-2 text-[13px] leading-5 font-medium"
            style={{ color }}
            aria-live="polite"
          >
            <StatusIcon status={status} />
            <span className="truncate">{badgeLabel}</span>
          </p>
          <h2 className="mt-2 truncate text-xl font-semibold leading-7 tracking-tight text-ink-1">
            {pattern
              ? pattern.name
              : isGood
                ? t.statusGood
                : isLoading
                  ? t.modelLoadingVision
                  : statusLabel(status, t)}
          </h2>
          <p
            className={`mt-1 truncate text-[13px] leading-5 ${
              pattern ? 'text-ink-2' : 'text-ink-3'
            }`}
          >
            {subtitleText}
          </p>
        </div>
        <ScoreRing
          score={measuring && a ? a.score : null}
          color={color}
          label={t.scoreLabel}
          hint={t.scoreHint}
          loading={isLoading}
        />
      </div>

      {/* 下部スロット：高さを固定し、良い姿勢と崩れた姿勢の切り替えでレイアウトが揺れないようにする */}
      <div className="relative mt-4 h-[108px] sm:h-[92px]">
        {isGood && a ? (
          <SpineAlignmentHUD assessment={a} t={t} />
        ) : (
          <div className="flex h-full flex-col justify-between">
            <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-2">
              {detail || '\u00A0'}
            </p>
            {isPostureCollapsed(status) && (
              <div>
                <div className="h-1 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full transition-[width] duration-300 ease-linear"
                    style={{
                      width: `${Math.round(live.alertProgress * 100)}%`,
                      background: color,
                    }}
                  />
                </div>
                <p className="mt-1.5 truncate text-[11px] leading-4 text-ink-3">
                  {format(t.alertIn, { s: alertDelaySec })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * 身体の垂直アライメント状態を象徴するステータスアイコン
 * 状態が変わっても 16x16 の外枠を保ち、テキスト位置のズレを防ぐ
 */
export function StatusIcon({ status }: { status: DisplayStatus }) {
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center"
      aria-hidden
    >
      {status === 'loading' ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : status === 'good' ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-good"
        >
          {/* 垂直基準線 */}
          <path
            d="M8 1.5v13"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="1.5 2"
            strokeLinecap="round"
            opacity="0.45"
          />
          {/* 3つの整列ノード（頭・首・体幹） */}
          <circle cx="8" cy="3.5" r="2" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="12.5" r="1.8" fill="currentColor" />
        </svg>
      ) : status === 'fair' || status === 'poor' ? (
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          className="shrink-0 text-current"
        >
          <path
            d="M8 1.5v13"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="1.5 2"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M10.5 3.5 C9 6.5 6.5 9 6.5 12.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="10.5" cy="3.5" r="1.8" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r="1.8" fill="currentColor" />
        </svg>
      ) : (
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" />
      )}
    </span>
  );
}

/**
 * 良い姿勢の時に表示する「Spine Alignment & Balance Visualizer」
 * 3つの主要軸（前後・うつむき・左右傾き）が中央の基準（0）にどれだけ近いかを可視化
 */
function SpineAlignmentHUD({
  assessment,
  t,
}: {
  assessment: PostureAssessment;
  t: Messages;
}) {
  const { deviation, neckLoadKg } = assessment;
  const fwd = Math.max(-1, Math.min(1, deviation.headForwardCm / 3));
  const pitch = Math.max(-1, Math.min(1, deviation.headDownDeg / 8));
  const lean = Math.max(-1, Math.min(1, deviation.leanDeg / 6));

  return (
    <div
      className="group/hud relative flex h-full flex-col justify-between rounded-xl border border-good/20 bg-good/[0.04] p-3"
      title={t.balanceHudHint}
    >
      <div className="flex h-4 items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-good">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="shrink-0 text-good"
            aria-hidden
          >
            <path
              d="M2.5 6.2 5 8.5l4.5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate">{t.alignmentAllGood}</span>
        </span>
        <span className="whitespace-nowrap text-[11px] tabular-nums text-ink-2">
          {format(t.alignmentLoadOptimal, { kg: neckLoadKg.toFixed(1) })}
        </span>
      </div>

      {/* 3軸バランスビジュアライザー */}
      <div className="grid grid-cols-3 gap-2">
        <AxisNode
          label={t.metricForward}
          val={`${deviation.headForwardCm > 0 ? '+' : ''}${deviation.headForwardCm.toFixed(1)}${t.unitCm}`}
          offset={fwd}
          hint={`${t.metricForwardHint} (${t.balanceHudHint})`}
        />
        <AxisNode
          label={t.metricDown}
          val={`${deviation.headDownDeg > 0 ? '+' : ''}${Math.round(deviation.headDownDeg)}${t.unitDeg}`}
          offset={pitch}
          hint={`${t.metricDownHint} (${t.balanceHudHint})`}
        />
        <AxisNode
          label={t.metricLean}
          val={
            Math.abs(deviation.leanDeg) < 1
              ? t.leanLevel
              : `${Math.abs(Math.round(deviation.leanDeg))}${t.unitDeg}`
          }
          offset={lean}
          hint={`${t.metricLeanHint} (${t.balanceHudHint})`}
        />
      </div>

      <div
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-0 right-0 z-30 mb-2 rounded-xl border border-white/15 bg-[#141820]/95 px-3 py-2 text-[11px] leading-relaxed text-ink-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover/hud:visible group-hover/hud:opacity-100"
      >
        {t.balanceHudHint}
      </div>
    </div>
  );
}

function AxisNode({
  label,
  val,
  offset,
  hint,
}: {
  label: string;
  val: string;
  offset: number;
  hint: string;
}) {
  // offset は -1..1 (0 がジャストセンター)
  // % 位置: 50% + offset * 35%
  const pct = 50 + offset * 35;
  return (
    <div
      className="rounded-lg bg-black/25 px-2 py-1.5 text-center"
      title={hint}
    >
      <div className="flex flex-col items-center gap-0.5 text-[10px] leading-4 text-ink-3 sm:flex-row sm:justify-between">
        <span className="min-w-0 max-w-full truncate">{label}</span>
        <span className="whitespace-nowrap font-medium tabular-nums text-ink-2">
          {val}
        </span>
      </div>
      <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        {/* センターの基準線 */}
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/20" />
        {/* 整列ポインタ */}
        <div
          className="absolute top-0 h-1.5 w-2 -translate-x-1/2 rounded-full bg-good shadow-[0_0_6px_var(--good)] transition-[left] duration-300"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreRing({
  score,
  color,
  label,
  hint,
  loading = false,
}: {
  score: number | null;
  color: string;
  label: string;
  hint: string;
  loading?: boolean;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const v = score === null ? 0 : score / 100;
  return (
    <div
      className="group/score relative grid h-[68px] w-[68px] shrink-0 cursor-help place-items-center"
      role="meter"
      aria-label={label}
      aria-valuenow={score ?? undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      title={hint}
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
          className={loading ? 'animate-pulse' : undefined}
          style={{
            transition: 'stroke-dashoffset 500ms ease, stroke 500ms ease',
          }}
        />
      </svg>
      {loading ? (
        <Logo size={28} />
      ) : (
        <span className="text-lg font-semibold tabular-nums text-ink-1">
          {score ?? '–'}
        </span>
      )}
      <div
        role="tooltip"
        className="pointer-events-none invisible absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-white/15 bg-[#141820]/95 px-3 py-2 text-left text-[11px] leading-relaxed text-ink-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover/score:visible group-hover/score:opacity-100"
      >
        <p className="font-semibold text-ink-1">{label}</p>
        <p className="mt-0.5 text-ink-3">{hint}</p>
      </div>
    </div>
  );
}
