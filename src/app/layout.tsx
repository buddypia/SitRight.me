import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SitRight',
  description:
    'A posture monitor that uses only your webcam to measure forward head posture, text neck, and slouching, shows your side view in 3D, and alerts you only when bad posture persists. Runs entirely in your browser.',
  icons: { icon: '/icon.svg', apple: '/icon-192x192.png' },
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
