/** 通知チャネル（デスクトップ通知・効果音・タブタイトル） */

let audioCtx: AudioContext | null = null;

const ctx = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
};

/** ユーザー操作の中で呼び、以後の効果音を鳴らせるようにする */
export function unlockAudio(): void {
  const c = ctx();
  if (c && c.state === 'suspended') void c.resume();
}

/** 柔らかいチャイム。tone: 'alert' は下降2音、'good' は上昇2音 */
export function playChime(
  tone: 'alert' | 'good' | 'break',
  volume = 0.5
): void {
  const c = ctx();
  if (!c || volume <= 0) return;
  if (c.state === 'suspended') void c.resume();
  const notes =
    tone === 'alert'
      ? [659.25, 523.25]
      : tone === 'good'
        ? [523.25, 783.99]
        : [587.33, 587.33, 880];
  const start = c.currentTime + 0.02;
  notes.forEach((freq, i) => {
    const t = start + i * 0.16;
    const osc = c.createOscillator();
    const overtone = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    overtone.type = 'sine';
    osc.frequency.value = freq;
    overtone.frequency.value = freq * 2;
    const g2 = c.createGain();
    g2.gain.value = 0.18;
    overtone.connect(g2).connect(gain);
    osc.connect(gain).connect(c.destination);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.16 * volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.start(t);
    overtone.start(t);
    osc.stop(t + 1);
    overtone.stop(t + 1);
  });
}

export const notificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

export function showDesktopNotification(
  title: string,
  body: string,
  tag = 'sitsmart-posture'
): void {
  if (!notificationsSupported() || Notification.permission !== 'granted')
    return;
  try {
    const n = new Notification(title, {
      body,
      tag,
      icon: '/icon-192x192.png',
      silent: true,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    setTimeout(() => n.close(), 12000);
  } catch (error) {
    console.warn('[notifier] notification failed', error);
  }
}

const BASE_TITLE = 'SitSmart';

export function setTitleState(prefix: string | null): void {
  if (typeof document === 'undefined') return;
  const next = prefix ? `${prefix} · ${BASE_TITLE}` : BASE_TITLE;
  if (document.title !== next) document.title = next;
}
