import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AVATARS,
  DEFAULT_AVATAR,
  avatarDefines,
  isAvatar,
} from '@/components/PostureScene/models';
import { FRAGMENT_SHADER } from '@/components/PostureScene/shader';

describe('avatars', () => {
  it('既定のモデルは一覧に含まれる', () => {
    expect(isAvatar(DEFAULT_AVATAR)).toBe(true);
    expect(isAvatar('dragon')).toBe(false);
    expect(isAvatar(undefined)).toBe(false);
  });

  it.each(AVATARS)('%s: サムネイルとシェーダーの分岐がある', (id) => {
    expect(
      existsSync(path.resolve(__dirname, `../../public/avatars/${id}.webp`))
    ).toBe(true);
    // 人体マネキンは #else の既定分岐で描く
    if (id !== 'mannequin')
      expect(FRAGMENT_SHADER).toContain(`defined(MODEL_${id.toUpperCase()})`);
  });

  it('define は MODEL_<ID> と頭の大きさを渡す', () => {
    expect(avatarDefines('cat')).toEqual(['MODEL_CAT', 'HEAD_SCALE 1.120']);
  });
});
