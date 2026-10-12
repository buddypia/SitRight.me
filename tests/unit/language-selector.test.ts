import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_LOCALE,
  LOCALE_OPTIONS,
  LOCALE_REGISTRY,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  resolveLocale,
} from '@/i18n/messages';
import { useAppStore } from '@/stores/appStore';

describe('Language Selector Architecture & Store Integration', () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: {
        ...useAppStore.getState().settings,
        locale: DEFAULT_LOCALE,
      },
    });
  });

  it('matches all SUPPORTED_LOCALES with LOCALE_OPTIONS and LOCALE_REGISTRY', () => {
    expect(LOCALE_OPTIONS.map((o) => o.value)).toEqual([...SUPPORTED_LOCALES]);

    for (const code of SUPPORTED_LOCALES) {
      const reg = LOCALE_REGISTRY[code];
      expect(reg).toBeDefined();
      expect(reg.code).toBe(code);
      expect(reg.nativeName.length).toBeGreaterThan(0);
      expect(reg.bcp47).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });

  it('updates store locale and persists changes across locale updates', () => {
    const store = useAppStore.getState();
    expect(store.settings.locale).toBe('en');

    // Switch to Japanese
    store.updateSettings({ locale: 'ja' });
    expect(useAppStore.getState().settings.locale).toBe('ja');

    // Switch to Korean
    store.updateSettings({ locale: 'ko' });
    expect(useAppStore.getState().settings.locale).toBe('ko');

    // Switch back to English
    store.updateSettings({ locale: 'en' });
    expect(useAppStore.getState().settings.locale).toBe('en');
  });

  it('resolves browser languages gracefully without crashes', () => {
    expect(resolveLocale(['ja-JP', 'ja', 'en'])).toBe('ja');
    expect(resolveLocale(['ko-KR', 'ko'])).toBe('ko');
    expect(resolveLocale(['en-US', 'en'])).toBe('en');
    expect(resolveLocale(['fr-FR', 'de-DE'])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale([])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale([null, undefined, ''])).toBe(DEFAULT_LOCALE);
  });

  it('validates supported locales strictly', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('ja')).toBe(true);
    expect(isSupportedLocale('ko')).toBe(true);
    expect(isSupportedLocale('es')).toBe(false);
    expect(isSupportedLocale(123)).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
  });
});
