/**
 * 3D シーンで表示できるモデルの一覧。
 *
 * モデルを追加するときは
 * 1. ここに id と頭の大きさを足す
 * 2. shader.ts の headShape / bodyAlbedo などに `#if defined(MODEL_<ID>)` の分岐を足す
 * 3. i18n の avatar_<id> と public/avatars/<id>.webp（サムネイル）を足す
 * 選んだモデルの分岐だけをコンパイルするので、モデルを増やしても描画の重さは変わらない。
 */
export const AVATARS = [
  'buddy',
  'cat',
  'bear',
  'wood',
  'clay',
  'mannequin',
] as const;

export type Avatar = (typeof AVATARS)[number];

export const DEFAULT_AVATAR: Avatar = 'buddy';

/** 頭の大きさ（人体比）。シェーダーとオーバーレイの耳の位置で共有する */
export const HEAD_SCALE: Record<Avatar, number> = {
  buddy: 1.2,
  cat: 1.12,
  bear: 1.15,
  wood: 1,
  clay: 1,
  mannequin: 1,
};

export function isAvatar(v: unknown): v is Avatar {
  return typeof v === 'string' && (AVATARS as readonly string[]).includes(v);
}

/** シェーダーへ渡す define */
export function avatarDefines(avatar: Avatar): string[] {
  return [
    `MODEL_${avatar.toUpperCase()}`,
    `HEAD_SCALE ${HEAD_SCALE[avatar].toFixed(3)}`,
  ];
}
