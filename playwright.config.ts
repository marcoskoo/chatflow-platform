import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for ChatFlow Platform.
 *
 * Run tests:
 *   npx playwright test                 # all tests
 *   npx playwright test --project=chromium
 *   npx playwright test --ui            # interactive UI mode
 *
 * Tests run against a running dev server (`pnpm dev` on port 3000).
 * For CI, set BASE_URL to the preview URL.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000/api/healthz',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
