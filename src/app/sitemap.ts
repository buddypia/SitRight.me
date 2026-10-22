import type { MetadataRoute } from 'next';
import { GUIDE_UPDATED } from '@/components/Guide';
import {
  SUPPORTED_LOCALES,
  guidePath,
  localePath,
  type Locale,
} from '@/i18n/messages';
import { siteUrl } from './seo';

export const dynamic = 'force-static';

/** 言語ごとのページを hreflang の代替 URL 付きで並べる */
const entries = (
  pathOf: (locale: Locale) => string,
  extra: Partial<MetadataRoute.Sitemap[number]> = {}
): MetadataRoute.Sitemap => {
  const languages = Object.fromEntries(
    SUPPORTED_LOCALES.map((l) => [l, siteUrl + pathOf(l)])
  );
  return SUPPORTED_LOCALES.map((l) => ({
    url: siteUrl + pathOf(l),
    alternates: { languages },
    ...extra,
  }));
};

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...entries(localePath),
    ...entries(guidePath, {
      lastModified: GUIDE_UPDATED,
      images: [`${siteUrl}/guide/posture-side-view.webp`],
    }),
  ];
}
