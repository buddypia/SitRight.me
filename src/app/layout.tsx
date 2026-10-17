import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// ビルド時に取り込んで自サイトから配信する（実行時に Google へ通信しない）
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// 公開中の URL。独自ドメインに移るときはここを変える（OG 画像や canonical の URL になる）
const siteUrl = 'https://sitright.pages.dev';
const siteTitle = 'SitRight - Smart Webcam Posture Monitor';
const siteDescription =
  'A posture monitor that uses only your webcam to measure forward head posture, text neck, and slouching, shows your side view in 3D, and alerts you only when bad posture persists. 100% in-browser privacy.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  alternates: { canonical: '/' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: 'SitRight',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SitRight - Real-time Webcam Ergonomics and 3D Posture Monitor',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0d10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
