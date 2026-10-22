'use client';

import { useSyncExternalStore } from 'react';
import { App } from '@/components/App';
import { Logo } from '@/components/ui';
import {
  DEFAULT_LOCALE,
  LOCALE_REGISTRY,
  MESSAGES,
  SUPPORTED_LOCALES,
  guidePath,
  localePath,
  type Locale,
} from '@/i18n/messages';
import { pageJsonLd } from './seo';

const emptySubscribe = () => () => {};

export function Home({ locale = DEFAULT_LOCALE }: { locale?: Locale }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const jsonLd = pageJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {mounted ? <App /> : <SeoWelcomeShell locale={locale} />}
    </>
  );
}

/**
 * 静的書き出し（out/*.html）および初期描画用のセマンティック HTML。
 * 検索エンジンや SNS クローラーが JS や localStorage なしでも
 * 各言語（/・/ja・/ko）の見出し・説明・機能一覧・言語リンクを読み取れるようにする。
 */
function SeoWelcomeShell({ locale }: { locale: Locale }) {
  const t = MESSAGES[locale];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-transparent bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">
              SitRight
            </span>
            <span className="hidden text-xs text-ink-3 md:inline">
              {t.appTagline}
            </span>
          </div>
          <nav
            aria-label={t.language}
            className="flex items-center gap-2 text-xs text-ink-3"
          >
            {SUPPORTED_LOCALES.map((l) => (
              <a
                key={l}
                href={localePath(l)}
                hrefLang={l}
                aria-current={l === locale ? 'page' : undefined}
                className={
                  l === locale
                    ? ' rounded px-2 py-1 font-medium text-ink-1'
                    : 'rounded px-2 py-1 hover:text-ink-2'
                }
              >
                {LOCALE_REGISTRY[l].nativeName}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <div className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-[1280px] items-center gap-10 px-6 pb-10 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
          <section>
            <p className="text-[13px] font-medium tracking-wide text-good">
              {t.welcomeEyebrow}
            </p>
            <h1 className="mt-4 whitespace-pre-line text-[clamp(30px,4vw,48px)] font-semibold leading-tight tracking-tight text-ink-1">
              {t.welcomeTitle}
            </h1>
            <p className="mt-5 max-w-[34em] text-[15px] leading-[1.9] text-ink-2">
              {t.welcomeBody}
            </p>

            <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                [t.featureMeasure, t.featureMeasureBody],
                [t.featureSide, t.featureSideBody],
                [t.featureQuiet, t.featureQuietBody],
              ].map(([title, body]) => (
                <li key={title} className="border-l border-line pl-4">
                  <h2 className="text-sm font-semibold text-ink-1">{title}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                    {body}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex items-start gap-3 rounded-2xl border border-line bg-s1/60 p-4">
              <div className="flex-1">
                <h2 className="text-sm font-medium text-ink-1">
                  {t.privacyTitle}
                </h2>
                <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">
                  {t.privacyBody}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
              {t.disclaimer}{' '}
              <a href={guidePath(locale)} className="text-good hover:underline">
                {t.guideLink}
              </a>
            </p>
          </section>

          <section
            aria-label={t.sideView}
            className="relative order-first grid aspect-square w-full place-items-center overflow-hidden rounded-[28px] border border-line bg-s1/40 text-sm text-ink-3 sm:aspect-5/4 lg:order-0 lg:aspect-auto lg:h-[min(78dvh,720px)]"
          >
            <span>{t.loading}</span>
          </section>
        </div>
      </main>
    </div>
  );
}
