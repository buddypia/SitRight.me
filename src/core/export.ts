import {
  goodRatio,
  recoveryRate,
  type DayStats,
} from './stats';
import type { Locale, Messages } from '@/i18n/messages';

export const UTF8_BOM = '\uFEFF';

export function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExportOptions {
  locale?: Locale;
  t?: Messages;
}

export function getSummaryHeaders(locale: Locale): string[] {
  if (locale === 'en') {
    return [
      'Date',
      'Monitored (min)',
      'Good Posture (min)',
      'Fair Posture (min)',
      'Poor Posture (min)',
      'Good Posture Ratio (%)',
      'Alerts Count',
      'Recoveries Count',
      'Recovery Rate (%)',
      'Straight Neck (min)',
      'Text Neck (min)',
      'Neck Hunch (min)',
      'Slouch (min)',
      'Lean (min)',
      'Monitored (sec)',
    ];
  }
  if (locale === 'ko') {
    return [
      '날짜',
      '측정 시간 (분)',
      '좋은 자세 (분)',
      '조금 흐트러짐 (분)',
      '자세 무너짐 (분)',
      '좋은 자세 비율 (%)',
      '알림 횟수',
      '자세 복귀 횟수',
      '복귀율 (%)',
      '일자목 (분)',
      '스마트폰 목 (분)',
      '거북목 (분)',
      '굽은 등 (분)',
      '좌우 기울어짐 (분)',
      '측정 시간 (초)',
    ];
  }
  return [
    '日付',
    '計測時間 (分)',
    '良い姿勢 (分)',
    '軽度崩れ (分)',
    '姿勢崩れ (分)',
    '良い姿勢率 (%)',
    'アラート回数',
    '姿勢改善回数',
    '改善率 (%)',
    'ストレートネック (分)',
    'スマホ首 (分)',
    '首猫背 (分)',
    '猫背 (分)',
    '左右の偏り (分)',
    '計測時間 (秒)',
  ];
}

/** 日次サマリー CSV を生成する（古い日付から新しい日付順） */
export function exportDayStatsToSummaryCsv(
  days: DayStats[],
  options?: ExportOptions
): string {
  const locale = options?.locale ?? 'ja';
  const headers = getSummaryHeaders(locale);

  // 古い日付から昇順に並べる
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  const rows = sorted.map((d) => {
    const ratio = goodRatio(d);
    const recRate = recoveryRate(d);

    const straightNeckMin = ((d.patternSec.straight_neck ?? 0) / 60).toFixed(1);
    const textNeckMin = ((d.patternSec.text_neck ?? 0) / 60).toFixed(1);
    const neckHunchMin = ((d.patternSec.neck_hunch ?? 0) / 60).toFixed(1);
    const slouchMin = ((d.patternSec.slouch ?? 0) / 60).toFixed(1);
    const leanMin = ((d.patternSec.lean ?? 0) / 60).toFixed(1);

    return [
      d.date,
      (d.monitoredSec / 60).toFixed(1),
      (d.goodSec / 60).toFixed(1),
      (d.fairSec / 60).toFixed(1),
      (d.poorSec / 60).toFixed(1),
      (ratio * 100).toFixed(1),
      d.alerts,
      d.recoveries ?? 0,
      recRate !== null ? (recRate * 100).toFixed(1) : '',
      straightNeckMin,
      textNeckMin,
      neckHunchMin,
      slouchMin,
      leanMin,
      Math.round(d.monitoredSec),
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
}

export function getTimelineHeaders(locale: Locale): string[] {
  if (locale === 'en') {
    return [
      'Date',
      'Time',
      'Posture Score (0-100)',
      'Status Level',
      'Sample Duration (sec)',
    ];
  }
  if (locale === 'ko') {
    return [
      '날짜',
      '시간',
      '자세 점수 (0-100)',
      '상태 판정',
      '측정 샘플 시간 (초)',
    ];
  }
  return [
    '日付',
    '時刻',
    '姿勢スコア (0-100)',
    '判定レベル',
    '計測サンプル秒数',
  ];
}

/** 分単位の詳細タイムライン CSV を生成する（古い日付・時間から順） */
export function exportDayStatsToTimelineCsv(
  days: DayStats[],
  options?: ExportOptions
): string {
  const locale = options?.locale ?? 'ja';
  const headers = getTimelineHeaders(locale);

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const rows: string[] = [];

  for (const d of sorted) {
    const sortedTimeline = [...d.timeline].sort((a, b) => a[0] - b[0]);
    for (const [minute, score, sampleSec] of sortedTimeline) {
      const hour = Math.floor(minute / 60);
      const min = minute % 60;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

      let levelLabel = '';
      if (locale === 'en') {
        levelLabel = score >= 70 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
      } else if (locale === 'ko') {
        levelLabel = score >= 70 ? '좋음' : score >= 40 ? '보통' : '주의';
      } else {
        levelLabel = score >= 70 ? '良い' : score >= 40 ? 'やや乱れ' : '崩れ';
      }

      rows.push(
        [
          d.date,
          timeStr,
          Math.round(score),
          levelLabel,
          Math.round(sampleSec),
        ]
          .map(escapeCsv)
          .join(',')
      );
    }
  }

  return [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
}

/** 全統計データ（日次サマリーおよびタイムライン）を JSON 形式で出力する */
export function exportAllStatsToJson(
  days: DayStats[],
  metadata?: Record<string, unknown>
): string {
  const payload = {
    appName: 'SitRight.me',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    daysCount: days.length,
    history: days,
    ...(metadata ? { metadata } : {}),
  };
  return JSON.stringify(payload, null, 2);
}

/** ブラウザでファイルをダウンロードさせる */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.error('Failed to trigger download:', err);
    return false;
  }
}

/** UTF-8 BOM付きで CSV ファイルをダウンロードさせる */
export function downloadCsv(content: string, filename: string): boolean {
  return downloadFile(
    UTF8_BOM + content,
    filename,
    'text/csv;charset=utf-8;'
  );
}

/** JSON ファイルをダウンロードさせる */
export function downloadJson(content: string, filename: string): boolean {
  return downloadFile(
    content,
    filename,
    'application/json;charset=utf-8;'
  );
}
