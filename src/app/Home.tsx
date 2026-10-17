'use client';

import dynamic from 'next/dynamic';

// カメラ・WebGL・localStorage に依存するため、アプリ本体はクライアントのみで描画する
export const Home = dynamic(
  () => import('@/components/App').then((m) => m.App),
  { ssr: false }
);
