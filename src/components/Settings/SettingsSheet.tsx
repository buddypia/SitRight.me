'use client';

import { useEffect, useRef, useState } from 'react';
import type { Sensitivity } from '@/core/types';
import { getController } from '@/engine/controller';
import {
  notificationsSupported,
  playChime,
  requestNotificationPermission,
  showDesktopNotification,
} from '@/engine/notifier';
import { useT } from '@/hooks/useT';
import { format, type Locale } from '@/i18n/messages';
import { useAppStore } from '@/stores/appStore';
import { Button, Segmented, Toggle } from '../ui';
import { AvatarPicker } from './AvatarPicker';

export function SettingsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const settings = useAppStore((s) => s.settings);
  const update = useAppStore((s) => s.updateSettings);
  const resetAll = useAppStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notifyDenied, setNotifyDenied] = useState(false);
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
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
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
          <h2 className="text-base font-semibold">{t.settingsTitle}</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {t.close}
          </Button>
        </header>
        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
          <Field label={t.sensitivity}>
            <Segmented<Sensitivity>
              label={t.sensitivity}
              value={settings.sensitivity}
              onChange={(v) => {
                update({ sensitivity: v });
                controller.resetAlerts();
              }}
              options={(['gentle', 'standard', 'strict'] as const).map((v) => ({
                value: v,
                label: t[`sensitivity_${v}`],
              }))}
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

          <Field label={t.breakReminder}>
            <Segmented<number>
              label={t.breakReminder}
              value={settings.breakIntervalMin}
              onChange={(v) => update({ breakIntervalMin: v })}
              options={[0, 30, 45, 60, 90].map((v) => ({
                value: v,
                label: v === 0 ? t.off : format(t.minutesShort, { n: v }),
              }))}
            />
          </Field>

          <div className="space-y-4 rounded-2xl border border-line bg-s2/60 p-4">
            <Row label={t.sound}>
              <Toggle
                checked={settings.sound}
                label={t.sound}
                onChange={(v) => {
                  update({ sound: v });
                  if (v) playChime('good', 0.4);
                }}
              />
            </Row>
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
            <Row label={t.powerSaver}>
              <Toggle
                checked={settings.powerSaver}
                label={t.powerSaver}
                onChange={(v) => update({ powerSaver: v })}
              />
            </Row>
            {settings.desktopNotify && (
              <Button
                size="sm"
                onClick={() => {
                  const p = t.pattern.straight_neck;
                  showDesktopNotification(
                    `${t.alertTitle}: ${p.name}`,
                    `${p.short} — ${p.fix}`,
                    'sitsmart-test'
                  );
                }}
              >
                {t.testNotification}
              </Button>
            )}
          </div>

          <Field label={t.avatar}>
            <AvatarPicker
              value={settings.avatar}
              onChange={(v) => update({ avatar: v })}
              t={t}
            />
          </Field>

          <Field label={t.language}>
            <Segmented<Locale>
              label={t.language}
              value={settings.locale}
              onChange={(v) => update({ locale: v })}
              options={[
                { value: 'en', label: 'English' },
                { value: 'ja', label: '日本語' },
                { value: 'ko', label: '한국어' },
              ]}
            />
          </Field>

          <div className="border-t border-line pt-6">
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
          </div>
        </div>
      </div>
    </div>
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
