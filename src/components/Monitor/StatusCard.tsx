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
  | 'checking'
  | 'loading';

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

  // 上部バッジのテキスト：AI Slop（● 良い姿勢）を脱却し、
  // 良い姿勢時は「理想的なアライメント」、崩れている時は「やや崩れています」等の状態を表示
  const badgeLabel = isGood
    ? t.alignmentOptimal
    : isLoading
      ? t.modelLoadingVision
      : statusLabel(status, t);

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
            <StatusIcon status={status} />
            <span>{badgeLabel}</span>
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-ink-1">
            {pattern
              ? pattern.name
              : isGood
                ? t.statusGood
                : isLoading
                  ? t.modelLoadingVision
                  : statusLabel(status, t)}
          </h2>
          {pattern && (
            <p className="mt-1 text-sm text-ink-2">{pattern.short}</p>
          )}
          {isGood && (
            <p className="mt-1 text-xs text-ink-3">
              {t.alignmentBalanced}
            </p>
          )}
        </div>
        <ScoreRing
          score={measuring && a ? a.score : null}
          color={color}
          label={t.scoreLabel}
          loading={isLoading}
        />
      </div>

      {/* 良い姿勢の時はリアルタイム・アライメントHUDを表示 */}
      {isGood && a && <SpineAlignmentHUD assessment={a} t={t} />}

      {/* 崩れている時・未測定時の詳細テキスト */}
      {!isGood && detail && (
        <p className="relative mt-4 text-[13px] leading-relaxed text-ink-2">
          {detail}
        </p>
      )}

      {/* 姿勢崩れ時の警告カウントダウンバー */}
      {isPostureCollapsed(status) && (
        <div className="relative mt-4">
          <div className="h-1 overflow-hidden rounded-full bg-white/6">
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

/**
 * 身体の垂直アライメント状態を象徴するステータスアイコン
 * AI Slop な単なる丸ポチ（●）ではなく、脊椎・垂直軸の整列状態をミニマルに表現
 */
function StatusIcon({ status }: { status: DisplayStatus }) {
  if (status === 'loading') {
    return (
      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    );
  }

  if (status === 'good') {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        className="shrink-0 text-good"
        aria-hidden
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
    );
  }

  if (status === 'fair' || status === 'poor') {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        className="shrink-0 text-current"
        aria-hidden
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
    );
  }

  // checking / paused / away
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" />
    </span>
  );
}

/**
 * 良い姿勢の時に表示する「Spine Alignment & Balance Visualizer」
 * 3つの主要アライメント軸（前後・うつむき・左右傾き）が中央の理想垂線（Plumb Line）に
 * どれだけ美しく整列しているかをリアルタイムに可視化
 */
function SpineAlignmentHUD({
  assessment,
  t,
}: {
  assessment: PostureAssessment;
  t: Messages;
}) {
  const { deviation, neckLoadKg } = assessment;
  // 各軸のズレ量（理想は 0）
  // 1. 前後 (headForwardCm): 許容範囲 ±1.5cm 以内ならジャスト
  // 2. 角度 (headDownDeg): 許容範囲 ±4° 以内ならジャスト
  // 3. 傾き (leanDeg): 許容範囲 ±3° 以内ならジャスト
  const fwd = Math.max(-1, Math.min(1, deviation.headForwardCm / 3));
  const pitch = Math.max(-1, Math.min(1, deviation.headDownDeg / 8));
  const lean = Math.max(-1, Math.min(1, deviation.leanDeg / 6));

  return (
    <div className="mt-4 rounded-xl border border-good/20 bg-good/[0.04] p-3 backdrop-blur-xs">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-good">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-good"
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
          {t.alignmentAllGood}
        </span>
        <span className="font-mono text-[11px] text-ink-2">
          {format(t.alignmentLoadOptimal, { kg: neckLoadKg.toFixed(1) })}
        </span>
      </div>

      {/* 3軸アライメントビジュアライザー */}
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        <AxisNode
          label={t.metricForward}
          val={`${deviation.headForwardCm > 0 ? '+' : ''}${deviation.headForwardCm.toFixed(1)}${t.unitCm}`}
          offset={fwd}
        />
        <AxisNode
          label={t.metricDown}
          val={`${deviation.headDownDeg > 0 ? '+' : ''}${Math.round(deviation.headDownDeg)}${t.unitDeg}`}
          offset={pitch}
        />
        <AxisNode
          label={t.metricLean}
          val={
            Math.abs(deviation.leanDeg) < 1
              ? t.leanLevel
              : `${Math.abs(Math.round(deviation.leanDeg))}${t.unitDeg}`
          }
          offset={lean}
        />
      </div>
    </div>
  );
}

function AxisNode({
  label,
  val,
  offset,
}: {
  label: string;
  val: string;
  offset: number;
}) {
  // offset は -1..1 (0 がジャストセンター)
  // % 位置: 50% + offset * 35%
  const pct = 50 + offset * 35;
  return (
    <div className="rounded-lg bg-black/25 px-2 py-1.5 text-center">
      <div className="flex items-center justify-between text-[10px] text-ink-3">
        <span className="truncate">{label}</span>
        <span className="font-mono font-medium text-ink-2">{val}</span>
      </div>
      <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        {/* センターの理想線 */}
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/20" />
        {/* 整列ポインタ */}
        <div
          className="absolute top-0 h-1.5 w-2 -translate-x-1/2 rounded-full bg-good shadow-[0_0_6px_var(--good)] transition-all duration-300"
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
  loading = false,
}: {
  score: number | null;
  color: string;
  label: string;
  loading?: boolean;
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
          className={loading ? 'animate-pulse' : undefined}
          style={{
            transition: 'stroke-dashoffset 500ms ease, stroke 500ms ease',
          }}
        />
      </svg>
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
      ) : (
        <span className="font-mono text-lg font-semibold tabular-nums text-ink-1">
          {score ?? '–'}
        </span>
      )}
    </div>
  );
}
