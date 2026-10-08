import { expect, test, type Page } from '@playwright/test';

/**
 * 偽カメラ映像（tests/e2e/fixtures/generate.sh で生成）を使った通しテスト。
 * 映像: 0-45s 基準姿勢 → 45-75s 頭が前下方へ（首猫背）→ 75-100s 基準姿勢 のループ。
 * GPU の無い環境（SwiftShader）では推定が遅いため、時間に余裕を持たせている。
 */

const seedSettings = async (page: Page) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('sitsmart.v2')) return;
    localStorage.setItem(
      'sitsmart.v2',
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
};

test('onboarding → calibration → monitoring detects bad posture and recovery', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const started = Date.now();
  const elapsed = () => Math.round((Date.now() - started) / 1000);
  await seedSettings(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'はじめる' }).click();
  const enable = page.getByRole('button', { name: 'カメラを有効にする' });
  if (await enable.isVisible().catch(() => false)) await enable.click();

  // 顔・両肩・正面のチェックがそろうと次へ進める
  const next = page.getByRole('button', { name: '次へ：基準姿勢を記録' });
  await expect(next).toBeEnabled({ timeout: 120_000 });
  console.log(`[e2e] setup ready at ${elapsed()}s`);
  await next.click();

  await page.getByRole('button', { name: '記録を開始' }).click();
  await expect(page.getByText('基準姿勢を記録しました')).toBeVisible({
    timeout: 30_000,
  });
  console.log(`[e2e] calibrated at ${elapsed()}s`);

  const status = page.locator('section[aria-live="polite"]').first();
  await expect(status).toContainText('良い姿勢', { timeout: 20_000 });

  const baseline = JSON.parse(
    (await page.evaluate(() => localStorage.getItem('sitsmart.v2'))) ?? '{}'
  );
  expect(baseline.state.baseline.scaleRatio).toBeGreaterThan(0);

  // 映像が悪い姿勢の区間に入ると、通知（トースト）と崩れ方の表示が出る
  const toast = page.getByRole('status').filter({ hasText: '姿勢をチェック' });
  await expect(toast).toBeVisible({ timeout: 110_000 });
  const toastText = await toast.innerText();
  console.log(
    `[e2e] alert at ${elapsed()}s: ${toastText.replace(/\s+/g, ' ')}`
  );
  expect(toastText).toMatch(/首猫背|ストレートネック|猫背/);

  const forward = await page
    .getByText('頭の前方突出')
    .locator('xpath=../..')
    .innerText();
  console.log(`[e2e] metrics: ${forward.replace(/\s+/g, ' ')}`);

  // 基準姿勢に戻ると回復表示
  await expect(
    page.getByRole('status').filter({ hasText: 'いい姿勢に戻りました' })
  ).toBeVisible({ timeout: 80_000 });
  console.log(`[e2e] recovered at ${elapsed()}s`);

  // 統計が保存されている
  await expect
    .poll(
      async () => {
        const s = JSON.parse(
          (await page.evaluate(() => localStorage.getItem('sitsmart.v2'))) ??
            '{}'
        );
        return s.state.history?.[0]?.alerts ?? 0;
      },
      { timeout: 15_000 }
    )
    .toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test('welcome renders the 3D demo without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seedSettings(page);
  await page.goto('/');
  await expect(
    page.getByRole('img', { name: '横から見たあなたの姿勢' })
  ).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(errors).toEqual([]);
});
