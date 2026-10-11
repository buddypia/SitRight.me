import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOCALE,
  detectBrowserLocale,
  formatDuration,
  isSupportedLocale,
  LOCALE_OPTIONS,
  LOCALE_REGISTRY,
  MESSAGES,
  resolveLocale,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/i18n/messages';

/** ネストした文言を "pattern.slouch" のようなキーで平らにする */
const flatten = (obj: object, prefix = ''): Record<string, string> =>
  Object.entries(obj).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') acc[key] = v;
    else Object.assign(acc, flatten(v as object, key));
    return acc;
  }, {});

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('i18n messages', () => {
  const source = flatten(MESSAGES.ja);
  const locales = Object.keys(MESSAGES) as Locale[];

  it.each(locales)('%s has every key with non-empty text', (locale) => {
    const messages = flatten(MESSAGES[locale]);
    expect(Object.keys(messages).sort()).toEqual(Object.keys(source).sort());
    for (const [key, text] of Object.entries(messages))
      expect(text.trim(), key).not.toBe('');
  });

  it.each(locales)('%s keeps the same placeholders', (locale) => {
    const messages = flatten(MESSAGES[locale]);
    for (const [key, text] of Object.entries(source))
      expect(placeholders(messages[key]), key).toEqual(placeholders(text));
  });

  it('verifies supported locales and fallback default', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'ja', 'ko']);
    expect(DEFAULT_LOCALE).toBe('en');
  });

  it('validates isSupportedLocale correctly', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('ja')).toBe(true);
    expect(isSupportedLocale('ko')).toBe(true);
    expect(isSupportedLocale('fr')).toBe(false);
    expect(isSupportedLocale('de')).toBe(false);
    expect(isSupportedLocale('zh')).toBe(false);
    expect(isSupportedLocale('')).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(123)).toBe(false);
  });

  describe('resolveLocale', () => {
    it('matches exact supported locale codes', () => {
      expect(resolveLocale(['ja'])).toBe('ja');
      expect(resolveLocale(['ko'])).toBe('ko');
      expect(resolveLocale(['en'])).toBe('en');
    });

    it('matches BCP-47 language subtags without hardcoded rules', () => {
      expect(resolveLocale(['ja-JP'])).toBe('ja');
      expect(resolveLocale(['ko-KR'])).toBe('ko');
      expect(resolveLocale(['en-US'])).toBe('en');
      expect(resolveLocale(['en-GB'])).toBe('en');
      expect(resolveLocale(['ja-Kana-JP'])).toBe('ja');
      expect(resolveLocale(['ko_KR'])).toBe('ko');
    });

    it('handles case-insensitivity and leading/trailing whitespace', () => {
      expect(resolveLocale([' JA-jp '])).toBe('ja');
      expect(resolveLocale(['KO_kr'])).toBe('ko');
      expect(resolveLocale([' EN '])).toBe('en');
    });

    it('respects user priority order in languages array', () => {
      expect(resolveLocale(['fr-FR', 'ja-JP', 'en-US'])).toBe('ja');
      expect(resolveLocale(['de', 'zh-CN', 'ko-KR'])).toBe('ko');
      expect(resolveLocale(['en-CA', 'ja'])).toBe('en');
    });

    it('falls back to English when no supported language matches', () => {
      expect(resolveLocale(['fr-FR', 'de-DE', 'es'])).toBe('en');
      expect(resolveLocale([])).toBe('en');
      expect(resolveLocale([null, undefined, '', 123, {}, []])).toBe('en');
    });
  });

  describe('detectBrowserLocale', () => {
    const originalNavigator = globalThis.navigator;

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      });
    });

    it('detects from navigator.languages when available', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['ja-JP', 'en-US'], language: 'en-US' },
        configurable: true,
        writable: true,
      });
      expect(detectBrowserLocale()).toBe('ja');
    });

    it('detects Korean from navigator.languages', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['ko-KR', 'en'], language: 'ko' },
        configurable: true,
        writable: true,
      });
      expect(detectBrowserLocale()).toBe('ko');
    });

    it('falls back to navigator.language when languages array is empty or unsupported', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['fr-FR'], language: 'ja' },
        configurable: true,
        writable: true,
      });
      expect(detectBrowserLocale()).toBe('ja');
    });

    it('falls back to default English when language is unsupported', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['it-IT', 'es'], language: 'it' },
        configurable: true,
        writable: true,
      });
      expect(detectBrowserLocale()).toBe('en');
    });

    it('falls back to English when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      expect(detectBrowserLocale()).toBe('en');
    });
  });

  describe('formatDuration', () => {
    it('formats hours and minutes across all locales', () => {
      const sec = 3600 * 2 + 60 * 15; // 2h 15m
      expect(formatDuration(sec, MESSAGES.ja)).toBe('2時間15分');
      expect(formatDuration(sec, MESSAGES.ko)).toBe('2시간 15분');
      expect(formatDuration(sec, MESSAGES.en)).toBe('2h 15m');
    });

    it('formats minutes only across all locales', () => {
      const sec = 60 * 45; // 45m
      expect(formatDuration(sec, MESSAGES.ja)).toBe('45分');
      expect(formatDuration(sec, MESSAGES.ko)).toBe('45분');
      expect(formatDuration(sec, MESSAGES.en)).toBe('45m');
    });

    it('safely handles 0, negative values, and non-finite numbers', () => {
      expect(formatDuration(0, MESSAGES.en)).toBe('0m');
      expect(formatDuration(-120, MESSAGES.en)).toBe('0m');
      expect(formatDuration(NaN, MESSAGES.ja)).toBe('0分');
      expect(formatDuration(Infinity, MESSAGES.ko)).toBe('0분');
    });
  });

  describe('LOCALE_REGISTRY and LOCALE_OPTIONS', () => {
    it('provides native names and BCP-47 tags', () => {
      expect(LOCALE_REGISTRY.en).toEqual({
        code: 'en',
        nativeName: 'English',
        bcp47: 'en-US',
      });
      expect(LOCALE_REGISTRY.ja).toEqual({
        code: 'ja',
        nativeName: '日本語',
        bcp47: 'ja-JP',
      });
      expect(LOCALE_REGISTRY.ko).toEqual({
        code: 'ko',
        nativeName: '한국어',
        bcp47: 'ko-KR',
      });
    });

    it('generates options matching supported locales', () => {
      expect(LOCALE_OPTIONS).toEqual([
        { value: 'en', label: 'English' },
        { value: 'ja', label: '日本語' },
        { value: 'ko', label: '한국어' },
      ]);
    });
  });
});
