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

  describe('prohibited terminology and tone contract', () => {
    it('enforces industry-standard PiP terminology across all locales', () => {
      expect(MESSAGES.ja.pipOpen).toBe('ピクチャー イン ピクチャー');
      expect(MESSAGES.ja.pipClose).toBe('ピクチャー イン ピクチャーを閉じる');
      expect(MESSAGES.ja.pipActive).toBe('ピクチャー イン ピクチャーで表示中');

      expect(MESSAGES.en.pipOpen).toBe('Picture-in-Picture');
      expect(MESSAGES.en.pipClose).toBe('Exit Picture-in-Picture');
      expect(MESSAGES.en.pipActive).toBe('Showing in Picture-in-Picture');

      expect(MESSAGES.ko.pipOpen).toBe('PIP 모드');
      expect(MESSAGES.ko.pipClose).toBe('PIP 모드 종료');
      expect(MESSAGES.ko.pipActive).toBe('PIP 모드로 표시 중');
    });

    it('prohibits informal, creepy, or awkward UI anti-patterns', () => {
      const allStrings = (loc: Locale) => JSON.stringify(MESSAGES[loc]);

      // Prohibited anti-patterns in Japanese
      for (const phrase of [
        '小窓',
        'リアル骨',
        'スポーツ女性',
        '女性（エレガンス）',
        '男性（スマート）',
        '直した！',
        'いい姿勢に戻りました',
        'ストレートネック姿勢',
        'アライメント',
        '素晴らしい',
        'ワンポイント',
        'ゴースト',
        '理想の姿勢（ガイド）',
        'ホーン',
        '意識をリセット',
        '問題なし',
        'すべて範囲内',
        '非識別統計',
        '頭が前に落ちています',
        '動きを検知しました',
        '人が見つかりません',
        '顔が見つかりません',
        '画面に正対',
      ])
        expect(allStrings('ja')).not.toContain(phrase);

      // Prohibited anti-patterns in English
      expect(allStrings('en')).not.toContain('Pop out');
      expect(allStrings('en')).not.toContain('Close pop-out');
      for (const phrase of [
        'Fixed!',
        'Actionable',
        'alignment',
        'align ',
        'Great posture',
        'Delivers',
        'tailored to',
        'stay mindful',
        'Horn bloom',
        'Titanium',
        'organic',
        ' detected.',
        'ideal ghost',
        'Woman (elegance)',
        'Man (smart)',
        'All clear',
        'All within range',
        'Face not found',
        'tendency)',
      ])
        // キー名（alignmentOptimal など）は対象外にして、表示される文だけを見る
        expect(Object.values(flatten(MESSAGES.en)).join('\n')).not.toContain(
          phrase
        );

      // Prohibited anti-patterns in Korean
      for (const phrase of [
        '작은 창',
        '훌륭한',
        '원포인트',
        '고스트',
        '혼 여운',
        '티타늄',
        '엘레강스',
        '남성 (스마트)',
        '당신의',
        '의식을 환기',
        '머리가 앞으로 떨어져',
        '몸의 기울어짐',
        '일자목 자세',
        '문제 없음',
        '움직임이 감지됐어요',
      ])
        expect(allStrings('ko')).not.toContain(phrase);
    });

    it('enforces ergonomic and professional terminology consistency', () => {
      expect(MESSAGES.ja.resetsCount).toBe('姿勢改善');
      expect(MESSAGES.en.resetsCount).toBe('Recoveries');
      expect(MESSAGES.ko.resetsCount).toBe('자세 복귀');

      expect(MESSAGES.ja.soundTheme_snap_bio).toBe('パキッ！(関節音)');
      expect(MESSAGES.ko.soundTheme_snap_bio).toBe('뚝! (관절음)');

      expect(MESSAGES.ja.avatar_womanSporty).toBe('女性（スポーティ）');
      expect(MESSAGES.ko.avatar_womanSporty).toBe('여성 (스포티)');
      expect(MESSAGES.en.avatar_womanSporty).toBe('Woman (sporty)');

      expect(MESSAGES.ja.avatar_womanSmart).toBe('女性（エレガント）');
      expect(MESSAGES.en.avatar_womanSmart).toBe('Woman (elegant)');
      expect(MESSAGES.ko.avatar_womanSmart).toBe('여성 (정장)');

      expect(MESSAGES.ja.ideal).toBe('理想の姿勢');
      expect(MESSAGES.en.ideal).toBe('Ideal posture');
      expect(MESSAGES.ko.ideal).toBe('바른 자세');

      expect(MESSAGES.ja.you).toBe('現在の姿勢');
      expect(MESSAGES.en.you).toBe('Current posture');
      expect(MESSAGES.ko.you).toBe('현재 자세');

      expect(MESSAGES.ja.alignmentOptimal).toBe('正しい姿勢');
      expect(MESSAGES.en.alignmentOptimal).toBe('Proper posture');
      expect(MESSAGES.ko.alignmentOptimal).toBe('바른 자세 유지 중');

      expect(MESSAGES.ja.welcomeResume).toBe('モニタリングを再開');
      expect(MESSAGES.en.welcomeResume).toBe('Resume monitoring');
      expect(MESSAGES.ko.welcomeResume).toBe('모니터링 재개');

      expect(MESSAGES.ja.cameraHidden).toBe(
        'カメラ映像は非表示です（モニタリングは継続中）'
      );
      expect(MESSAGES.en.cameraHidden).toBe(
        'Camera preview hidden (still monitoring)'
      );
      expect(MESSAGES.ko.cameraHidden).toBe(
        '카메라 영상은 숨겨져 있어요 (모니터링은 계속 중)'
      );
    });
  });
});
