import { defineConfig, devices } from '@playwright/test';

/** Specs that need a real browser WebMCP. */
const NATIVE = /webmcp-native\.spec\.js/;

/** Screenshot comparisons: Chromium only, one baseline set per operating system. */
const VISUAL = /visual\.spec\.js/;

const PORT = Number(process.env.FOCSD_PG_PORT ?? 5174);

export default defineConfig({
  testDir: './e2e',
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 } },
  globalSetup: './e2e/fixtures/coverage-setup.js',
  globalTeardown: './e2e/fixtures/coverage-report.js',
  reporter: 'list',
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: {
    command: `pnpm --filter @focsd-dev/tokens build && pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: [NATIVE, VISUAL] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: [NATIVE, VISUAL] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: [NATIVE, VISUAL] },
    {
      name: 'visual',
      testMatch: VISUAL,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 },
    },
    // Google Chrome with its own WebMCP turned on; the specs skip when this Chrome has none.
    {
      name: 'chrome-webmcp',
      testMatch: NATIVE,
      use: { ...devices['Desktop Chrome'], channel: 'chrome', launchOptions: { args: ['--enable-features=WebMCPTesting'] } },
    },
  ],
});
