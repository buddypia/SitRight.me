import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

/** PWA としてインストールし、独立したウィンドウで常駐できるようにする */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SitRight',
    short_name: 'SitRight',
    description:
      'A webcam posture monitor that measures forward head posture, text neck, and slouching, and alerts you only when bad posture persists.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0d10',
    theme_color: '#0b0d10',
    lang: 'en',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
