import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-good text-[#06221b] hover:brightness-110 active:brightness-95 shadow-[0_0_0_1px_rgba(77,234,196,0.4),0_8px_24px_-8px_rgba(77,234,196,0.55)]',
  secondary: 'bg-s3 text-ink-1 hover:bg-[#262c35] border border-line',
  ghost: 'text-ink-2 hover:text-ink-1 hover:bg-white/5',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-[15px]',
  };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${sizes[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
