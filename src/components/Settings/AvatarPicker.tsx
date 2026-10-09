import Image from 'next/image';
import { AVATARS, type Avatar } from '@/components/PostureScene/models';
import type { Messages } from '@/i18n/messages';

/** 3D モデルの選択。サムネイルは public/avatars/<id>.webp */
export function AvatarPicker({
  value,
  onChange,
  t,
}: {
  value: Avatar;
  onChange: (v: Avatar) => void;
  t: Messages;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={t.avatar}
      className="grid grid-cols-3 gap-2"
    >
      {AVATARS.map((id) => {
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={`group overflow-hidden rounded-xl border text-left transition ${selected ? 'border-good/70 bg-good/10' : 'border-line bg-s2 hover:border-white/20'}`}
          >
            {/* 書き出し時に縮小・圧縮済みなので最適化は通さない */}
            <Image
              src={`/avatars/${id}.webp`}
              alt=""
              width={160}
              height={160}
              unoptimized
              className="aspect-square w-full bg-[#14171c] object-cover"
            />
            <span
              className={`block px-2 py-1.5 text-xs ${selected ? 'text-ink-1' : 'text-ink-3 group-hover:text-ink-1'}`}
            >
              {t[`avatar_${id}`]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
