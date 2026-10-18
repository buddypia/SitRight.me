import { Home } from '../Home';
import { pageMetadata } from '../seo';

export const metadata = pageMetadata('ja');

export default function Page() {
  return <Home locale="ja" />;
}
