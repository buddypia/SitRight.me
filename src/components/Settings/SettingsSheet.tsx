'use client';

import { useEffect, useRef, useState } from 'react';
import type { PeriodicNotifyMode, Sensitivity } from '@/core/types';
import { getController } from '@/engine/controller';
import {
  notificationsSupported,
  playChime,
  requestNotificationPermission,
} from '@/engine/notifier';
import {
  downloadCsv,
  downloadJson,
  exportAllStatsToJson,
  exportDayStatsToSummaryCsv,
  exportDayStatsToTimelineCsv,
} from '@/core/export';
import { localDateKey } from '@/core/stats';
import { useT } from '@/hooks/useT';
import { format } from '@/i18n/messages';
import { useAppStore, type SoundTheme } from '@/stores/appStore';
import { Button, Segmented, Toggle } from '../ui';
import { AvatarPicker } from './AvatarPicker';
import { PrivacyModal } from '../Privacy';
import { LicensesModal } from '../Licenses';
import { DownloadIcon } from '../Monitor';

export function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const history = useAppStore((s) => s.history);
  const update = useAppStore((s) => s.updateSettings);
  const resetAll = useAppStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notifyDenied, setNotifyDenied] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [licensesOpen, setLicensesOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  if (!open && confirmReset) setConfirmReset(false);

  // 閉じている間は中のボタンにフォーカスが入らないようにし、開閉時にフォーカスを移す・戻す
  useEffect(() => {
    rootRef.current?.toggleAttribute('inert', !open);
    if (!open) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panelRef.current?.focus();
    return () => opener?.focus();
  }, [open]);

  useEffect(() => {
    if (!open || privacyOpen || licensesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, privacyOpen, licensesOpen, onClose]);

  const controller = getController();

  const setDesktop = async (on: boolean) => {
    if (!on) {
      update({ desktopNotify: false });
      return;
    }
    const result = await requestNotificationPermission();
    setNotifyDenied(result === 'denied');
    update({ desktopNotify: result === 'granted' });
  };

  return (
    <div
      ref={rootRef}
      className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t.settingsTitle}
        className={`absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-line bg-s1 shadow-2xl outline-hidden transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold text-ink-1">{t.settingsTitle}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t.close}
          </Button>
        </header>
        <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
          <Section title={t.settingsGroupAlerts}>
            <Field label={t.sensitivity}>
              <Segmented<Sensitivity>
                label={t.sensitivity}
                value={settings.sensitivity}
                onChange={(v) => {
                  update({ sensitivity: v });
                  controller.resetAlerts();
                }}
                options={(['gentle', 'standard', 'strict'] as const).map(
                  (v) => ({
                    value: v,
                    label: t[`sensitivity_${v}`],
                  })
                )}
              />
            </Field>

            <Field label={t.alertDelay}>
              <Segmented<number>
                label={t.alertDelay}
                value={settings.alertDelaySec}
                onChange={(v) => update({ alertDelaySec: v })}
                options={[10, 20, 30, 60, 120].map((v) => ({
                  value: v,
                  label:
                    v >= 60
                      ? format(t.minutesShort, { n: v / 60 })
                      : format(t.seconds, { n: v }),
                }))}
              />
            </Field>

            <Field label={t.cooldown}>
              <Segmented<number>
                label={t.cooldown}
                value={settings.cooldownSec}
                onChange={(v) => update({ cooldownSec: v })}
                options={[60, 120, 300, 600].map((v) => ({
                  value: v,
                  label: format(t.minutesShort, { n: v / 60 }),
                }))}
              />
            </Field>
          </Section>

          <Section title={t.settingsGroupNotify}>
            <Row label={t.sound}>
              <Toggle
                checked={settings.sound}
                label={t.sound}
                onChange={(v) => {
                  update({ sound: v });
                  if (v) playChime('alert', 0.5, settings.soundTheme);
                }}
              />
            </Row>
            {settings.sound && (
              <Select<SoundTheme>
                label={t.soundTheme}
                value={settings.soundTheme}
                onChange={(v) => {
                  update({ soundTheme: v });
                  playChime('alert', 0.5, v);
                }}
                options={[
                  { value: 'snap-horn', label: t.soundTheme_snap_horn },
                  { value: 'snap-bio', label: t.soundTheme_snap_bio },
                  { value: 'snap-click', label: t.soundTheme_snap_click },
                  { value: 'snap-pop', label: t.soundTheme_snap_pop },
                  { value: 'chime', label: t.soundTheme_chime },
                ]}
              />
            )}
            {notificationsSupported() && (
              <Row
                label={t.desktopNotify}
                hint={
                  notifyDenied ? t.notificationsDenied : t.notificationsHint
                }
              >
                <Toggle
                  checked={settings.desktopNotify}
                  label={t.desktopNotify}
                  onChange={(v) => void setDesktop(v)}
                />
              </Row>
            )}
            <Button
              size="sm"
              onClick={async () => {
                if (
                  settings.desktopNotify &&
                  notificationsSupported() &&
                  Notification.permission === 'default'
                ) {
                  const result = await requestNotificationPermission();
                  setNotifyDenied(result === 'denied');
                }
                controller.triggerTestAlert();
              }}
            >
              {t.testNotification}
            </Button>

            <Field label={t.periodicNotify}>
              <Segmented<number>
                label={t.periodicNotify}
                value={settings.breakIntervalMin}
                onChange={(v) => update({ breakIntervalMin: v })}
                options={[0, 15, 30, 45, 60].map((v) => ({
                  value: v,
                  label: v === 0 ? t.off : format(t.minutesShort, { n: v }),
                }))}
              />
            </Field>
            {settings.breakIntervalMin > 0 && (
              <div className="space-y-2.5">
                <Select<PeriodicNotifyMode>
                  label={t.periodicMode}
                  value={settings.periodicMode}
                  onChange={(v) => update({ periodicMode: v })}
                  options={(
                    ['auto', 'check', 'advice', 'break', 'report'] as const
                  ).map((mode) => ({
                    value: mode,
                    label: t[`periodicMode_${mode}`],
                  }))}
                />
                <p className="text-xs leading-relaxed text-ink-3">
                  {t[`periodicModeHint_${settings.periodicMode}`]}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => controller.triggerPeriodicNotification()}
                >
                  {t.testPeriodicNotify}
                </Button>
              </div>
            )}
          </Section>

          <Section title={t.settingsGroupDisplay}>
            <Field label={t.avatar}>
              <AvatarPicker
                value={settings.avatar}
                onChange={(v) => update({ avatar: v })}
                t={t}
              />
            </Field>
            <Row label={t.powerSaver}>
              <Toggle
                checked={settings.powerSaver}
                label={t.powerSaver}
                onChange={(v) => update({ powerSaver: v })}
              />
            </Row>
          </Section>

          <Section title={t.privacySectionTitle}>
            <Row label={t.telemetryLabel} hint={t.telemetryHint}>
              <Toggle
                checked={settings.telemetry}
                onChange={(v) => update({ telemetry: v })}
                label={t.telemetryLabel}
              />
            </Row>
            <div className="flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={() => setPrivacyOpen(true)}
                className="cursor-pointer text-xs text-good hover:underline"
              >
                {t.privacyNoticeButton} <span aria-hidden>→</span>
              </button>
              <button
                type="button"
                onClick={() => setLicensesOpen(true)}
                className="cursor-pointer text-xs text-good hover:underline"
              >
                {t.licensesNoticeButton} <span aria-hidden>→</span>
              </button>
              <a
                href="mailto:contact@buddypia.com"
                className="text-xs text-good hover:underline"
              >
                {t.contactNoticeButton} <span aria-hidden>↗</span>
              </a>
            </div>

            <Field label={t.exportData}>
              <p className="mb-3 text-xs leading-relaxed text-ink-3">
                {t.exportHint}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const todayKey = localDateKey(new Date());
                    downloadCsv(
                      exportDayStatsToSummaryCsv(history, {
                        locale: settings.locale,
                        t,
                      }),
                      `sitright-daily-summary-${todayKey}.csv`
                    );
                  }}
                >
                  <DownloadIcon />
                  {t.exportSummaryCsv}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const todayKey = localDateKey(new Date());
                    downloadCsv(
                      exportDayStatsToTimelineCsv(history, {
                        locale: settings.locale,
                        t,
                      }),
                      `sitright-timeline-${todayKey}.csv`
                    );
                  }}
                >
                  <DownloadIcon />
                  {t.exportTimelineCsv}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const todayKey = localDateKey(new Date());
                    downloadJson(
                      exportAllStatsToJson(history),
                      `sitright-stats-${todayKey}.json`
                    );
                  }}
                >
                  <DownloadIcon />
                  {t.exportJson}
                </Button>
              </div>
            </Field>

            <Button
              size="sm"
              className={
                confirmReset ? 'border-poor/50! bg-poor/15! text-poor!' : ''
              }
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                controller.stopCamera();
                resetAll();
                controller.resetStats();
                onClose();
              }}
            >
              {confirmReset ? t.resetConfirm : t.resetData}
            </Button>
          </Section>
        </div>
      </div>
      <PrivacyModal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
      />
      <LicensesModal
        open={licensesOpen}
        onClose={() => setLicensesOpen(false)}
      />
    </div>
  );
}

/** 設定のまとまり。見出しの下に項目を並べ、まとまりの間は線で区切る */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold tracking-wide text-ink-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** 選択肢が多く、横に並べると折り返してしまう設定用 */
function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block text-[13px] font-medium text-ink-2">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-2.5 block w-full cursor-pointer rounded-xl border border-line bg-s2 px-3 py-2 text-sm font-normal text-ink-1"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2.5 text-[13px] font-medium text-ink-2">{label}</p>
      {children}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-ink-1">{label}</p>
        {hint && (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{hint}</p>
        )}
      </div>
      {children}
    </div>
  );
}
