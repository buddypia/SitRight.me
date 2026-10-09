import type { MetadataRoute } from 'next';

/** PWA としてインストールし、独立したウィンドウで常駐できるようにする */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SitSmart',
    short_name: 'SitSmart',
    description:
      'Webカメラだけでストレートネック・スマホ首・猫背を計測し、悪い姿勢が続いたときだけ知らせる姿勢モニター。',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0d10',
    theme_color: '#0b0d10',
    lang: 'ja',
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
