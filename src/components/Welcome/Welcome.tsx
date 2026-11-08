'use client';

import { useEffect, useState } from 'react';
import { IDEAL_RIG } from '@/core/rig';
import { getController } from '@/engine/controller';
import { unlockAudio } from '@/engine/notifier';
import { useT } from '@/hooks/useT';
import { guidePath } from '@/i18n/messages';
import { useAppStore } from '@/stores/appStore';
import {
  DEMO_PATTERNS,
  PostureScene,
  type DemoPattern,
} from '../PostureScene/PostureScene';
import { Button } from '../ui';

interface IdleSchedulerHost {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
}

/** アイドル時間を利用して MediaPipe の WASM / 姿勢推定モデルを裏で事前読み込みする */
export function scheduleEnginePrewarm(
  ensureEngine: () => Promise<void>,
  host: IdleSchedulerHost = typeof window !== 'undefined'
    ? (window as unknown as IdleSchedulerHost)
    : {}
): () => void {
  const run = () => void ensureEngine().catch(() => undefined);
  if (typeof host.requestIdleCallback === 'function') {
    const id = host.requestIdleCallback(run, { timeout: 2000 });
    return () => host.cancelIdleCallback?.(id);
  }
  const timer = setTimeout(run, 600);
  return () => clearTimeout(timer);
}

/**
 * Welcome の開始ボタンから次画面へ進む。
 * Setup へ進むときはユーザー操作の延長でカメラ起動も同時に始め、
 * 2回ボタンを押す手間と途中離脱を防ぐ。
 */
export function runWelcomeTransition(
  phase: 'setup' | 'monitor',
  deps: {
    setPhase: (p: 'setup' | 'monitor') => void;
    startCamera: () => Promise<void>;
    unlock: () => void;
  }
): void {
  deps.unlock();
  deps.setPhase(phase);
  if (phase === 'setup') {
    void deps.startCamera().catch(() => undefined);
  }
}

export function Welcome() {
  const t = useT();
  const hasBaseline = useAppStore((s) => s.baseline !== null);
  const setPhase = useAppStore((s) => s.setPhase);
  const avatar = useAppStore((s) => s.settings.avatar);
  const locale = useAppStore((s) => s.settings.locale);
  const [demo, setDemo] = useState<DemoPattern>('ideal');
  const [pinnedDemo, setPinnedDemo] = useState<DemoPattern | null>(null);

  useEffect(
    () => scheduleEnginePrewarm(() => getController().ensureEngine()),
    []
  );

  const go = (phase: 'setup' | 'monitor') => {
    runWelcomeTransition(phase, {
      setPhase,
      startCamera: () => getController().startCamera(),
      unlock: unlockAudio,
    });
  };

  const activeDemo = pinnedDemo ?? demo;
  const demoLabel =
    activeDemo === 'ideal' ? t.statusGood : t.pattern[activeDemo].name;
  const demoTone = activeDemo === 'ideal' ? 'text-good' : 'text-fair';
  const demoDetail =
    activeDemo === 'ideal' ? t.alignmentBalanced : t.pattern[activeDemo].fix;

  const selectPattern = (pattern: DemoPattern) => {
    setPinnedDemo((prev) => (prev === pattern ? null : pattern));
    setDemo(pattern);
  };

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-[1280px] items-center gap-10 px-6 pb-10 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
      <section className="animate-fade-up">
        <p className="text-[13px] font-medium tracking-wide text-good">
          {t.welcomeEyebrow}
        </p>
        <h1 className="mt-4 whitespace-pre-line text-[clamp(30px,4vw,48px)] font-semibold leading-tight tracking-tight text-ink-1">
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

        <p className="mt-6 text-[11px] leading-relaxed text-ink-3">
          {t.disclaimer}{' '}
          <a href={guidePath(locale)} className="text-good hover:underline">
            {t.guideLink}
          </a>
        </p>
      </section>

      <section className="relative order-first aspect-square w-full sm:aspect-5/4 overflow-hidden rounded-[28px] border border-line lg:order-0 lg:aspect-auto lg:h-[min(78dvh,720px)]">
        <PostureScene
          rig={IDEAL_RIG}
          severity={null}
          xray
          avatar={avatar}
          t={t}
          demo
          demoPattern={pinnedDemo}
          loadWeights
          onDemoPattern={setDemo}
          className="h-full w-full"
        />
        <div className="pointer-events-none absolute left-3 right-14 top-3 flex flex-col items-start gap-2 sm:left-5 sm:right-5 sm:top-5">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/50 px-3 py-1.5 text-xs backdrop-blur-sm">
            <span className="text-ink-3">{t.demoLabel}</span>
            <span className={`font-medium transition-colors ${demoTone}`}>
              {demoLabel}
            </span>
            <span className="hidden text-white/25 sm:inline" aria-hidden>
              ·
            </span>
            <span className="hidden text-[11px] text-ink-2 sm:inline">
              {demoDetail}
            </span>
          </div>
          <div
            role="group"
            aria-label={t.demoLabel}
            className="pointer-events-auto flex flex-wrap items-center gap-1.5"
          >
            {DEMO_PATTERNS.map((pattern) => {
              const isSelected = activeDemo === pattern;
              const isPinned = pinnedDemo === pattern;
              const label =
                pattern === 'ideal' ? t.statusGood : t.pattern[pattern].name;
              return (
                <button
                  key={pattern}
                  type="button"
                  aria-pressed={isPinned}
                  onClick={() => selectPattern(pattern)}
                  className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm transition ${
                    isSelected
                      ? pattern === 'ideal'
                        ? 'border-good/50 bg-good/20 text-good'
                        : 'border-fair/50 bg-fair/20 text-fair'
                      : 'border-white/10 bg-black/40 text-white/70 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
