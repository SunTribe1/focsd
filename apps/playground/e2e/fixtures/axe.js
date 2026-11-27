import AxeBuilder from '@axe-core/playwright';
import { expect } from './test.js';

export const THEMES = ['light', 'dark', 'contrast'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Set the theme before the page's first paint. An init script runs before the parser creates
 * <html>, so `document.documentElement` is often still null there (the setAttribute call threw
 * and every page silently fell back to the light theme); wait for the element in that case.
 */
export async function addThemeInitScript(page, theme) {
  await page.addInitScript((t) => {
    const apply = () => document.documentElement?.setAttribute('data-focsd-theme', t);

    if (document.documentElement) {
      apply();

      return;
    }

    const observer = new MutationObserver(() => {
      if (!document.documentElement) return;
      apply();
      observer.disconnect();
    });

    observer.observe(document, { childList: true });
  }, theme);
}

/** Open a page with the theme set before load (switching later would animate colors). */
export async function gotoInTheme(page, path, theme, readyTag) {
  await addThemeInitScript(page, theme);
  await page.goto(path);
  await page.waitForFunction((tag) => customElements.get(tag), readyTag);
  await page.evaluate(() => document.fonts.ready);
  await expectTheme(page, theme);
}

/** Guard: the page really is in the requested theme (a lost attribute silently falls back to light). */
export async function expectTheme(page, theme) {
  await expect(page.locator('html')).toHaveAttribute('data-focsd-theme', theme);
}

export async function expectAxeClean(page) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}
