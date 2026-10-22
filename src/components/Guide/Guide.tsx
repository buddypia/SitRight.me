import {
  LOCALE_REGISTRY,
  MESSAGES,
  SUPPORTED_LOCALES,
  guidePath,
  localePath,
  type Locale,
} from '@/i18n/messages';
import { Logo } from '../ui';
import { GUIDE, GUIDE_UPDATED, SOURCES, type SourceId } from './content';

/**
 * 仕組み・計測方法・よくある質問を出典付きで説明する静的ページ。
 * JS なしでも全文を読めるよう、サーバーで描画する（検索エンジンや AI の回答エンジンが引用できる）。
 */
export function Guide({ locale }: { locale: Locale }) {
  const g = GUIDE[locale];
  const sourceIds = [
    ...new Set(g.sections.flatMap((s) => s.sources)),
  ] as SourceId[];
  const sourceNumber = (id: SourceId) => sourceIds.indexOf(id) + 1;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-4 px-4 sm:px-6">
          <a href={localePath(locale)} className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">
              SitRight
            </span>
          </a>
          <nav className="flex items-center gap-2 text-xs text-ink-3">
            {SUPPORTED_LOCALES.map((l) => (
              <a
                key={l}
                href={guidePath(l)}
                hrefLang={l}
                aria-current={l === locale ? 'page' : undefined}
                className={
                  l === locale
                    ? 'rounded px-2 py-1 font-medium text-ink-1'
                    : 'rounded px-2 py-1 hover:text-ink-2'
                }
              >
                {LOCALE_REGISTRY[l].nativeName}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-6 pb-20 pt-10">
        <nav aria-label="Breadcrumb" className="text-xs text-ink-3">
          <a href={localePath(locale)} className="hover:text-ink-2">
            {g.homeLabel}
          </a>
          <span aria-hidden> / </span>
          <span aria-current="page">{MESSAGES[locale].guideLink}</span>
        </nav>

        <article className="mt-6">
          <h1 className="text-[clamp(26px,3.4vw,38px)] font-semibold leading-tight tracking-tight text-ink-1">
            {g.heading}
          </h1>
          <p className="mt-3 text-xs text-ink-3">
            {g.updatedLabel}: <time dateTime={GUIDE_UPDATED}>{GUIDE_UPDATED}</time>
          </p>
          <p className="mt-6 text-[16px] leading-[1.9] text-ink-2">
            {g.summary}
          </p>

          <figure className="mt-8 overflow-hidden rounded-2xl border border-line">
            {/* 静的書き出しでは画像最適化サーバーがないため、事前に WebP にした画像をそのまま使う */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/guide/posture-side-view.webp"
              alt={g.imageAlt}
              width={1376}
              height={768}
              className="h-auto w-full"
            />
          </figure>

          {g.sections.map((section) => (
            <section key={section.heading} className="mt-12">
              <h2 className="text-xl font-semibold tracking-tight text-ink-1">
                {section.heading}
              </h2>
              {section.paragraphs.map((p) => (
                <p key={p} className="mt-4 text-[15px] leading-[1.9] text-ink-2">
                  {p}
                </p>
              ))}
              {section.items && (
                <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.quote && (
                <blockquote
                  cite={SOURCES[section.quote.source].url}
                  className="mt-5 border-l-2 border-good/60 pl-4"
                >
                  <p lang="en" className="text-[15px] italic leading-[1.8] text-ink-1">
                    “{section.quote.text}”
                  </p>
                  {section.quote.note && (
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                      {section.quote.note}
                    </p>
                  )}
                </blockquote>
              )}
              <p className="mt-3 text-xs text-ink-3">
                {g.sourcesHeading}:{' '}
                {section.sources.map((id) => (
                  <a
                    key={id}
                    href={`#source-${id}`}
                    className="mr-1 hover:text-ink-2"
                  >
                    [{sourceNumber(id)}]
                  </a>
                ))}
              </p>
            </section>
          ))}

          <section className="mt-14">
            <h2 className="text-xl font-semibold tracking-tight text-ink-1">
              {g.faqHeading}
            </h2>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {g.faq.map(({ q, a }) => (
                <div key={q} className="py-5">
                  <h3 className="text-[15px] font-semibold text-ink-1">{q}</h3>
                  <p className="mt-2 text-[15px] leading-[1.9] text-ink-2">
                    {a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-12">
            <a
              href={localePath(locale)}
              className="inline-flex items-center gap-2 rounded-full bg-good px-5 py-3 text-sm font-semibold text-bg hover:opacity-90"
            >
              {g.cta} <span aria-hidden>→</span>
            </a>
          </div>

          <section className="mt-14">
            <h2 className="text-sm font-semibold text-ink-1">
              {g.sourcesHeading}
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-ink-3">
              {sourceIds.map((id) => (
                <li key={id} id={`source-${id}`}>
                  <a
                    href={SOURCES[id].url}
                    rel="noopener"
                    className="hover:text-ink-2 hover:underline"
                  >
                    {SOURCES[id].name}
                  </a>
                </li>
              ))}
            </ol>
          </section>
        </article>
      </main>
    </div>
  );
}
