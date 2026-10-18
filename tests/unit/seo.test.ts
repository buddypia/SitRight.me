import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { SUPPORTED_LOCALES, MESSAGES } from '@/i18n/messages';
import * as seo from '@/app/seo';
import { Home } from '@/app/Home';
import { setTitleState } from '@/engine/notifier';
import { useAppStore } from '@/stores/appStore';

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

  it('generates localized WebApplication JSON-LD structured data for Google Search', () => {
    const pageJsonLd = (seo as Record<string, unknown>).pageJsonLd as
      | ((locale: (typeof SUPPORTED_LOCALES)[number]) => Record<string, unknown>)
      | undefined;
    expect(typeof pageJsonLd).toBe('function');

    for (const locale of SUPPORTED_LOCALES) {
      const ld = pageJsonLd!(locale);
      expect(ld['@context']).toBe('https://schema.org');
      expect(ld['@type']).toBe('WebApplication');
      expect(ld.name).toBe(seo.pageTitle(locale));
      expect(ld.description).toBeTruthy();
      expect(ld.inLanguage).toBe(locale);
      expect(String(ld.image)).toContain(seo.siteUrl);
    }
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
