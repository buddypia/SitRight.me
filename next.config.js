/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const projectRoot = __dirname.includes('.worktrees')
  ? __dirname.split(`${path.sep}.worktrees`)[0]
  : __dirname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // サーバーを持たず、静的ファイルだけで配信する（映像はブラウザの外に出ない）
  output: 'export',
  turbopack: {
    root: projectRoot,
  },
};

module.exports = nextConfig;
