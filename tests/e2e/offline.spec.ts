import { expect, test } from '@playwright/test';
import { calibrate, seedSettings } from './helpers';

/** 読み込み後はネットワークが無くても計測を続けられること（推定はすべてブラウザ内） */
test('keeps measuring after the network goes offline', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seedSettings(page);
  await page.goto('/');
  await calibrate(page);
  await expect(page.getByRole('heading', { name: '良い姿勢' })).toBeVisible({
    timeout: 20_000,
  });

  const monitoredSec = async () =>
    JSON.parse(
      (await page.evaluate(() => localStorage.getItem('sitright.v2'))) ?? '{}'
    ).state.history?.[0]?.monitoredSec ?? 0;

  await context.setOffline(true);
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  const before = await monitoredSec();
  // 統計は 5 秒ごとに保存される
  await expect
    .poll(monitoredSec, { timeout: 30_000 })
    .toBeGreaterThan(before + 10);
  expect(errors).toEqual([]);
});
