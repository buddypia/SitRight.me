import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LICENSE_CATEGORIES,
  LICENSE_TEXTS,
  THIRD_PARTY_PACKAGES,
  getFullLicenseNotice,
} from '@/components/Licenses/licensesData';
import { MESSAGES, SUPPORTED_LOCALES } from '@/i18n/messages';

describe('Open Source Licenses & Third-Party Notices', () => {
  it('contains entries for all core dependencies and assets', () => {
    const ids = THIRD_PARTY_PACKAGES.map((p) => p.id);
    expect(ids).toContain('sitright');
    expect(ids).toContain('mediapipe');
    expect(ids).toContain('three');
    expect(ids).toContain('react');
    expect(ids).toContain('next');
    expect(ids).toContain('zustand');
    expect(ids).toContain('makehuman-assets');
    expect(ids).toContain('original-assets');
  });

  it('guarantees zero drift: all package.json dependencies are explicitly registered', () => {
    // Reads package.json to ensure any future dependency addition fails test if untracked
    const pkgPath = resolve(process.cwd(), 'package.json');
    const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const prodDeps: string[] = Object.keys(pkgJson.dependencies || {});

    expect(prodDeps.length).toBeGreaterThan(0);

    const trackedPackageNames = THIRD_PARTY_PACKAGES.map((p) =>
      p.name.toLowerCase()
    );

    for (const dep of prodDeps) {
      // normalize name (e.g., @mediapipe/tasks-vision, react, react-dom)
      const isTracked = trackedPackageNames.some(
        (name) => name.includes(dep.toLowerCase()) || dep.toLowerCase().includes(name)
      );

      expect(
        isTracked,
        `Production dependency "${dep}" is in package.json but not declared in THIRD_PARTY_PACKAGES. Please add its license notice to src/components/Licenses/licensesData.ts`
      ).toBe(true);
    }
  });

  it('ensures each license entry has valid and non-empty attributes', () => {
    for (const pkg of THIRD_PARTY_PACKAGES) {
      expect(pkg.id).toBeTruthy();
      expect(pkg.name).toBeTruthy();
      expect(pkg.copyright).toBeTruthy();
      expect(pkg.description).toBeTruthy();
      expect(LICENSE_CATEGORIES).toContain(pkg.category);
      expect(['MIT', 'Apache-2.0', 'CC0-1.0']).toContain(pkg.license);
      expect(LICENSE_TEXTS[pkg.license]).toBeTruthy();
      expect(LICENSE_TEXTS[pkg.license].length).toBeGreaterThan(100);

      // Verify formatted notice contains name, copyright and license body
      const fullNotice = getFullLicenseNotice(pkg);
      expect(fullNotice).toContain(pkg.name);
      expect(fullNotice).toContain(pkg.copyright);
      expect(fullNotice).toContain(LICENSE_TEXTS[pkg.license]);
    }
  });

  it('verifies MediaPipe attribution complies with Apache 2.0 and redistribution notice', () => {
    const mediapipe = THIRD_PARTY_PACKAGES.find((p) => p.id === 'mediapipe');
    expect(mediapipe).toBeDefined();
    expect(mediapipe?.license).toBe('Apache-2.0');
    expect(mediapipe?.copyright).toContain('Google LLC');
    expect(mediapipe?.description).toContain('Distributed unmodified');
  });

  it('verifies MakeHuman 3D assets comply with CC0 1.0 dedication', () => {
    const makehuman = THIRD_PARTY_PACKAGES.find(
      (p) => p.id === 'makehuman-assets'
    );
    expect(makehuman).toBeDefined();
    expect(makehuman?.license).toBe('CC0-1.0');
  });

  it('verifies all supported locales define all required license i18n keys', () => {
    const requiredKeys = [
      'licensesNoticeButton',
      'licensesModalTitle',
      'licensesIntro',
      'licensesSourceLink',
      'licenseViewText',
      'licenseHideText',
      'licenseCopyButton',
      'licenseCopied',
      'licenseCategory_core',
      'licenseCategory_framework',
      'licenseCategory_assets',
    ] as const;

    for (const locale of SUPPORTED_LOCALES) {
      const msgs = MESSAGES[locale] as unknown as Record<string, string>;
      for (const key of requiredKeys) {
        expect(msgs[key]).toBeDefined();
        expect(typeof msgs[key]).toBe('string');
        expect(msgs[key].length).toBeGreaterThan(0);
      }
    }
  });

  it('verifies consistency with repo root THIRD_PARTY_NOTICES', () => {
    const noticePath = resolve(process.cwd(), 'THIRD_PARTY_NOTICES');
    const noticeContent = readFileSync(noticePath, 'utf8');

    // Root file mentions Google LLC and Apache License
    expect(noticeContent).toContain('Google LLC');
    expect(noticeContent).toContain('Apache License');
    expect(noticeContent).toContain('MakeHuman');
    expect(noticeContent).toContain('CC0 1.0');

    // Both datasets track same core entities
    expect(THIRD_PARTY_PACKAGES.some((p) => p.copyright.includes('Google LLC'))).toBe(true);
    expect(THIRD_PARTY_PACKAGES.some((p) => p.copyright.includes('MakeHuman'))).toBe(true);
  });
});
