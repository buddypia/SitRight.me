import type { Metadata } from 'next';
import {
  LOCALE_REGISTRY,
  MESSAGES,
  SUPPORTED_LOCALES,
  localePath,
  type Locale,
} from '@/i18n/messages';

// 公開中の URL。独自ドメインに移るときはここを変える（OG 画像や canonical の URL になる）
export const siteUrl = 'https://sitright.pages.dev';

interface SeoLocaleEntry {
  title: string;
  description: string;
  ogImage: string;
  ogAlt: string;
  keywords: string[];
}

export const COPY: Record<Locale, SeoLocaleEntry> = {
  en: {
    title: 'SitRight - Smart Webcam Posture Monitor',
    description:
      'A posture monitor that uses only your webcam to measure forward head posture, text neck, and slouching, shows your side view in 3D, and alerts you only when bad posture persists. 100% in-browser privacy.',
    ogImage: '/og-image.png',
    ogAlt: 'SitRight - Webcam posture monitor with a 3D side view',
    keywords: [
      'posture monitor',
      'webcam posture check',
      'forward head posture',
      'text neck',
      'slouching alert',
      'ergonomics',
    ],
  },
  ja: {
    title: 'SitRight - Webカメラで姿勢チェック（ストレートネック・猫背）',
    description:
      'ノートPCのカメラだけで、頭の前への突き出し・うつむき・背中の丸まりを計測。横からの姿勢を3Dで映し、悪い姿勢が続いたときだけ知らせます。映像はブラウザの外に出ません。',
    ogImage: '/og-image-ja.png',
    ogAlt: 'SitRight - Webカメラで姿勢チェック（横からの3D姿勢表示）',
    keywords: [
      '姿勢チェック',
      'Webカメラ 姿勢',
      'ストレートネック',
      'スマホ首',
      '猫背 対策',
      'デスクワーク 姿勢',
    ],
  },
  ko: {
    title: 'SitRight - 웹캠으로 자세 체크 (거북목·일자목·굽은 등)',
    description:
      '노트북 카메라만으로 고개가 앞으로 나온 정도, 숙인 각도, 등이 굽은 정도를 측정해요. 옆에서 본 자세를 3D로 보여 주고, 나쁜 자세가 계속될 때만 알려 드려요. 영상은 기기 밖으로 나가지 않아요.',
    ogImage: '/og-image-ko.png',
    ogAlt: 'SitRight - 웹캠으로 자세 체크 (옆에서 본 3D 자세 표시)',
    keywords: [
      '자세 체크',
      '웹캠 자세 측정',
      '거북목',
      '일자목',
      '굽은 등',
      '바른 자세 알림',
    ],
  },
};

export function pageTitle(locale: Locale): string {
  return COPY[locale].title;
}

/** 言語ごとのページの title・description・canonical・hreflang・OG・Twitter Card */
export function pageMetadata(locale: Locale): Metadata {
  const { title, description, ogImage, ogAlt, keywords } = COPY[locale];
  const url = localePath(locale);
  const imageDescriptor = {
    url: ogImage,
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: ogAlt,
  };

  return {
    title,
    description,
    applicationName: 'SitRight',
    category: 'health',
    keywords,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
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
      images: [imageDescriptor],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageDescriptor],
    },
  };
}

/** Google 検索などのクローラー向け構造化データ（JSON-LD） */
export function pageJsonLd(locale: Locale): Record<string, unknown> {
  const { title, description, ogImage } = COPY[locale];
  const t = MESSAGES[locale];
  const path = localePath(locale);
  const canonicalUrl = path === '/' ? siteUrl : `${siteUrl}${path}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    alternateName: 'SitRight',
    url: canonicalUrl,
    image: `${siteUrl}${ogImage}`,
    description,
    inLanguage: locale,
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires a modern browser with webcam and WebGL support',
    featureList: [t.featureMeasure, t.featureSide, t.featureQuiet],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

/** クライアント側で言語を切り替えたとき、head 内のメタ情報も現在の言語に揃える */
export function syncDocumentSeo(locale: Locale): void {
  if (typeof document === 'undefined') return;
  const { title, description, ogImage, ogAlt } = COPY[locale];
  const path = localePath(locale);
  const canonicalUrl = path === '/' ? siteUrl : `${siteUrl}${path}`;
  const imageUrl = `${siteUrl}${ogImage}`;
  const ogLocale = LOCALE_REGISTRY[locale].bcp47.replace('-', '_');

  // 計測中のステータス接頭辞（例: "⚠ ... · SitRight"）が付いていないときだけタイトルを更新する
  if (!document.title.includes(' · SitRight')) {
    document.title = title;
  }

  const setMeta = (selector: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(selector);
    if (el) el.setAttribute('content', content);
  };

  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', canonicalUrl);
  setMeta('meta[property="og:locale"]', ogLocale);
  setMeta('meta[property="og:image"]', imageUrl);
  setMeta('meta[property="og:image:alt"]', ogAlt);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  setMeta('meta[name="twitter:image"]', imageUrl);
  setMeta('meta[name="twitter:image:alt"]', ogAlt);

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', canonicalUrl);
}
