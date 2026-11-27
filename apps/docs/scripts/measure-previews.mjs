/**
 * Measures the settled height of every component example so the docs can reserve it up front
 * (no layout shift when the elements upgrade). Run after `astro build`:
 *   node scripts/measure-previews.mjs
 * Writes src/data/preview-heights.json. e2e/stability.spec.js fails when it drifts.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { components } from '../src/data/catalogue.js';
import { waitForServer } from './lib/wait-for-server.mjs';

// MEASURE_PORT picks another port when 4323 is taken (for example by a sandbox preview).
const PORT = Number(process.env.MEASURE_PORT) || 4323;
const WIDTHS = [1440, 390];
const GUIDES = ['/guides/data-grid/', '/guides/patterns/', '/guides/charts/'];
const VIEWPORT_HEIGHT = 900;

/** Time for an upgraded element to settle after it is defined (reduced motion is on). */
const SETTLE_MS = 250;

/** The guide pages hold many examples (a data grid among them): give them longer. */
const GUIDE_SETTLE_MS = 600;

// Vite's static server stays in the foreground (Astro 7's preview detaches without a TTY).
const server = spawn('npx', ['vite', 'preview', '--outDir', 'dist', '--strictPort', '--port', String(PORT)], {
  stdio: 'ignore',
  detached: true,
});

server.on('error', (error) => {
  console.error(`Could not start the preview server (is npx installed?): ${error.message}`);
  process.exit(1);
});

const base = `http://localhost:${PORT}`;
const heights = {};

/**
 * Runs in the page: the settled height of every example's preview, as [slug, px] pairs. Each
 * preview is measured with its reserved minimum height removed, then restored. An example with no
 * preview (a framed one) measures 0.
 * @returns {[string, number][]}
 */
function measureExamples() {
  return [...document.querySelectorAll('[data-example][data-slug]')].map((example) => {
    const preview = example.querySelector('.focsd-example-preview');

    if (!preview) return [example.dataset.slug, 0];
    const was = preview.style.minBlockSize;
    preview.style.minBlockSize = '0px';
    const value = preview.getBoundingClientRect().height;
    preview.style.minBlockSize = was;

    return [example.dataset.slug, Math.ceil(value)];
  });
}

/** Record the measured heights of one page at one viewport width. */
function record(measured, width, only) {
  for (const [slug, h] of measured) {
    // A component page's own examples: the main one and its further ones (`<slug>-<id>`).
    if (only && slug !== only && !slug.startsWith(`${only}-`)) continue;
    heights[slug] ??= {};
    heights[slug][width] = h;
  }
}

let browser;

try {
  await waitForServer(base);
  browser = await chromium.launch();

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: VIEWPORT_HEIGHT }, reducedMotion: 'reduce' });

    for (const c of components) {
      await page.goto(`${base}/components/${c.slug}/`);
      await page.waitForFunction((tag) => customElements.get(tag), c.tag);
      await page.waitForTimeout(SETTLE_MS);

      record(await page.evaluate(measureExamples), width, c.slug);
      heights[c.slug] ??= {};
      heights[c.slug][width] ??= 0;
    }

    // Guide pages: every example on the page, keyed by its slug.
    for (const path of GUIDES) {
      await page.goto(`${base}${path}`);
      await page.waitForFunction(() => customElements.get('focsd-data-grid'));
      await page.waitForTimeout(GUIDE_SETTLE_MS);

      record(await page.evaluate(measureExamples), width);
    }

    await page.close();
  }
} finally {
  await browser?.close();
  // Kill the whole process group: npx would otherwise leave the server running.
  process.kill(-server.pid);
}

const out = Object.fromEntries(Object.entries(heights).map(([slug, byWidth]) => [slug, { desktop: byWidth[1440], mobile: byWidth[390] }]));

writeFileSync(new URL('../src/data/preview-heights.json', import.meta.url), `${JSON.stringify(out, null, 2)}\n`);

console.log(`Measured ${Object.keys(out).length} examples.`);
