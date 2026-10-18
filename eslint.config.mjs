import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { SCENE_BACKDROP_MESSAGE, SCENE_BACKDROP_SELECTORS } from './scripts/lib/scene-backdrop.mjs';

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
      '.claude/**',
      '.cli/**',
      '.codex/**',
      'data/**',
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
    // 全面を覆う要素の backdrop-filter は 3D シーンの上で推論ループを止める（#42）。検出規則は PostToolUse hook と共有する
    files: ['src/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...SCENE_BACKDROP_SELECTORS.map((selector) => ({ selector, message: SCENE_BACKDROP_MESSAGE })),
      ],
    },
  },
  {
    // テスト・検証・ビルド用スクリプトは結果をログに出す
    files: ['tests/**', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },
];

export default config;
