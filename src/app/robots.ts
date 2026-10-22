import type { MetadataRoute } from 'next';
import { siteUrl } from './seo';

export const dynamic = 'force-static';

// 生成 AI の学習だけに使われるクローラー。検索・回答用（Googlebot・Bingbot・OAI-SearchBot・
// Claude-SearchBot・PerplexityBot など）は別の User-Agent なので `*` の規則で許可されたまま。
// 根拠は docs/SEO_AEO.md
const trainingCrawlers = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: '/lab' },
      { userAgent: trainingCrawlers, disallow: '/' },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
