import type { PostureAssessment, PosturePattern } from './types';

export interface DayStats {
  /** ローカル日付 YYYY-MM-DD */
  date: string;
  monitoredSec: number;
  goodSec: number;
  fairSec: number;
  poorSec: number;
  alerts: number;
  patternSec: Partial<Record<PosturePattern, number>>;
  /** [その日の分(0..1439), 平均スコア, サンプル秒] の昇順配列 */
  timeline: [number, number, number][];
}

export const HISTORY_DAYS = 14;

export const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const emptyDay = (date: string): DayStats => ({
  date,
  monitoredSec: 0,
  goodSec: 0,
  fairSec: 0,
  poorSec: 0,
  alerts: 0,
  patternSec: {},
  timeline: [],
});

/** 1ティック分の判定結果を日次統計に加算する（イミュータブル） */
export function accumulate(
  day: DayStats,
  a: PostureAssessment,
  dtSec: number,
  now: Date
): DayStats {
  const dt = Math.min(Math.max(dtSec, 0), 2);
  if (dt === 0) return day;
  const minute = now.getHours() * 60 + now.getMinutes();
  const timeline = day.timeline.slice();
  const last = timeline[timeline.length - 1];
  if (last && last[0] === minute) {
    const total = last[2] + dt;
    timeline[timeline.length - 1] = [
      minute,
      (last[1] * last[2] + a.score * dt) / total,
      total,
    ];
  } else {
    timeline.push([minute, a.score, dt]);
  }
  const patternSec = { ...day.patternSec };
  if (a.pattern && a.level !== 'good')
    patternSec[a.pattern] = (patternSec[a.pattern] ?? 0) + dt;
  return {
    ...day,
    monitoredSec: day.monitoredSec + dt,
    goodSec: day.goodSec + (a.level === 'good' ? dt : 0),
    fairSec: day.fairSec + (a.level === 'fair' ? dt : 0),
    poorSec: day.poorSec + (a.level === 'poor' ? dt : 0),
    patternSec,
    timeline,
  };
}

export const goodRatio = (d: DayStats) =>
  d.monitoredSec > 0 ? d.goodSec / d.monitoredSec : 0;

/** 古い日付を落とし、新しい順に並べる */
export function pruneHistory(days: DayStats[], today: string): DayStats[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  if (!byDate.has(today)) byDate.set(today, emptyDay(today));
  return Array.from(byDate.values())
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, HISTORY_DAYS);
}
