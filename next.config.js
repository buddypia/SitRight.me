// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // サーバーを持たず、静的ファイルだけで配信する（映像はブラウザの外に出ない）
  output: 'export',
  outputFileTracingRoot: path.resolve(__dirname, __dirname.includes('.worktrees') ? '../../..' : '.'),
};

module.exports = nextConfig;
