/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // サーバーを持たず、静的ファイルだけで配信する（映像はブラウザの外に出ない）
  output: 'export',
  turbopack: {
    root: path.resolve(__dirname, __dirname.includes('.worktrees') ? '../../..' : '.'),
  },
};

module.exports = nextConfig;
