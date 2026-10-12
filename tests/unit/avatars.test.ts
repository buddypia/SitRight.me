import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AVATAR_ASSETS,
  AVATARS,
  DEFAULT_AVATAR,
  FEMALE_AVATARS,
  GENDER_OF,
  MALE_AVATARS,
  isAvatar,
} from '@/components/PostureScene/models';
import { MESSAGES } from '@/i18n/messages';

const publicPath = (url: string) =>
  path.resolve(__dirname, '../../public', url.replace(/^\//, ''));

describe('avatars', () => {
  it('既定のモデルは一覧に含まれる', () => {
    expect(DEFAULT_AVATAR).toBe('man');
    expect(isAvatar(DEFAULT_AVATAR)).toBe(true);
    expect(isAvatar('hamu')).toBe(false);
    expect(isAvatar('dino')).toBe(false);
    expect(isAvatar('dragon')).toBe(false);
    expect(isAvatar(undefined)).toBe(false);
  });

  it.each(AVATARS)('%s: モデル・サムネイル・表示名がある', (id) => {
    expect(existsSync(publicPath(AVATAR_ASSETS[id].url))).toBe(true);
    expect(existsSync(publicPath(`/avatars/${id}.webp`))).toBe(true);
    for (const m of Object.values(MESSAGES))
      expect(m[`avatar_${id}`]).toBeTruthy();
  });

  it('男女のカテゴリ分類が網羅的かつ重複なく定義されている', () => {
    expect(MALE_AVATARS.length).toBe(4);
    expect(FEMALE_AVATARS.length).toBe(4);
    expect([...MALE_AVATARS, ...FEMALE_AVATARS].sort()).toEqual(
      [...AVATARS].sort()
    );

    for (const id of MALE_AVATARS) {
      expect(GENDER_OF[id]).toBe('male');
    }
    for (const id of FEMALE_AVATARS) {
      expect(GENDER_OF[id]).toBe('female');
    }
  });
});
