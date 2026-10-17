import type { MetadataRoute } from 'next';
import { SUPPORTED_LOCALES, localePath } from '@/i18n/messages';
import { siteUrl } from './seo';

export const dynamic = 'force-static';

const languages = Object.fromEntries(
  SUPPORTED_LOCALES.map((l) => [l, siteUrl + localePath(l)])
);

export default function sitemap(): MetadataRoute.Sitemap {
  return SUPPORTED_LOCALES.map((l) => ({
    url: siteUrl + localePath(l),
    alternates: { languages },
  }));
}
