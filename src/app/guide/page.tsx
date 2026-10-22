import { Guide } from '@/components/Guide';
import { GuideJsonLd } from '../GuideJsonLd';
import { guideMetadata } from '../seo';

export const metadata = guideMetadata('en');

export default function Page() {
  return (
    <>
      <GuideJsonLd locale="en" />
      <Guide locale="en" />
    </>
  );
}
