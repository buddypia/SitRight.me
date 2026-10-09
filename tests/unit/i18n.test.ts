import { describe, expect, it } from 'vitest';
import { MESSAGES, type Locale } from '@/i18n/messages';

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
});
