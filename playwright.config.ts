import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.E2E_PORT ?? 3011);

function resolveFakeVideo(): string {
  if (process.env.E2E_FAKE_VIDEO) return process.env.E2E_FAKE_VIDEO;
  const local = path.resolve(__dirname, 'tests/e2e/fixtures/posture.mjpeg');
  if (fs.existsSync(local)) return local;
  try {
    const commonDir = execSync('git rev-parse --path-format=absolute --git-common-dir', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const mainRepo = path.dirname(commonDir);
    const mainFixture = path.resolve(mainRepo, 'tests/e2e/fixtures/posture.mjpeg');
    if (fs.existsSync(mainFixture)) return mainFixture;
  } catch {
    // ignore
  }
  return local;
}

const fakeVideo = resolveFakeVideo();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        permissions: ['camera'],
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            `--use-file-for-fake-video-capture=${fakeVideo}`,
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
        },
      },
    },
  ],
  webServer: {
    command: `npm run build && node tests/e2e/serve-out.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
