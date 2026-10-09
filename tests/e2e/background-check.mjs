/**
 * 非表示タブでの計測継続と CPU 使用率を確認するスクリプト。
 *
 * Playwright のページは常にフォーカス・表示状態に固定されるため（rAF も止まらない）、
 * 非表示部分は生の CDP で別タブを前面に出して再現する。
 *
 * 使い方:
 *   npm run build && node tests/e2e/serve-out.mjs 3011   # 別ターミナル
 *   node tests/e2e/background-check.mjs [非表示の秒数=180]
 *
 * 偽カメラ映像は tests/e2e/fixtures/generate.sh で生成した posture.mjpeg を使う。
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3011';
const HIDDEN_SEC = Number(process.argv[2] ?? 180);
const VISIBLE_SEC = 60;
const PORT = 9566;
const fakeVideo = path.resolve(import.meta.dirname, 'fixtures/posture.mjpeg');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 最小限の CDP クライアント（Playwright を介さない） */
function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pending = new Map();
    let id = 0;
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (!d.id || !pending.has(d.id)) return;
      const { res, rej } = pending.get(d.id);
      pending.delete(d.id);
      if (d.error) rej(new Error(d.error.message));
      else res(d.result);
    };
    ws.onerror = reject;
    ws.onopen = () =>
      resolve({
        send: (method, params = {}) =>
          new Promise((res, rej) => {
            id += 1;
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          }),
        close: () => ws.close(),
      });
  });
}

const json = async (p) => (await fetch(`http://127.0.0.1:${PORT}${p}`)).json();

async function waitForDevtools() {
  for (let i = 0; i < 50; i += 1) {
    try {
      return await json('/json/version');
    } catch {
      await sleep(200);
    }
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

const profile = mkdtempSync(path.join(tmpdir(), 'sitright-bg-'));
const chrome = spawn(
  chromium.executablePath(),
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    `--use-file-for-fake-video-capture=${fakeVideo}`,
    '--window-size=1440,900',
    'about:blank',
  ],
  { stdio: 'ignore' }
);

try {
  const version = await waitForDevtools();

  // 1) オンボーディング〜基準姿勢の記録は Playwright で操作する
  const pw = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  const page = pw.contexts()[0].pages()[0];
  await page.addInitScript(() => {
    if (localStorage.getItem('sitright.v2')) return;
    localStorage.setItem(
      'sitright.v2',
      JSON.stringify({
        version: 1,
        state: {
          settings: {
            locale: 'ja',
            alertDelaySec: 10,
            cooldownSec: 60,
            sound: false,
            breakIntervalMin: 0,
          },
          baseline: null,
          history: [],
        },
      })
    );
  });
  await page.goto(BASE_URL);
  await page.getByRole('button', { name: 'はじめる' }).click();
  const next = page.getByRole('button', { name: '次へ：基準姿勢を記録' });
  const record = page.getByRole('button', { name: '記録を開始' });
  for (let i = 0; !(await record.isVisible()); i += 1) {
    if (i > 120) throw new Error('setup checks did not pass');
    if (await next.isEnabled().catch(() => false))
      await next.click().catch(() => undefined);
    await sleep(1000);
  }
  await record.click();
  await page
    .getByRole('heading', { name: '良い姿勢' })
    .waitFor({ timeout: 60_000 });
  // 切断するとフォーカス固定が外れ、以降は通常のタブとして振る舞う
  await pw.close();

  // 2) 生の CDP で計測と CPU を見る
  const target = (await json('/json/list')).find(
    (t) => t.type === 'page' && t.url.startsWith(BASE_URL)
  );
  const app = await connect(target.webSocketDebuggerUrl);
  const browser = await connect(version.webSocketDebuggerUrl);
  const evaluate = async (expression) =>
    (
      await app.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      })
    ).result.value;
  const today = async () =>
    JSON.parse(
      await evaluate(
        `JSON.stringify(JSON.parse(localStorage.getItem('sitright.v2')).state.history[0] ?? {monitoredSec:0,alerts:0,fairSec:0,poorSec:0})`
      )
    );
  const cpuTime = async () => {
    const { processInfo } = await browser.send('SystemInfo.getProcessInfo');
    return processInfo.reduce((s, p) => s + p.cpuTime, 0);
  };

  const measure = async (label, sec) => {
    const s0 = await today();
    const c0 = await cpuTime();
    await sleep(sec * 1000);
    const s1 = await today();
    const c1 = await cpuTime();
    const state = await evaluate('document.visibilityState');
    const result = {
      label,
      visibility: state,
      seconds: sec,
      monitoredSec: +(s1.monitoredSec - s0.monitoredSec).toFixed(1),
      alerts: s1.alerts - s0.alerts,
      fairPoorSec: +(
        s1.fairSec +
        s1.poorSec -
        (s0.fairSec ?? 0) -
        (s0.poorSec ?? 0)
      ).toFixed(1),
      cpuPercent: +(((c1 - c0) / sec) * 100).toFixed(1),
    };
    console.log(JSON.stringify(result));
    return result;
  };

  const visible = await measure('visible', VISIBLE_SEC);

  await browser.send('Target.createTarget', {
    url: 'about:blank',
    newWindow: false,
  });
  await sleep(1000);
  if ((await evaluate('document.visibilityState')) !== 'hidden')
    throw new Error('could not put the app tab into the background');
  const rafFrames = await evaluate(
    'new Promise(r=>{let n=0;const f=()=>{n++;requestAnimationFrame(f)};requestAnimationFrame(f);setTimeout(()=>r(n),1000)})'
  );
  console.log(`rAF frames in 1s while hidden: ${rafFrames}`);

  const hidden = await measure('hidden', HIDDEN_SEC);
  app.close();
  browser.close();

  // 統計の書き込みは 5 秒ごとなので、大半の区間が計測されていれば良しとする
  const ok =
    hidden.visibility === 'hidden' &&
    hidden.monitoredSec > HIDDEN_SEC * 0.8 &&
    (HIDDEN_SEC < 100 || hidden.alerts > 0);
  console.log(ok ? 'PASS' : 'FAIL', { visible, hidden });
  process.exitCode = ok ? 0 : 1;
} finally {
  const exited = new Promise((r) => chrome.once('exit', r));
  chrome.kill();
  await exited;
  rmSync(profile, { recursive: true, force: true });
}
