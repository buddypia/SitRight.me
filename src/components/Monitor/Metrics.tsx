'use client';

import type { PostureAssessment } from '@/core/types';
import type { Messages } from '@/i18n/messages';

const sevColor = (s: number) =>
  s >= 0.6 ? 'var(--poor)' : s >= 0.3 ? 'var(--fair)' : 'var(--good)';

interface Row {
  key: string;
  label: string;
  value: string;
  unit: string;
  severity: number;
  hint: string;
}

export function Metrics({
  assessment,
  t,
  dimmed,
}: {
  assessment: PostureAssessment | null;
  t: Messages;
  dimmed: boolean;
}) {
  const a = assessment;
  const signed = (v: number, digits = 1) => {
    const text = Math.abs(v).toFixed(digits);
    if (Number(text) === 0) return (0).toFixed(digits);
    return `${v > 0 ? '+' : '−'}${text}`;
  };
  // 上体と首の傾きのうち大きい方を、本人から見た左右で示す
  const leanValue = () => {
    if (!a) return { value: '–', unit: t.unitDeg };
    const { leanDeg, headTiltDeg } = a.deviation;
    const v =
      Math.abs(leanDeg) >= Math.abs(headTiltDeg) ? leanDeg : headTiltDeg;
    const deg = Math.round(Math.abs(v));
    if (deg === 0) return { value: '0', unit: t.unitDeg };
    return {
      value: `${v > 0 ? t.sideRight : t.sideLeft} ${deg}`,
      unit: t.unitDeg,
    };
  };
  const rows: Row[] = [
    {
      key: 'forward',
      label: t.metricForward,
      value: a ? signed(a.deviation.headForwardCm) : '–',
      unit: t.unitCm,
      severity: a?.severity.forward ?? 0,
      hint: t.metricForwardHint,
    },
    {
      key: 'down',
      label: t.metricDown,
      value: a ? signed(a.deviation.headDownDeg, 0) : '–',
      unit: t.unitDeg,
      severity: a?.severity.down ?? 0,
      hint: t.metricDownHint,
    },
    {
      key: 'slump',
      label: t.metricSlump,
      value: a ? signed(Math.max(-99, a.deviation.compression * 100), 0) : '–',
      unit: '%',
      severity: a?.severity.slump ?? 0,
      hint: t.metricSlumpHint,
    },
    {
      key: 'lean',
      label: t.metricLean,
      ...leanValue(),
      severity: a?.severity.lean ?? 0,
      hint: t.metricLeanHint,
    },
    {
      key: 'load',
      label: t.metricLoad,
      value: a ? a.neckLoadKg.toFixed(1) : '–',
      unit: t.unitKg,
      severity: a ? Math.min(1, Math.max(0, a.neckLoadKg / 18)) : 0,
      hint: t.metricLoadHint,
    },
  ];

  return (
    <section
      className={`panel divide-y divide-line transition-opacity ${dimmed ? 'opacity-50' : ''}`}
    >
      {rows.map((r) => (
        <div
          key={r.key}
          className="group/row relative flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
          title={r.hint}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] leading-5 text-ink-2">
              {r.label}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(3, r.severity * 100)}%`,
                  background: sevColor(r.severity),
                }}
              />
            </div>
          </div>
          <p className="w-[88px] shrink-0 whitespace-nowrap text-right tabular-nums">
            <span className="text-xl font-semibold text-ink-1">{r.value}</span>
            <span className="ml-1 text-xs text-ink-3">{r.unit}</span>
          </p>
          <div
            role="tooltip"
            className="pointer-events-none invisible absolute bottom-full left-5 right-5 z-30 mb-1.5 rounded-xl border border-white/15 bg-[#141820]/95 px-3 py-2 text-[11px] leading-relaxed text-ink-2 opacity-0 shadow-xl transition-opacity duration-150 group-hover/row:visible group-hover/row:opacity-100"
          >
            <p className="text-ink-2">{r.hint}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
