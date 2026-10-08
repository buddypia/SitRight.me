/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        s1: 'var(--surface-1)',
        s2: 'var(--surface-2)',
        s3: 'var(--surface-3)',
        line: 'var(--line)',
        'ink-1': 'var(--ink-1)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        good: 'var(--good)',
        fair: 'var(--fair)',
        poor: 'var(--poor)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        panel: '20px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-up': 'fade-up 420ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};
