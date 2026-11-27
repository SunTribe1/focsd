import { expect, test } from './fixtures/test.js';

// Titles balance their lines and body text avoids single-word last lines, where supported.
/** The dialog part's computed text-wrap-style (null until the dialog renders it). */
const wrap = (page, part) =>
  page.evaluate((p) => {
    const node = document.querySelector('#dlg')?.shadowRoot?.querySelector(`[part~="${p}"]`);

    return node ? getComputedStyle(node).textWrapStyle : null;
  }, part);

/** Open the index and skip when the engine lacks this text-wrap-style value. */
const openWhereSupported = async (page, value) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-dialog')));
  test.skip(!(await page.evaluate((v) => CSS.supports('text-wrap-style', v), value)), `no text-wrap-style: ${value}`);
};

test('headlines balance', async ({ page }) => {
  await openWhereSupported(page, 'balance');
  await expect.poll(() => wrap(page, 'headline')).toBe('balance');
});

test('body text wraps pretty', async ({ page }) => {
  await openWhereSupported(page, 'pretty');
  await expect.poll(() => wrap(page, 'body')).toBe('pretty');
});
