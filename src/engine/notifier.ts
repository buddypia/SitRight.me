import type { SoundTheme } from '@/stores/appStore';

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

const SOUND_FILE_MAP: Record<SoundTheme, string | null> = {
  'snap-horn': '/sounds/snap-c-acoustic-horn.wav',
  'snap-bio': '/sounds/snap-a-bio-crack.wav',
  'snap-click': '/sounds/snap-b-titanium-click.wav',
  'snap-pop': '/sounds/snap-d-subtle-pop.wav',
  chime: null,
};

const bufferCache = new Map<string, AudioBuffer>();
const loadingPromises = new Map<string, Promise<AudioBuffer | null>>();

async function loadSoundBuffer(
  c: AudioContext,
  url: string
): Promise<AudioBuffer | null> {
  const cached = bufferCache.get(url);
  if (cached) return cached;
  const inFlight = loadingPromises.get(url);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const decoded = await c.decodeAudioData(arrayBuffer);
      bufferCache.set(url, decoded);
      return decoded;
    } catch {
      return null;
    } finally {
      loadingPromises.delete(url);
    }
  })();

  loadingPromises.set(url, promise);
  return promise;
}

/** ユーザー操作の中で呼び、以後の効果音を鳴らせるようにする。同時に既定音をプリロード */
export function unlockAudio(): void {
  const c = ctx();
  if (c && c.state === 'suspended') void c.resume();
  if (c) {
    const defaultUrl = SOUND_FILE_MAP['snap-horn'];
    if (defaultUrl) void loadSoundBuffer(c, defaultUrl);
  }
}

/** 従来のプロシージャルサイン波チャイム（フォールバック用） */
function playSyntheticChime(
  c: AudioContext,
  tone: 'alert' | 'good' | 'break',
  volume = 0.5
): void {
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

/** サウンド効果音再生。alert は設定のサウンドテーマ（パキッ！）、good/break はチャイム */
export function playChime(
  tone: 'alert' | 'good' | 'break',
  volume = 0.5,
  theme: SoundTheme = 'snap-horn'
): void {
  const c = ctx();
  if (!c || volume <= 0) return;
  if (c.state === 'suspended') void c.resume();

  // alert かつ snap テーマが選ばれている場合はパキッ！サウンドを再生
  if (tone === 'alert') {
    const soundUrl = SOUND_FILE_MAP[theme];
    if (soundUrl) {
      const cached = bufferCache.get(soundUrl);
      if (cached) {
        const source = c.createBufferSource();
        source.buffer = cached;
        const gainNode = c.createGain();
        gainNode.gain.value = volume;
        source.connect(gainNode).connect(c.destination);
        source.start(c.currentTime);
        return;
      }

      // 未キャッシュ時はロードして再生、失敗時はサイン波へフォールバック
      void loadSoundBuffer(c, soundUrl).then((buf) => {
        if (buf && c.state !== 'closed') {
          const source = c.createBufferSource();
          source.buffer = buf;
          const gainNode = c.createGain();
          gainNode.gain.value = volume;
          source.connect(gainNode).connect(c.destination);
          source.start(c.currentTime);
        } else {
          playSyntheticChime(c, tone, volume);
        }
      });
      return;
    }
  }

  // デフォルトの合成チャイム（good, break, または chime テーマ）
  playSyntheticChime(c, tone, volume);
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
  tag = 'sitright-posture'
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

const BASE_TITLE = 'SitRight';

export function setTitleState(prefix: string | null): void {
  if (typeof document === 'undefined') return;
  const next = prefix ? `${prefix} · ${BASE_TITLE}` : BASE_TITLE;
  if (document.title !== next) document.title = next;
}
