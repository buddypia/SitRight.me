'use client';

import dynamic from 'next/dynamic';

// カメラ・WebGL・localStorage に依存するため、アプリ本体はクライアントのみで描画する
const App = dynamic(() => import('@/components/App').then((m) => m.App), {
  ssr: false,
});

export default function Home() {
  return <App />;
}
