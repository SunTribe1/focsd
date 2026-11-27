import { expect, test } from '@playwright/test';

// The Blocks guide: one live preview per block, each with its copy command.

const BLOCKS = ['dashboard', 'settings', 'sign-in', 'empty-app'];

test('the Blocks guide previews every block with its command', async ({ page }) => {
  await page.goto('/guides/blocks/');
  await expect(page.locator('[data-block-preview]')).toHaveCount(4);

  for (const name of BLOCKS) {
    await expect(page.locator(`[data-block-preview="${name}"] iframe`)).toHaveAttribute('src', `/blocks/${name}/`);
    await expect(page.getByText(`npx focsd add block ${name}`, { exact: true }).first()).toBeAttached();
  }
});

for (const name of BLOCKS) {
  test(`the ${name} block page loads its elements without errors`, async ({ page }) => {
    const errors = [];

    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`/blocks/${name}/`);
    await page.waitForFunction(() => customElements.get('focsd-app-shell') || customElements.get('focsd-card'));
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(await page.locator(':not(:defined)').evaluateAll((els) => els.filter((e) => e.localName.includes('-')).length)).toBe(0);
    expect(errors).toEqual([]);
  });
}

// Each preview page loads only its own block's CSS (a block's bare selectors would collide otherwise).
test("the dashboard preview uses the dashboard CSS, not another block's", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/blocks/dashboard/');
  await page.waitForFunction(() => customElements.get('focsd-app-shell'));

  const { pageWidth, bodyDisplay, sheets } = await page.evaluate(() => ({
    pageWidth: document.querySelector('.page').getBoundingClientRect().width,
    bodyDisplay: getComputedStyle(document.body).display,
    sheets: document.querySelectorAll('link[rel="stylesheet"], style').length,
  }));

  expect(pageWidth).toBeGreaterThan(768); // empty-app.css would cap .page at 48rem
  expect(bodyDisplay).toBe('block'); // sign-in.css makes the body a grid
  expect(sheets).toBeGreaterThan(0);
});

test('the sign-in preview keeps its own body grid', async ({ page }) => {
  await page.goto('/blocks/sign-in/');
  await page.waitForFunction(() => customElements.get('focsd-card'));
  expect(await page.evaluate(() => getComputedStyle(document.body).display)).toBe('grid');
});
