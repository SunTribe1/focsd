import { defineConfig, devices } from '@playwright/test';

/** Specs that need a real browser WebMCP. */
const NATIVE = /webmcp-native\.spec\.js/;

/** The landing page and "Ask the docs", which also run in Firefox and WebKit. */
const LANDING = /(landing|landing-motion|ask-the-docs)\.spec\.js/;

export default defineConfig({
  testDir: './e2e',
  reporter: 'list',
  // A stray test.only would skip the rest of the suite and still pass CI.
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: 'http://localhost:4322', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    {
      // Serve dist with Vite's foreground static server: Astro 7's `astro preview` detaches without a TTY.
      command: 'pnpm --dir ../.. exec turbo run build --filter=@focsd-dev/docs && pnpm serve:dist --port 4322',
      url: 'http://localhost:4322',
      reuseExistingServer: !process.env.CI,
      timeout: 300000,
    },
    {
      // A build with the CodePen/StackBlitz buttons forced on (they appear for real once published).
      command:
        'pnpm --dir ../.. exec turbo run build --filter=@focsd-dev/docs && FOCSD_SANDBOXES=1 pnpm exec astro build --outDir dist-sandboxes && pnpm exec vite preview --outDir dist-sandboxes --strictPort --port 4323',
      url: 'http://localhost:4323',
      reuseExistingServer: !process.env.CI,
      timeout: 300000,
    },
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: [NATIVE, /sandboxes\.spec/] },
    { name: 'sandboxes', use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4323' }, testMatch: /sandboxes\.spec/ },
    // The landing, the bot and the components gallery in the other two engines (Chromium runs everything above).
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testMatch: [LANDING, /gallery\.spec/] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testMatch: [/smoke/, LANDING, /gallery\.spec/] },
    // Google Chrome with its own WebMCP turned on; the specs skip when this Chrome has none.
    {
      name: 'chrome-webmcp',
      testMatch: NATIVE,
      use: { ...devices['Desktop Chrome'], channel: 'chrome', launchOptions: { args: ['--enable-features=WebMCPTesting'] } },
    },
  ],
});
