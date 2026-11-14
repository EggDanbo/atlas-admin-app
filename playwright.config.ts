import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:5097/app/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'h5-mobile',
      use: {
        channel: 'chrome',
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    },
  ],
  webServer: {
    command: 'BROWSER=none NODE_OPTIONS=--max-old-space-size=2048 ./node_modules/.bin/taro build --type h5 --watch',
    url: 'http://127.0.0.1:5097/app/',
    reuseExistingServer: true,
    timeout: 240_000,
  },
})
