'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  GENDER_OF,
  MALE_AVATARS,
  FEMALE_AVATARS,
  type Avatar,
  type Gender,
} from '@/components/PostureScene/models';
import { Segmented } from '@/components/ui';
import type { Messages } from '@/i18n/messages';

/** 3D モデルの選択。男女タブで切り替え。サムネイルは public/avatars/<id>.webp */
export function AvatarPicker({
  value,
  onChange,
  t,
}: {
  value: Avatar;
  onChange: (v: Avatar) => void;
  t: Messages;
}) {
  const [selectedGender, setSelectedGender] = useState<Gender>(
    () => GENDER_OF[value] ?? 'male'
  );
  const [prevValue, setPrevValue] = useState<Avatar>(value);

  // 外部からのモデル変更（リセット等）時に表示タブを自動追従（React 19推奨: render 中の状態調整）
  if (value !== prevValue) {
    setPrevValue(value);
    const current = GENDER_OF[value];
    if (current && current !== selectedGender) {
      setSelectedGender(current);
    }
  }

  const displayedAvatars =
    selectedGender === 'male' ? MALE_AVATARS : FEMALE_AVATARS;

  return (
    <div className="space-y-3">
      <Segmented<Gender>
        label={t.gender}
        value={selectedGender}
        onChange={(g) => setSelectedGender(g)}
        options={[
          { value: 'male', label: t.gender_male },
          { value: 'female', label: t.gender_female },
        ]}
      />

      <div
        role="radiogroup"
        aria-label={t.avatar}
        className="grid grid-cols-2 gap-2"
      >
        {displayedAvatars.map((id) => {
          const selected = id === value;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(id)}
              className={`group relative overflow-hidden rounded-xl border text-left transition ${
                selected
                  ? 'border-good/70 bg-good/10 shadow-[0_0_12px_rgba(77,234,196,0.15)] ring-1 ring-good/40'
                  : 'border-line bg-s2 hover:border-white/20'
              }`}
            >
              {/* 書き出し時に縮小・圧縮済みなので最適化は通さない */}
              <div className="relative aspect-square w-full bg-[#14171c]">
                <Image
                  src={`/avatars/${id}.webp`}
                  alt=""
                  width={160}
                  height={160}
                  unoptimized
                  className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {selected && (
                  <span
                    aria-hidden="true"
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-good text-[10px] font-bold text-bg shadow-sm"
                  >
                    ✓
                  </span>
                )}
              </div>
              <span
                className={`block truncate px-2.5 py-2 text-xs font-medium ${
                  selected ? 'text-good' : 'text-ink-2 group-hover:text-ink-1'
                }`}
              >
                {t[`avatar_${id}`]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
