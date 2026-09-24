import { defineConfig } from '@playwright/test';

const channel = (process.env.PLAYWRIGHT_CHANNEL ?? 'chrome') as 'chrome' | 'msedge';

export default defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: { animations: 'disabled', maxDiffPixelRatio: 0.02 },
  },
  fullyParallel: false,
  forbidOnly: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
    channel,
    colorScheme: 'dark',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
