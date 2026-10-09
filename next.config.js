/** @type {import('next').NextConfig} */
const nextConfig = {
  // サーバーを持たず、静的ファイルだけで配信する（映像はブラウザの外に出ない）
  output: 'export',
};

module.exports = nextConfig;
