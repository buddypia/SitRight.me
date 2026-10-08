'use client';

import { useState } from 'react';
import { IDEAL_RIG } from '@/core/rig';
import { unlockAudio } from '@/engine/notifier';
import { useT } from '@/hooks/useT';
import { useAppStore } from '@/stores/appStore';
import { PostureScene } from '../PostureScene';
import type { DemoPattern } from '../PostureScene/PostureScene';
import { Button } from '../ui';

export function Welcome() {
  const t = useT();
  const hasBaseline = useAppStore((s) => s.baseline !== null);
  const setPhase = useAppStore((s) => s.setPhase);
  const [demo, setDemo] = useState<DemoPattern>('ideal');

  const go = (phase: 'setup' | 'monitor') => {
    unlockAudio();
    setPhase(phase);
  };

  const demoLabel = demo === 'ideal' ? t.statusGood : t.pattern[demo].name;
  const demoTone = demo === 'ideal' ? 'text-good' : 'text-fair';

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-[1280px] items-center gap-10 px-6 pb-10 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
      <section className="animate-fade-up">
        <p className="text-[13px] font-medium tracking-wide text-good">
          {t.welcomeEyebrow}
        </p>
        <h1 className="mt-4 whitespace-pre-line font-display text-[clamp(30px,4vw,48px)] font-semibold leading-[1.25] tracking-tight text-ink-1">
          {t.welcomeTitle}
        </h1>
        <p className="mt-5 max-w-[34em] text-[15px] leading-[1.9] text-ink-2">
          {t.welcomeBody}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {hasBaseline ? (
            <>
              <Button variant="primary" size="lg" onClick={() => go('monitor')}>
                {t.welcomeResume}
              </Button>
              <Button size="lg" onClick={() => go('setup')}>
                {t.welcomeRecalibrate}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" onClick={() => go('setup')}>
              {t.welcomeStart}
              <span aria-hidden>→</span>
            </Button>
          )}
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          {[
            [t.featureMeasure, t.featureMeasureBody],
            [t.featureSide, t.featureSideBody],
            [t.featureQuiet, t.featureQuietBody],
          ].map(([title, body]) => (
            <li key={title} className="border-l border-line pl-4">
              <p className="text-sm font-semibold text-ink-1">{title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                {body}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex items-start gap-3 rounded-2xl border border-line bg-s1/60 p-4">
          <LockIcon />
          <div>
            <p className="text-sm font-medium text-ink-1">{t.privacyTitle}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">
              {t.privacyBody}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-ink-3">
          {t.disclaimer}
        </p>
      </section>

      <section className="relative order-first aspect-[5/4] w-full overflow-hidden rounded-[28px] border border-line lg:order-none lg:aspect-auto lg:h-[min(78dvh,720px)]">
        <PostureScene
          rig={IDEAL_RIG}
          severity={null}
          xray
          t={t}
          demo
          onDemoPattern={setDemo}
          className="h-full w-full"
        />
        <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs backdrop-blur">
          <span className="text-ink-3">{t.demoLabel}</span>
          <span className={`font-medium transition-colors ${demoTone}`}>
            {demoLabel}
          </span>
        </div>
      </section>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="mt-0.5 shrink-0 text-good"
      aria-hidden
    >
      <rect
        x="4.5"
        y="10.5"
        width="15"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 10.5V8a4 4 0 1 1 8 0v2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
