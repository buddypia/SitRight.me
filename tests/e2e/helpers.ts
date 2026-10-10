import { expect, type Page } from '@playwright/test';

export const seedSettings = async (page: Page) => {
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
};

export const calibrate = async (page: Page) => {
  await page.getByRole('button', { name: 'はじめる' }).click();
  const enable = page.getByRole('button', { name: 'カメラを有効にする' });

  // 顔・両肩・正面のチェックがそろうと次へ進める
  const next = page.getByRole('button', { name: '次へ：基準姿勢を記録' });
  const record = page.getByRole('button', { name: '記録を開始' });
  // 推定が遅い環境ではチェックが一瞬外れてクリックが空振りすることがあるので、進むまで押し直す。
  // カメラは自動で起動することもあり、そのあいだ「カメラを有効にする」は一瞬だけ無効で表示される
  await expect(async () => {
    if (await enable.isVisible())
      await enable.click({ timeout: 1_000 }).catch(() => undefined);
    await expect(next).toBeEnabled({ timeout: 2_000 });
    await next.click();
    await expect(record).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 120_000 });
  await record.click();
  await expect(page.getByText('基準姿勢を記録しました')).toBeVisible({
    timeout: 30_000,
  });
};
