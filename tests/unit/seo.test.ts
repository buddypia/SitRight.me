import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES, MESSAGES, guidePath } from '@/i18n/messages';
import { GUIDE, Guide } from '@/components/Guide';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import * as seo from '@/app/seo';
import { Home } from '@/app/Home';
import { setTitleState } from '@/engine/notifier';
import { useAppStore } from '@/stores/appStore';

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

function readPngDimensions(filePath: string): { width: number; height: number } {
  const buf = readFileSync(filePath);
  // PNG signature (8 bytes) + IHDR length (4 bytes) + 'IHDR' (4 bytes)
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

describe('SEO & OGP metadata, images, and static content', () => {
  it('provides localized OpenGraph and Twitter card images (1200x630 PNG) for en, ja, and ko', () => {
    const seenUrls = new Set<string>();
    const seenAlts = new Set<string>();

    for (const locale of SUPPORTED_LOCALES) {
      const meta = seo.pageMetadata(locale);
      expect(meta.title).toBeTruthy();
      expect(meta.description).toBeTruthy();

      const ogImages = Array.isArray(meta.openGraph?.images)
        ? meta.openGraph.images
        : meta.openGraph?.images
          ? [meta.openGraph.images]
          : [];
      expect(ogImages.length).toBeGreaterThan(0);

      const firstOg = ogImages[0] as {
        url: string;
        width?: number;
        height?: number;
        alt?: string;
        type?: string;
      };
      expect(firstOg.width).toBe(1200);
      expect(firstOg.height).toBe(630);
      expect(firstOg.type).toBe('image/png');
      expect(firstOg.alt).toBeTruthy();

      seenUrls.add(firstOg.url);
      seenAlts.add(firstOg.alt ?? '');

      const publicFile = path.resolve(
        process.cwd(),
        'public',
        firstOg.url.replace(/^\//, '')
      );
      expect(existsSync(publicFile)).toBe(true);
      expect(readPngDimensions(publicFile)).toEqual({ width: 1200, height: 630 });

      const twitterImages = Array.isArray(meta.twitter?.images)
        ? meta.twitter.images
        : meta.twitter?.images
          ? [meta.twitter.images]
          : [];
      expect(twitterImages.length).toBeGreaterThan(0);
    }

    // en, ja, ko each have their own localized OG image and alt text
    expect(seenUrls.size).toBe(SUPPORTED_LOCALES.length);
    expect(seenAlts.size).toBe(SUPPORTED_LOCALES.length);
  });

  it('generates localized WebApplication JSON-LD with its publisher and help page', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const ld = seo.pageJsonLd(locale);
      expect(ld['@context']).toBe('https://schema.org');
      const graph = ld['@graph'] as Record<string, unknown>[];
      const byType = (type: string) => graph.find((n) => n['@type'] === type);

      const app = byType('WebApplication')!;
      expect(app.name).toBe(seo.pageTitle(locale));
      expect(app.description).toBeTruthy();
      expect(app.inLanguage).toBe(locale);
      expect(String(app.image)).toContain(seo.siteUrl);
      expect(app.isAccessibleForFree).toBe(true);
      expect((app.softwareHelp as { url: string }).url).toBe(
        seo.siteUrl + guidePath(locale)
      );
      // 実在しない評価を載せない（構造化データのスパム扱いを避ける）
      expect(app).not.toHaveProperty('aggregateRating');

      const org = byType('Organization')!;
      expect((app.publisher as { '@id': string })['@id']).toBe(org['@id']);
      expect(byType('WebSite')).toBeTruthy();
    }
  });

  it('describes each guide page with hreflang alternates, an Article with citations, and an FAQ that matches the visible text', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const meta = seo.guideMetadata(locale);
      expect(meta.title).toBe(GUIDE[locale].title);
      expect(meta.alternates?.canonical).toBe(guidePath(locale));
      expect(meta.alternates?.languages).toMatchObject({
        en: '/guide',
        ja: '/ja/guide',
        ko: '/ko/guide',
        'x-default': '/guide',
      });

      const graph = seo.guideJsonLd(locale)['@graph'] as Record<string, unknown>[];
      const article = graph.find((n) => n['@type'] === 'Article')!;
      const citations = article.citation as { url: string }[];
      expect(citations.length).toBeGreaterThanOrEqual(5);
      for (const c of citations) expect(c.url).toMatch(/^https:\/\//);

      const html = renderToStaticMarkup(createElement(Guide, { locale }));
      const faq = graph.find((n) => n['@type'] === 'FAQPage')!;
      for (const q of faq.mainEntity as {
        name: string;
        acceptedAnswer: { text: string };
      }[]) {
        expect(html).toContain(escapeHtml(q.name));
        expect(html).toContain(escapeHtml(q.acceptedAnswer.text));
      }
      for (const c of citations) expect(html).toContain(c.url);
      expect(html).toContain(escapeHtml(GUIDE[locale].summary));
      for (const section of GUIDE[locale].sections) {
        if (section.quote) expect(html).toContain(escapeHtml(section.quote.text));
      }
      expect(existsSync(path.resolve(process.cwd(), 'public/guide/posture-side-view.webp'))).toBe(true);
    }
  });

  it('lists home and guide pages for every locale in the sitemap', () => {
    const urls = sitemap().map((e) => e.url);
    for (const locale of SUPPORTED_LOCALES) {
      expect(urls).toContain(seo.siteUrl + guidePath(locale));
    }
    expect(urls).toHaveLength(SUPPORTED_LOCALES.length * 2);
  });

  it('blocks AI training crawlers but keeps search and answer crawlers allowed', () => {
    const rules = [robots().rules].flat();
    const agentsOf = (r: (typeof rules)[number]) => [r.userAgent ?? []].flat();
    const blocked = rules.find((r) => agentsOf(r).includes('GPTBot'));
    expect(blocked?.disallow).toBe('/');
    for (const bot of ['ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'Meta-ExternalAgent', 'CCBot']) {
      expect(agentsOf(blocked!)).toContain(bot);
    }
    for (const bot of ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Applebot']) {
      expect(rules.some((r) => agentsOf(r).includes(bot))).toBe(false);
    }
    expect(rules.find((r) => agentsOf(r).includes('*'))).toMatchObject({ allow: '/', disallow: '/lab' });
  });

  it('pre-renders localized semantic HTML content and JSON-LD in Home for crawlers', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const html = renderToStaticMarkup(createElement(Home, { locale }));
      const t = MESSAGES[locale];
      expect(html).toContain(t.welcomeTitle.split('\n')[0]);
      expect(html).toContain(t.welcomeBody);
      expect(html).toContain(t.featureMeasure);
      expect(html).toContain(t.privacyTitle);
      expect(html).toContain('application/ld+json');
      expect(html).toContain('href="/ja"');
      expect(html).toContain('href="/ko"');
      expect(html).toContain(`href="${guidePath(locale)}"`);
    }
  });

  it('restores the localized SEO title instead of bare "SitRight" when setTitleState(null) is called', () => {
    const prevDoc = globalThis.document;
    const fakeDoc = { title: '' } as Document;
    globalThis.document = fakeDoc;
    try {
      for (const locale of SUPPORTED_LOCALES) {
        useAppStore.getState().updateSettings({ locale });
        setTitleState(null);
        expect(fakeDoc.title).toBe(seo.pageTitle(locale));
      }
    } finally {
      globalThis.document = prevDoc;
    }
  });
});
