import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from '@/components/App/App';
import { Guide } from '@/components/Guide/Guide';
import { SettingsSheet } from '@/components/Settings/SettingsSheet';
import { GITHUB_REPO_URL } from '@/components/ui/GitHubLink';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/i18n/messages';
import { useAppStore } from '@/stores/appStore';

function setTestLocale(locale: Locale) {
  useAppStore.getInitialState().settings.locale = locale;
  useAppStore.setState({
    settings: { ...useAppStore.getState().settings, locale },
  });
}

describe('GitHub repository icon & link integration', () => {
  afterEach(() => {
    setTestLocale(DEFAULT_LOCALE);
    useAppStore.getInitialState().hydrated = false;
    useAppStore.getInitialState().phase = 'welcome';
    useAppStore.setState({ hydrated: false, phase: 'welcome' });
  });

  it('points to the official SitRight.me GitHub repository', () => {
    expect(GITHUB_REPO_URL).toBe('https://github.com/buddypia/SitRight.me');
  });

  it.each(SUPPORTED_LOCALES)(
    'renders the GitHub icon link in the main App header (%s)',
    (locale) => {
      setTestLocale(locale);
      useAppStore.setState({ hydrated: true, phase: 'welcome' });
      const html = renderToString(React.createElement(App));

      expect(html).toContain(`href="${GITHUB_REPO_URL}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    }
  );

  it.each(SUPPORTED_LOCALES)(
    'renders the GitHub icon link in the Guide header (%s)',
    (locale) => {
      const html = renderToString(React.createElement(Guide, { locale }));

      expect(html).toContain(`href="${GITHUB_REPO_URL}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    }
  );

  it.each(SUPPORTED_LOCALES)(
    'renders the GitHub repository link inside SettingsSheet (%s)',
    (locale) => {
      setTestLocale(locale);
      const html = renderToString(
        React.createElement(SettingsSheet, { open: true, onClose: () => {} })
      );

      expect(html).toContain(`href="${GITHUB_REPO_URL}"`);
      expect(html).toContain('GitHub');
    }
  );
});
