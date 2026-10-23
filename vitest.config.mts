import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    fsModuleCache: true,
    isolate: false,
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.worktrees/**', '**/.tmp/**', '**/.cache/**', '**/out/**', '**/.next/**'],
    environment: 'node',
  },
});
