import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      '.next/**',
      'out/**',
      'next-env.d.ts',
      'public/mediapipe/**',
      'playwright-report/**',
      'test-results/**',
      '.tmp/**',
      '.wrangler/**',
      'tmp/**',
    ],
  },
  {
    rules: {
      'prefer-const': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // テスト・検証・ビルド用スクリプトは結果をログに出す
    files: ['tests/**', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
