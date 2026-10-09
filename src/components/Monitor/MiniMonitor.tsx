'use client';

import type { Messages } from '@/i18n/messages';
import type { LiveState } from '@/stores/appStore';
import { PostureScene } from '../PostureScene';
import type { Avatar } from '../PostureScene/models';
import { STATUS_COLOR, displayStatus, statusLabel } from './StatusCard';

/** 小窓（Picture-in-Picture）用の表示。3D の横姿勢と、状態・スコアだけを出す */
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
        t={t}
        className="min-h-0 flex-1"
      />
      <div className="flex items-center gap-3 border-t border-line px-3 py-2.5">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-500"
          style={{ background: color }}
        />
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold text-ink-1"
            aria-live="polite"
          >
            {pattern ? pattern.name : statusLabel(status, t)}
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
