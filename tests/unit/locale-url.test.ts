import { describe, expect, it } from 'vitest';
import {
  SUPPORTED_LOCALES,
  isLocalePath,
  localeFromPath,
  localePath,
} from '@/i18n/messages';

describe('言語ごとの URL', () => {
  it('既定の英語はトップ、ほかは /ja・/ko', () => {
    expect(localePath('en')).toBe('/');
    expect(localePath('ja')).toBe('/ja');
    expect(localePath('ko')).toBe('/ko');
  });

  it('URL から言語を読む（末尾の / は無視）', () => {
    expect(localeFromPath('/ja')).toBe('ja');
    expect(localeFromPath('/ko/')).toBe('ko');
    expect(localeFromPath('/')).toBeNull();
    expect(localeFromPath('/en')).toBeNull();
    expect(localeFromPath('/lab')).toBeNull();
    expect(localeFromPath('/ja/extra')).toBeNull();
  });

  it('言語ページだけを書き換えの対象にする', () => {
    expect(isLocalePath('/')).toBe(true);
    expect(isLocalePath('/ja')).toBe(true);
    expect(isLocalePath('/lab')).toBe(false);
  });

  it('全言語で往復できる', () => {
    for (const l of SUPPORTED_LOCALES) {
      expect(localeFromPath(localePath(l)) ?? 'en').toBe(l);
    }
  });
});
