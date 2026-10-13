import { describe, expect, it, vi } from 'vitest';
import {
  downloadCsv,
  downloadJson,
  escapeCsv,
  exportAllStatsToJson,
  exportDayStatsToSummaryCsv,
  exportDayStatsToTimelineCsv,
  getSummaryHeaders,
  getTimelineHeaders,
  UTF8_BOM,
} from '@/core/export';
import type { DayStats } from '@/core/stats';

describe('export utilities', () => {
  describe('escapeCsv', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsv(null)).toBe('');
      expect(escapeCsv(undefined)).toBe('');
    });

    it('returns plain strings and numbers as-is', () => {
      expect(escapeCsv('2026-10-13')).toBe('2026-10-13');
      expect(escapeCsv(123)).toBe('123');
      expect(escapeCsv(0)).toBe('0');
    });

    it('escapes strings containing comma, quote, or newline', () => {
      expect(escapeCsv('hello,world')).toBe('"hello,world"');
      expect(escapeCsv('quote "test"')).toBe('"quote ""test"""');
      expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
      expect(escapeCsv('line1\r\nline2')).toBe('"line1\r\nline2"');
    });
  });

  describe('headers', () => {
    it('returns correct summary headers per locale', () => {
      const jaHeaders = getSummaryHeaders('ja');
      const enHeaders = getSummaryHeaders('en');
      const koHeaders = getSummaryHeaders('ko');

      expect(jaHeaders[0]).toBe('日付');
      expect(enHeaders[0]).toBe('Date');
      expect(koHeaders[0]).toBe('날짜');
      expect(jaHeaders.length).toBe(enHeaders.length);
      expect(jaHeaders.length).toBe(koHeaders.length);
    });

    it('returns correct timeline headers per locale', () => {
      const jaHeaders = getTimelineHeaders('ja');
      const enHeaders = getTimelineHeaders('en');
      const koHeaders = getTimelineHeaders('ko');

      expect(jaHeaders[0]).toBe('日付');
      expect(enHeaders[0]).toBe('Date');
      expect(koHeaders[0]).toBe('날짜');
      expect(jaHeaders.length).toBe(enHeaders.length);
      expect(jaHeaders.length).toBe(koHeaders.length);
    });
  });

  describe('exportDayStatsToSummaryCsv', () => {
    it('handles empty days array gracefully', () => {
      const csv = exportDayStatsToSummaryCsv([]);
      expect(csv).toContain('日付');
      // Only 1 line (headers)
      expect(csv.split('\r\n').length).toBe(1);
    });

    it('exports days in ascending date order and correctly formats values', () => {
      const sampleDays: DayStats[] = [
        {
          date: '2026-10-12',
          monitoredSec: 120,
          goodSec: 60,
          fairSec: 30,
          poorSec: 30,
          alerts: 2,
          recoveries: 1,
          patternSec: {
            straight_neck: 30,
            text_neck: 0,
            neck_hunch: 0,
            slouch: 0,
            lean: 0,
          },
          timeline: [],
        },
        {
          date: '2026-10-11',
          monitoredSec: 300,
          goodSec: 240,
          fairSec: 60,
          poorSec: 0,
          alerts: 1,
          recoveries: 1,
          patternSec: {
            slouch: 60,
          },
          timeline: [],
        },
      ];

      const csv = exportDayStatsToSummaryCsv(sampleDays, { locale: 'ja' });
      const lines = csv.split('\r\n');
      expect(lines.length).toBe(3);

      // Line 1 is headers
      expect(lines[0]).toContain('日付,計測時間 (分),良い姿勢 (分)');

      // Line 2 must be 2026-10-11 (older date first)
      expect(lines[1]).toContain('2026-10-11');
      expect(lines[1]).toContain('5.0'); // 300 / 60
      expect(lines[1]).toContain('4.0'); // 240 / 60
      expect(lines[1]).toContain('80.0'); // goodRatio (240 / 300 = 80%)

      // Line 3 must be 2026-10-12
      expect(lines[2]).toContain('2026-10-12');
      expect(lines[2]).toContain('2.0'); // 120 / 60
      expect(lines[2]).toContain('50.0'); // 50% recovery rate (1 / 2)
    });

    it('supports English locale', () => {
      const sampleDays: DayStats[] = [
        {
          date: '2026-10-13',
          monitoredSec: 60,
          goodSec: 60,
          fairSec: 0,
          poorSec: 0,
          alerts: 0,
          recoveries: 0,
          patternSec: {},
          timeline: [],
        },
      ];
      const csv = exportDayStatsToSummaryCsv(sampleDays, { locale: 'en' });
      expect(csv).toContain('Date,Monitored (min),Good Posture (min)');
      expect(csv).toContain('2026-10-13,1.0,1.0,0.0,0.0,100.0,0,0,,0.0,0.0,0.0,0.0,0.0,60');
    });
  });

  describe('exportDayStatsToTimelineCsv', () => {
    it('handles empty days or empty timeline gracefully', () => {
      const csv = exportDayStatsToTimelineCsv([]);
      expect(csv).toContain('日付');
      expect(csv.split('\r\n').length).toBe(1);
    });

    it('formats timeline minutes into HH:MM and sets score & level', () => {
      const sampleDays: DayStats[] = [
        {
          date: '2026-10-13',
          monitoredSec: 120,
          goodSec: 60,
          fairSec: 30,
          poorSec: 30,
          alerts: 0,
          recoveries: 0,
          patternSec: {},
          timeline: [
            [545, 85, 60], // 9:05, score 85 -> 良い
            [546, 35, 60], // 9:06, score 35 -> 崩れ
          ],
        },
      ];

      const csv = exportDayStatsToTimelineCsv(sampleDays, { locale: 'ja' });
      const lines = csv.split('\r\n');
      expect(lines.length).toBe(3);

      expect(lines[1]).toBe('2026-10-13,09:05,85,良い,60');
      expect(lines[2]).toBe('2026-10-13,09:06,35,崩れ,60');
    });

    it('outputs English labels in English locale', () => {
      const sampleDays: DayStats[] = [
        {
          date: '2026-10-13',
          monitoredSec: 60,
          goodSec: 60,
          fairSec: 0,
          poorSec: 0,
          alerts: 0,
          recoveries: 0,
          patternSec: {},
          timeline: [[600, 55, 60]], // 10:00, score 55 -> Fair
        },
      ];

      const csv = exportDayStatsToTimelineCsv(sampleDays, { locale: 'en' });
      expect(csv).toContain('Date,Time,Posture Score (0-100),Status Level,Sample Duration (sec)');
      expect(csv).toContain('2026-10-13,10:00,55,Fair,60');
    });
  });

  describe('exportAllStatsToJson', () => {
    it('generates valid JSON with app metadata and history', () => {
      const sampleDays: DayStats[] = [
        {
          date: '2026-10-13',
          monitoredSec: 60,
          goodSec: 60,
          fairSec: 0,
          poorSec: 0,
          alerts: 0,
          recoveries: 0,
          patternSec: {},
          timeline: [],
        },
      ];

      const jsonStr = exportAllStatsToJson(sampleDays, { exportedBy: 'test' });
      const parsed = JSON.parse(jsonStr);

      expect(parsed.appName).toBe('SitRight.me');
      expect(parsed.version).toBe('1.0');
      expect(parsed.daysCount).toBe(1);
      expect(parsed.history).toHaveLength(1);
      expect(parsed.metadata.exportedBy).toBe('test');
    });
  });

  describe('UTF8_BOM', () => {
    it('is correct Unicode byte order mark', () => {
      expect(UTF8_BOM).toBe('\uFEFF');
    });
  });

  describe('downloadCsv and downloadJson', () => {
    it('returns false safely in node / SSR environment when window is undefined', () => {
      expect(downloadCsv('col1,col2\r\n1,2', 'test.csv')).toBe(false);
      expect(downloadJson('{"test":1}', 'test.json')).toBe(false);
    });

    it('executes download flow when window and document are defined', () => {
      let clicked = false;
      const fakeElement = {
        href: '',
        download: '',
        click: () => {
          clicked = true;
        },
      };

      const originalWindow = globalThis.window;
      const originalDocument = globalThis.document;
      const originalUrl = globalThis.URL;

      try {
        (globalThis as unknown as { window: unknown }).window = {};
        (globalThis as unknown as { document: unknown }).document = {
          body: {
            appendChild: vi.fn(),
            removeChild: vi.fn(),
          },
          createElement: vi.fn(() => fakeElement),
        };
        (globalThis as unknown as { URL: unknown }).URL = {
          createObjectURL: vi.fn(() => 'blob:mock-url'),
          revokeObjectURL: vi.fn(),
        };

        const ok = downloadCsv('col1,col2\r\n1,2', 'test.csv');
        expect(ok).toBe(true);
        expect(fakeElement.download).toBe('test.csv');
        expect(clicked).toBe(true);

        const okJson = downloadJson('{"hello":"world"}', 'test.json');
        expect(okJson).toBe(true);
        expect(fakeElement.download).toBe('test.json');
      } finally {
        (globalThis as unknown as { window: unknown }).window = originalWindow;
        (globalThis as unknown as { document: unknown }).document =
          originalDocument;
        (globalThis as unknown as { URL: unknown }).URL = originalUrl;
      }
    });
  });
});


