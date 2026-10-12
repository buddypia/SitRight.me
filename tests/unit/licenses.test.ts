import { describe, expect, it } from 'vitest';
import {
  LICENSE_TEXTS,
  THIRD_PARTY_PACKAGES,
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

  it('ensures each license entry has valid and non-empty attributes', () => {
    for (const pkg of THIRD_PARTY_PACKAGES) {
      expect(pkg.id).toBeTruthy();
      expect(pkg.name).toBeTruthy();
      expect(pkg.copyright).toBeTruthy();
      expect(pkg.description).toBeTruthy();
      expect(['MIT', 'Apache-2.0', 'CC0-1.0']).toContain(pkg.license);
      expect(LICENSE_TEXTS[pkg.license]).toBeTruthy();
      expect(LICENSE_TEXTS[pkg.license].length).toBeGreaterThan(100);
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

  it('verifies all supported locales define license i18n keys', () => {
    const requiredKeys = [
      'licensesNoticeButton',
      'licensesModalTitle',
      'licensesIntro',
      'licensesSourceLink',
      'licenseViewText',
      'licenseHideText',
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
});
