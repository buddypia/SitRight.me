import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LicensesModal } from '@/components/Licenses/LicensesModal';
import { PrivacyModal } from '@/components/Privacy/PrivacyModal';
import { SettingsSheet } from '@/components/Settings/SettingsSheet';
import { DEFAULT_LOCALE, MESSAGES, SUPPORTED_LOCALES, type Locale } from '@/i18n/messages';
import { useAppStore } from '@/stores/appStore';

function setTestLocale(locale: Locale) {
  useAppStore.getInitialState().settings.locale = locale;
  useAppStore.setState({
    settings: {
      ...useAppStore.getState().settings,
      locale,
    },
  });
}

describe('Modal & Sheet Close Button UI/UX Consistency', () => {
  afterEach(() => {
    setTestLocale(DEFAULT_LOCALE);
  });

  it('renders exactly one close button in PrivacyModal across all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      setTestLocale(locale);
      const closeLabel = MESSAGES[locale].close;
      const html = renderToString(
        React.createElement(PrivacyModal, {
          open: true,
          onClose: vi.fn(),
        })
      );

      const closeMatches = html.match(new RegExp(`>${closeLabel}</button>`, 'g')) ?? [];
      expect(closeMatches).toHaveLength(1);
      expect(html).not.toContain('<footer');
    }
  });

  it('renders exactly one close button in LicensesModal across all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      setTestLocale(locale);
      const closeLabel = MESSAGES[locale].close;
      const html = renderToString(
        React.createElement(LicensesModal, {
          open: true,
          onClose: vi.fn(),
        })
      );

      const closeMatches = html.match(new RegExp(`>${closeLabel}</button>`, 'g')) ?? [];
      expect(closeMatches).toHaveLength(1);
      expect(html).not.toContain('<footer');
    }
  });

  it('renders exactly one close button in SettingsSheet across all locales', () => {
    for (const locale of SUPPORTED_LOCALES) {
      setTestLocale(locale);
      const closeLabel = MESSAGES[locale].close;
      const html = renderToString(
        React.createElement(SettingsSheet, {
          open: true,
          onClose: vi.fn(),
        })
      );

      const closeMatches = html.match(new RegExp(`>${closeLabel}</button>`, 'g')) ?? [];
      expect(closeMatches).toHaveLength(1);
      expect(html).not.toContain('<footer');
    }
  });

  it('returns empty output when PrivacyModal or LicensesModal is closed', () => {
    const privacyHtml = renderToString(
      React.createElement(PrivacyModal, {
        open: false,
        onClose: vi.fn(),
      })
    );
    const licensesHtml = renderToString(
      React.createElement(LicensesModal, {
        open: false,
        onClose: vi.fn(),
      })
    );
    expect(privacyHtml).toBe('');
    expect(licensesHtml).toBe('');
  });
});
