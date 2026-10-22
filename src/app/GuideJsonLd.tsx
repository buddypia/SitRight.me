import type { Locale } from '@/i18n/messages';
import { guideJsonLd } from './seo';

export function GuideJsonLd({ locale }: { locale: Locale }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd(locale)) }}
    />
  );
}
