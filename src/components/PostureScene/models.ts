/**
 * 3D シーンで表示できるモデルの一覧。
 *
 * モデルを追加するときは
 * 1. public/avatars/<id>.glb（MakeHuman の game_engine リグか、VRM と同じ骨名のリグ）を置く
 * 2. ここに id と AVATAR_ASSETS の設定を足す
 * 3. i18n の avatar_<id> と public/avatars/<id>.webp（サムネイル）を足す
 * 出典とライセンスは THIRD_PARTY_NOTICES に記す。
 */
export const AVATARS = [
  'woman',
  'man',
  'senior',
  'womanSporty',
  'hamu',
  'dino',
] as const;

export type Avatar = (typeof AVATARS)[number];

export const DEFAULT_AVATAR: Avatar = 'woman';

export interface AvatarAsset {
  url: string;
  /** 実寸へのスケール（既定 1） */
  scale?: number;
  /** 向きの補正（ラジアン） */
  yaw?: number;
  /** 頭の骨から右耳（外耳孔）までのずれ（初期姿勢, m, x 前・y 上・z 右） */
  ear: [number, number, number];
  /** 股関節から座面までの高さ（m） */
  seatClear?: number;
  /** 髪・まつ毛など、透過の切り抜きで描くマテリアル名 */
  cutout?: RegExp;
  /** マテリアル名に一致するものの色を掛け合わせる（髪色など）。3 つ目は明るさの倍率（白髪など） */
  tint?: [RegExp, number, number?][];
  /** 半透明のまま描くマテリアル名 */
  blend?: RegExp;
  /** 小柄なキャラクター用に座面へ重ねるクッションの厚み（m） */
  booster?: number;
  /** 椅子を机へ寄せられる限度（机の手前の辺からの距離, m） */
  deskGap?: number;
}

export const AVATAR_ASSETS: Record<Avatar, AvatarAsset> = {
  woman: {
    url: '/avatars/woman.glb',
    ear: [0, 0.05, 0.075],
    cutout: /bob|short|long|ponytail|braid|afro|eyebrow|eyelash/i,
    tint: [[/ponytail|eyebrow|eyelash/i, 0x3a2a22]],
  },
  man: {
    url: '/avatars/man.glb',
    ear: [0, 0.05, 0.08],
    cutout: /bob|short|long|ponytail|braid|afro|eyebrow|eyelash/i,
    tint: [[/short|eyebrow|eyelash/i, 0x2a211c]],
  },
  senior: {
    url: '/avatars/senior.glb',
    ear: [0, 0.05, 0.08],
    cutout: /bob|short|long|ponytail|braid|afro|eyebrow|eyelash/i,
    tint: [
      [/short/i, 0xd6d3cf, 1.7],
      [/eyebrow|eyelash/i, 0x8a837c],
    ],
  },
  womanSporty: {
    url: '/avatars/womanSporty.glb',
    ear: [0, 0.05, 0.075],
    cutout: /bob|short|long|ponytail|braid|afro|eyebrow|eyelash/i,
    tint: [[/afro|eyebrow|eyelash/i, 0x231a15]],
  },
  hamu: {
    url: '/avatars/hamu.glb',
    ear: [0, 0.2, 0.15],
    seatClear: 0.05,
    booster: 0.16,
    deskGap: 0.1,
    blend: /blush/i,
  },
  dino: {
    url: '/avatars/dino.glb',
    ear: [0, 0.2, 0.15],
    seatClear: 0.05,
    booster: 0.16,
    deskGap: 0.1,
    blend: /blush/i,
  },
};

export function isAvatar(v: unknown): v is Avatar {
  return typeof v === 'string' && (AVATARS as readonly string[]).includes(v);
}
