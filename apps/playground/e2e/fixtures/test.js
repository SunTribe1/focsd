/**
 * The Playwright `test` every spec uses. With COVERAGE=1, Chromium records the JavaScript each
 * test runs, so `pnpm coverage` can report which component code the end-to-end tests exercise.
 */
import { test as base, expect } from '@playwright/test';
import MCR from 'monocart-coverage-reports';
import { coverageOptions } from './coverage-options.js';

const enabled = Boolean(process.env.COVERAGE);

/**
 * Lit's dev-build `change-in-update` warning: an element set a reactive property inside its own
 * update cycle (usually in `updated()` or `firstUpdated()`), which schedules a second render.
 */
const CHANGE_IN_UPDATE = /scheduled an update \(generally because a property was set\) after an update completed/;

/** The tag Lit names in the warning ("Element focsd-select scheduled ..."). */
const ELEMENT_NAME = /Element (\S+) scheduled an update/;

export const test = base.extend({
  /**
   * Opt-out for the change-in-update guard. Leave it off: set it with
   * `test.use({ allowChangeInUpdate: true })` only when a second render is truly unavoidable, and
   * write next to it why (for example, a test that deliberately sets properties from `updated()`).
   */
  allowChangeInUpdate: [false, { option: true }],

  /**
   * Fails a test, after it runs, when any element logged Lit's change-in-update warning (audit F1),
   * listing each element and how many times it warned (Lit logs it once per element and page). Compute derived values in `willUpdate()`
   * instead of setting reactive properties after an update.
   */
  guardChangeInUpdate: [
    async ({ context, allowChangeInUpdate }, use) => {
      /** @type {Map<string, number>} */
      const counts = new Map();

      /** @param {import('@playwright/test').ConsoleMessage} message */
      const onConsole = (message) => {
        const text = message.text();

        if (!CHANGE_IN_UPDATE.test(text)) return;
        const name = ELEMENT_NAME.exec(text)?.[1] ?? '(unknown element)';

        counts.set(name, (counts.get(name) ?? 0) + 1);
      };

      context.on('console', onConsole);
      await use();
      context.off('console', onConsole);

      if (allowChangeInUpdate || counts.size === 0) return;
      const list = [...counts].map(([name, count]) => `${name} (${count})`).join(', ');

      throw new Error(`Lit change-in-update warning from: ${list}. Set derived values in willUpdate(), not updated() or firstUpdated().`);
    },
    { auto: true },
  ],

  recordCoverage: [
    async ({ page, browserName }, use) => {
      const on = enabled && browserName === 'chromium';

      if (on) await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await use();

      if (!on) return;
      // A test that closed its page (or navigated it away) has nothing to report.
      const entries = await page.coverage.stopJSCoverage().catch(() => []);

      if (Array.isArray(entries) && entries.length) await MCR(coverageOptions).add(entries);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Wait until every named custom element is defined (m70: the one readiness wait the specs share).
 * @param {import('@playwright/test').Page} page
 * @param {...string} tags
 */
export const ready = (page, ...tags) => page.waitForFunction((names) => names.every((name) => customElements.get(name)), tags);

/**
 * The element with this id: a demo page's component host (the grid pages use `#invoices`).
 * @param {import('@playwright/test').Page} page
 * @param {string} [id]
 */
export const host = (page, id = 'invoices') => page.locator(`#${id}`);

/**
 * Let the page settle without sleeping (Q42): two animation frames, so pending microtasks, mutation
 * observers, Lit updates and layout have all run. Use it before asserting that something did NOT
 * happen; use `expect.poll` or a web-first assertion when waiting for something that will.
 * @param {import('@playwright/test').Page} page
 */
export const settle = (page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
