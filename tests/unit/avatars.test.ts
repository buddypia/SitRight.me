import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_ASSETS,
  AVATARS,
  DEFAULT_AVATAR,
  isAvatar,
} from '@/components/PostureScene/models';
import { MESSAGES } from '@/i18n/messages';

const publicPath = (url: string) =>
  path.resolve(__dirname, '../../public', url.replace(/^\//, ''));

describe('avatars', () => {
  it('既定のモデルは一覧に含まれる', () => {
    expect(isAvatar(DEFAULT_AVATAR)).toBe(true);
    expect(isAvatar('dragon')).toBe(false);
    expect(isAvatar(undefined)).toBe(false);
  });

  it.each(AVATARS)('%s: モデル・サムネイル・表示名がある', (id) => {
    expect(existsSync(publicPath(AVATAR_ASSETS[id].url))).toBe(true);
    expect(existsSync(publicPath(`/avatars/${id}.webp`))).toBe(true);
    for (const m of Object.values(MESSAGES))
      expect(m[`avatar_${id}`]).toBeTruthy();
  });
});
