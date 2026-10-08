import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SitSmart',
  description:
    'Webカメラだけでストレートネック・スマホ首・猫背を計測し、横からの姿勢を3Dで可視化。悪い姿勢が続いたときだけ知らせる姿勢モニター。',
  icons: { icon: '/icon.svg' },
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
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
