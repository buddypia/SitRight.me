import type { Metadata } from 'next';
import {
  GUIDE,
  GUIDE_PUBLISHED,
  GUIDE_UPDATED,
  SOURCES,
} from '@/components/Guide/content';
import {
  DEFAULT_LOCALE,
  LOCALE_REGISTRY,
  MESSAGES,
  SUPPORTED_LOCALES,
  guidePath,
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

const absoluteUrl = (path: string) => (path === '/' ? siteUrl : `${siteUrl}${path}`);
const ogLocale = (locale: Locale) => LOCALE_REGISTRY[locale].bcp47.replace('-', '_');

const ORGANIZATION_ID = `${siteUrl}/#organization`;
const WEBSITE_ID = `${siteUrl}/#website`;
const APP_ID = `${siteUrl}/#app`;

interface MetadataInput {
  locale: Locale;
  title: string;
  description: string;
  keywords: string[];
  pathOf: (locale: Locale) => string;
  type: 'website' | 'article';
}

/** title・description・canonical・hreflang・OG・Twitter Card を言語ごとに組み立てる */
function buildMetadata({
  locale,
  title,
  description,
  keywords,
  pathOf,
  type,
}: MetadataInput): Metadata {
  const { ogImage, ogAlt } = COPY[locale];
  const url = pathOf(locale);
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
        'max-video-preview': -1,
      },
    },
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(SUPPORTED_LOCALES.map((l) => [l, pathOf(l)])),
        'x-default': pathOf(DEFAULT_LOCALE),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'SitRight',
      locale: ogLocale(locale),
      alternateLocale: SUPPORTED_LOCALES.filter((l) => l !== locale).map(ogLocale),
      type,
      images: [imageDescriptor],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: ogImage, alt: ogAlt }],
    },
  };
}

/** 言語ごとのトップページ（/・/ja・/ko）のメタ情報 */
export function pageMetadata(locale: Locale): Metadata {
  const { title, description, keywords } = COPY[locale];
  return buildMetadata({
    locale,
    title,
    description,
    keywords,
    pathOf: localePath,
    type: 'website',
  });
}

/** 言語ごとの解説ページ（/guide・/ja/guide・/ko/guide）のメタ情報 */
export function guideMetadata(locale: Locale): Metadata {
  const { title, description } = GUIDE[locale];
  return buildMetadata({
    locale,
    title,
    description,
    keywords: COPY[locale].keywords,
    pathOf: guidePath,
    type: 'article',
  });
}

/** サイト運営者。検索エンジンや AI の回答エンジンが提供元を特定できるようにする */
const organizationLd = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'SitRight',
  url: siteUrl,
  logo: `${siteUrl}/icon-512x512.png`,
  email: 'contact@buddypia.com',
  sameAs: ['https://github.com/buddypia/SitRight.me'],
};

/** Google 検索などのクローラー向け構造化データ（JSON-LD） */
export function pageJsonLd(locale: Locale): Record<string, unknown> {
  const { title, description, ogImage } = COPY[locale];
  const t = MESSAGES[locale];
  const url = absoluteUrl(localePath(locale));

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationLd,
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: 'SitRight',
        url: siteUrl,
        inLanguage: SUPPORTED_LOCALES,
        publisher: { '@id': ORGANIZATION_ID },
      },
      {
        '@type': 'WebApplication',
        '@id': APP_ID,
        name: title,
        alternateName: 'SitRight',
        url,
        image: `${siteUrl}${ogImage}`,
        screenshot: `${siteUrl}${ogImage}`,
        description,
        inLanguage: locale,
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Windows, macOS, Linux, ChromeOS',
        browserRequirements:
          'Requires a modern browser with webcam and WebGL support',
        featureList: [t.featureMeasure, t.featureSide, t.featureQuiet],
        isAccessibleForFree: true,
        softwareHelp: {
          '@type': 'CreativeWork',
          url: absoluteUrl(guidePath(locale)),
        },
        publisher: { '@id': ORGANIZATION_ID },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };
}

/** 解説ページの構造化データ。本文・よくある質問・出典を表示中の内容と同じにする */
export function guideJsonLd(locale: Locale): Record<string, unknown> {
  const g = GUIDE[locale];
  const url = absoluteUrl(guidePath(locale));
  const sourceIds = [...new Set(g.sections.flatMap((s) => s.sources))];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationLd,
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: g.heading,
        description: g.description,
        inLanguage: locale,
        url,
        mainEntityOfPage: url,
        image: `${siteUrl}/guide/posture-side-view.webp`,
        datePublished: GUIDE_PUBLISHED,
        dateModified: GUIDE_UPDATED,
        author: { '@id': ORGANIZATION_ID },
        publisher: { '@id': ORGANIZATION_ID },
        about: {
          '@type': 'WebApplication',
          '@id': APP_ID,
          name: 'SitRight',
          url: siteUrl,
        },
        citation: sourceIds.map((id) => ({
          '@type': 'CreativeWork',
          name: SOURCES[id].name,
          url: SOURCES[id].url,
        })),
      },
      {
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        inLanguage: locale,
        mainEntity: g.faq.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: g.homeLabel,
            item: absoluteUrl(localePath(locale)),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: MESSAGES[locale].guideLink,
            item: url,
          },
        ],
      },
    ],
  };
}

/** クライアント側で言語を切り替えたとき、head 内のメタ情報も現在の言語に揃える */
export function syncDocumentSeo(locale: Locale): void {
  if (typeof document === 'undefined') return;
  const { title, description, ogImage, ogAlt } = COPY[locale];
  const canonicalUrl = absoluteUrl(localePath(locale));
  const imageUrl = `${siteUrl}${ogImage}`;

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
  setMeta('meta[property="og:locale"]', ogLocale(locale));
  setMeta('meta[property="og:image"]', imageUrl);
  setMeta('meta[property="og:image:alt"]', ogAlt);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  setMeta('meta[name="twitter:image"]', imageUrl);
  setMeta('meta[name="twitter:image:alt"]', ogAlt);

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', canonicalUrl);
}
