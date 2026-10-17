import type { Metadata } from 'next';
import {
  LOCALE_REGISTRY,
  SUPPORTED_LOCALES,
  localePath,
  type Locale,
} from '@/i18n/messages';

// 公開中の URL。独自ドメインに移るときはここを変える（OG 画像や canonical の URL になる）
export const siteUrl = 'https://sitright.pages.dev';

const COPY: Record<Locale, { title: string; description: string }> = {
  en: {
    title: 'SitRight - Smart Webcam Posture Monitor',
    description:
      'A posture monitor that uses only your webcam to measure forward head posture, text neck, and slouching, shows your side view in 3D, and alerts you only when bad posture persists. 100% in-browser privacy.',
  },
  ja: {
    title: 'SitRight - Webカメラで姿勢チェック（ストレートネック・猫背）',
    description:
      'ノートPCのカメラだけで、頭の前への突き出し・うつむき・背中の丸まりを計測。横からの姿勢を3Dで映し、悪い姿勢が続いたときだけ知らせます。映像はブラウザの外に出ません。',
  },
  ko: {
    title: 'SitRight - 웹캠으로 자세 체크 (일자목·굽은 등)',
    description:
      '노트북 카메라만으로 머리가 앞으로 나온 정도, 고개 숙임, 등이 굽은 정도를 측정해요. 옆모습 자세를 3D로 보여 주고, 나쁜 자세가 이어질 때만 알려 드려요. 영상은 브라우저 밖으로 나가지 않아요.',
  },
};

// 1200x630。public/og-image.png
const ogImage = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'SitRight - Webcam posture monitor with a 3D side view',
};

/** 言語ごとのページの title・description・canonical・hreflang・OG */
export function pageMetadata(locale: Locale): Metadata {
  const { title, description } = COPY[locale];
  const url = localePath(locale);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, localePath(l)])),
        'x-default': '/',
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'SitRight',
      locale: LOCALE_REGISTRY[locale].bcp47.replace('-', '_'),
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale).map((l) =>
        LOCALE_REGISTRY[l].bcp47.replace('-', '_')
      ),
      type: 'website',
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage.url],
    },
  };
}
