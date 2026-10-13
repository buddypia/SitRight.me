'use client';

import type { Messages } from '@/i18n/messages';
import type { LiveState } from '@/stores/appStore';
import { PostureScene } from '../PostureScene';
import type { Avatar } from '../PostureScene/models';
import {
  STATUS_COLOR,
  displayStatus,
  isPostureCollapsed,
  statusLabel,
} from './StatusCard';

/** Picture-in-Picture（PiP）用の表示。3D の横姿勢と、状態・スコアだけを出す */
export function MiniMonitor({
  live,
  t,
  xray,
  avatar,
  lowPower,
}: {
  live: LiveState;
  t: Messages;
  xray: boolean;
  avatar: Avatar;
  lowPower: boolean;
}) {
  const status = displayStatus(live);
  const color = STATUS_COLOR[status];
  const a = live.assessment;
  const measuring = status === 'good' || status === 'fair' || status === 'poor';
  const postureCollapsed = isPostureCollapsed(status);
  const pattern =
    measuring && a?.pattern && a.level !== 'good' ? t.pattern[a.pattern] : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <PostureScene
        rig={live.rig}
        severity={measuring ? (a?.severity ?? null) : null}
        xray={xray}
        avatar={avatar}
        lowPower={lowPower}
        loadWeights={postureCollapsed}
        neckLoadKg={measuring ? (a?.neckLoadKg ?? null) : null}
        t={t}
        className="min-h-0 flex-1"
      />
      <div className="flex items-center gap-3 border-t border-line px-3 py-2.5">
        {status === 'loading' ? (
          <span className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border border-current border-t-transparent text-ink-3" />
        ) : status === 'good' ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-good"
            aria-hidden
          >
            <path
              d="M8 1.5v13"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeDasharray="1.5 2"
              strokeLinecap="round"
              opacity="0.45"
            />
            <circle cx="8" cy="3.5" r="2" fill="currentColor" />
            <circle cx="8" cy="8" r="1.5" fill="currentColor" />
            <circle cx="8" cy="12.5" r="1.8" fill="currentColor" />
          </svg>
        ) : (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-500"
            style={{ background: color }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-ink-1"
            aria-live="polite"
          >
            {pattern ? pattern.name : status === 'good' ? t.alignmentOptimal : statusLabel(status, t)}
          </p>
          {pattern && (
            <p className="truncate text-[11px] text-ink-3">{pattern.fix}</p>
          )}
        </div>
        <span
          className="font-mono text-xl font-semibold tabular-nums"
          style={{ color }}
          aria-label={t.scoreLabel}
        >
          {measuring && a ? a.score : '–'}
        </span>
      </div>
      {measuring && (
        <div className="h-1 bg-white/6">
          <div
            className="h-full transition-[width] duration-300 ease-linear"
            style={{
              width: `${Math.round(live.alertProgress * 100)}%`,
              background: color,
            }}
          />
        </div>
      )}
    </div>
  );
}
