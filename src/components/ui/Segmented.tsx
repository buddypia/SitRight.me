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
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-s2 p-1"
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`h-7 rounded-full px-3 text-xs transition ${o.value === value ? 'bg-s3 text-ink-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]' : 'text-ink-3 hover:text-ink-1'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
