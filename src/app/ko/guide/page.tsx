import { Guide } from '@/components/Guide';
import { GuideJsonLd } from '../../GuideJsonLd';
import { guideMetadata } from '../../seo';

export const metadata = guideMetadata('ko');

export default function Page() {
  return (
    <>
      <GuideJsonLd locale="ko" />
      <Guide locale="ko" />
    </>
  );
}
