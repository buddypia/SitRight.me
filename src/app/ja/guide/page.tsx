import { Guide } from '@/components/Guide';
import { GuideJsonLd } from '../../GuideJsonLd';
import { guideMetadata } from '../../seo';

export const metadata = guideMetadata('ja');

export default function Page() {
  return (
    <>
      <GuideJsonLd locale="ja" />
      <Guide locale="ja" />
    </>
  );
}
