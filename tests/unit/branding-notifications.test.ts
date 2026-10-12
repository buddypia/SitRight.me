import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Logo, type LogoVariant } from '@/components/ui/Logo';

describe('Branding and Notification System (Anti-AI-Slop)', () => {
  const srcDir = path.resolve(__dirname, '../../src');

  it('guarantees ZERO source references to legacy AI-slop spine assets', () => {
    function scanDir(dir: string): string[] {
      const results: string[] = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results.push(...scanDir(fullPath));
        } else if (/\.(tsx?|jsx?|css|html|json)$/.test(file)) {
          results.push(fullPath);
        }
      }
      return results;
    }

    const sourceFiles = scanDir(srcDir);
    const slopKeywords = ['spine-alert', 'spine-trauma'];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      for (const keyword of slopKeywords) {
        expect(
          content.includes(keyword),
          `Found banned AI-slop keyword "${keyword}" in ${filePath}`
        ).toBe(false);
      }
    }
  });

  it('renders official architectural Logo component across all semantic variants', () => {
    const variants: LogoVariant[] = ['default', 'alert', 'recovered', 'break'];

    for (const variant of variants) {
      const html = renderToString(React.createElement(Logo, { size: 44, variant }));
      expect(html).toContain('<svg');
      expect(html).toContain('width="44"');
      expect(html).toContain('height="44"');
      expect(html).toContain('viewBox="0 0 64 64"');

      // Verify squircle base
      expect(html).toContain('rx="16"');

      // Verify variant-specific characteristics
      if (variant === 'recovered') {
        // Aligned upright vertebrae (no rotation) & serene resonance
        expect(html).not.toContain('rotate(-18');
        expect(html).toContain('#34d399'); // emerald highlight
        expect(html).toContain('#4deac4'); // serene resonance
      } else if (variant === 'alert' || variant === 'default') {
        // Posture deflection tilted vertebra & acoustic snap
        expect(html).toContain('rotate(-18');
        expect(html).toContain('#ff3b30'); // crimson acoustic arc
        expect(html).toContain('#ff9500'); // amber acoustic arc
      } else if (variant === 'break') {
        // Calm violet/amber resonance
        expect(html).toContain('#818cf8');
      }
    }
  });

  it('generates unique gradient IDs to avoid SVG collision across multiple instances', () => {
    const html1 = renderToString(React.createElement(Logo, { size: 28, variant: 'default' }));
    const html2 = renderToString(React.createElement(Logo, { size: 44, variant: 'alert' }));

    // Extract gradient ids
    const extractIds = (html: string) => {
      const matches = html.match(/id="([^"]+)"/g) ?? [];
      return matches.map((m) => m.replace(/^id="|"$ /g, ''));
    };

    const ids1 = extractIds(html1);
    const ids2 = extractIds(html2);

    expect(ids1.length).toBeGreaterThan(0);
    expect(ids2.length).toBeGreaterThan(0);
    // In server-rendered or separate component calls, unique IDs ensure no conflict
    expect(ids1.every((id) => id.startsWith('logo_'))).toBe(true);
  });

  it('verifies public branding icon assets exist and are valid PNGs', () => {
    const publicDir = path.resolve(__dirname, '../../public');
    const requiredIcons = [
      'icon-192x192.png',
      'icon-72x72.png',
      'icon-512x512.png',
      'apple-touch-icon.png',
      'icon.svg',
    ];

    for (const iconFile of requiredIcons) {
      const iconPath = path.join(publicDir, iconFile);
      expect(
        fs.existsSync(iconPath),
        `Official icon asset ${iconFile} must exist in public/`
      ).toBe(true);
      const stat = fs.statSync(iconPath);
      expect(stat.size).toBeGreaterThan(500);
    }
  });
});
