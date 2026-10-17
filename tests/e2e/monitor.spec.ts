import { expect, test } from '@playwright/test';
import { calibrate, seedSettings } from './helpers';

/**
 * 偽カメラ映像（tests/e2e/fixtures/generate.sh で生成）を使った通しテスト。
 * 映像: 0-75s 基準姿勢 → 75-105s 頭が前下方へ（首猫背）→ 105-130s 基準姿勢 のループ。
 * 読み込みが遅い環境でも基準姿勢の記録が悪い姿勢の区間に重ならないよう、最初の区間を長めにしている。
 * GPU の無い環境（SwiftShader）では推定が遅いため、時間に余裕を持たせている。
 */

test('onboarding → calibration → monitoring detects bad posture and recovery', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 外部への通信が一切成功しないこと
  const external: string[] = [];
  page.on('response', (r) => {
    const url = new URL(r.url());
    // data: と blob:（GLB に埋め込んだテクスチャの読み込み）はブラウザ内で完結する
    if (
      !['localhost', '127.0.0.1'].includes(url.hostname) &&
      !['data:', 'blob:'].includes(url.protocol)
    )
      external.push(r.url());
  });
  const started = Date.now();
  const elapsed = () => Math.round((Date.now() - started) / 1000);
  await seedSettings(page);
  await page.goto('/');

  await calibrate(page);
  console.log(`[e2e] calibrated at ${elapsed()}s`);

  await expect(page.getByRole('heading', { name: '良い姿勢' })).toBeVisible({
    timeout: 20_000,
  });

  const baseline = JSON.parse(
    (await page.evaluate(() => localStorage.getItem('sitright.v2'))) ?? '{}'
  );
  expect(baseline.state.baseline.scaleRatio).toBeGreaterThan(0);

  // 回復の通知は 3 秒で消える。SwiftShader では警告の読み取りとスクリーンショットに
  // 10 秒前後かかり、その間に出て消えると見逃すため、表示されたことをページ内で記録しておく
  await page.evaluate(() => {
    const w = window as unknown as { __recoveredShown?: boolean };
    const observer = new MutationObserver(() => {
      if (
        [...document.querySelectorAll('[role="status"]')].some((el) =>
          /良い姿勢に戻りました|いい姿勢に戻りました/.test(el.textContent ?? '')
        )
      ) {
        w.__recoveredShown = true;
        observer.disconnect();
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });

  // 映像が悪い姿勢の区間に入ると、崩れ方の名前を付けた通知（トースト）が出る
  const toast = page
    .getByRole('status')
    .filter({ hasText: /首猫背|ストレートネック|猫背/ });
  await expect(toast).toBeVisible({ timeout: 110_000 });
  const toastText = await toast.innerText();
  console.log(
    `[e2e] alert at ${elapsed()}s: ${toastText.replace(/\s+/g, ' ')}`
  );

  const forward = await page
    .getByText('頭の前方突出')
    .locator('xpath=../..')
    .innerText();
  console.log(`[e2e] metrics: ${forward.replace(/\s+/g, ' ')}`);
  // 計測中の画面は CI の artifact（ui-screenshots）で目視確認する
  await page.screenshot({ path: 'test-results/screens/alert-desktop.png' });

  // 基準姿勢に戻ると回復表示
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as unknown as { __recoveredShown?: boolean })
              .__recoveredShown === true
        ),
      { timeout: 80_000 }
    )
    .toBe(true);
  console.log(`[e2e] recovered at ${elapsed()}s`);

  // 統計が保存されている
  await expect
    .poll(
      async () => {
        const s = JSON.parse(
          (await page.evaluate(() => localStorage.getItem('sitright.v2'))) ??
            '{}'
        );
        return s.state.history?.[0]?.alerts ?? 0;
      },
      { timeout: 15_000 }
    )
    .toBeGreaterThan(0);

  expect(errors).toEqual([]);
  expect(external).toEqual([]);

  // CSP（connect-src 'self'）で外部への送信がブラウザに止められる。
  // MediaPipe 1.x が 60 秒ごとに送る利用統計（odml.pa.googleapis.com）もこれで届かない
  const outbound = await page.evaluate(() =>
    fetch('https://odml.pa.googleapis.com/v1/log', { method: 'POST' }).then(
      () => 'sent',
      () => 'blocked'
    )
  );
  expect(outbound).toBe('blocked');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: 'test-results/screens/monitoring-mobile.png',
    fullPage: true,
  });
});

// 静的書き出しのためハイドレーション後に描画される。SwiftShader では 5 秒前後かかる
test('welcome renders the 3D demo without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await seedSettings(page);
  const started = Date.now();
  await page.goto('/');
  const scene = page.getByRole('img', { name: '横から見たあなたの姿勢' });
  await expect(scene).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  // モデルの読み込みが終わるまでの時間を残す（遅くなったら性能の退行として扱う）
  await expect(scene).toHaveAttribute('aria-busy', 'false', {
    timeout: 120_000,
  });
  console.log(
    `[e2e] avatar ready at ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
  await expect(page.getByText('3Dモデルの読み込みに失敗しました')).toHaveCount(0);
  expect(errors).toEqual([]);
});
