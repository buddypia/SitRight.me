import { Home } from './Home';
import { pageMetadata } from './seo';

export const metadata = pageMetadata('en');

export default function Page() {
  return <Home />;
}
