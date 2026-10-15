'use client';

import { useRef } from 'react';

export function getNextSegmentIndex(
  key: string,
  currentIndex: number,
  length: number
): number {
  if (length <= 0) return -1;
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return (currentIndex + 1) % length;
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return (currentIndex - 1 + length) % length;
  }
  return -1;
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    const nextIndex = getNextSegmentIndex(e.key, currentIndex, options.length);
    if (nextIndex >= 0) {
      e.preventDefault();
      const nextOpt = options[nextIndex];
      onChange(nextOpt.value);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  const hasActive = options.some((o) => o.value === value);

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-2xl border border-line bg-s2 p-1"
    >
      {options.map((o, idx) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active || (!hasActive && idx === 0) ? 0 : -1}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onClick={() => onChange(o.value)}
            className={`h-7 cursor-pointer rounded-xl px-3 text-xs transition ${
              active
                ? 'bg-s3 text-ink-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]'
                : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
