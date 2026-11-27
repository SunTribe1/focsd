import { expect, settle, test } from './fixtures/test.js';

// `autosize` grows the textarea with its content (CSS field-sizing), from `rows` up to `max-rows`, then
// scrolls. Engines without field-sizing keep the fixed `rows` height and the manual resize handle.
const fieldSizing = (page) => page.evaluate(() => CSS.supports('field-sizing', 'content'));

test.beforeEach(async ({ page }) => {
  await page.goto('/forms.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-textarea')));
  await page.evaluate(async () => {
    const el = document.createElement('focsd-textarea');
    el.id = 'grow';
    el.label = 'Grows';
    el.rows = 2;
    el.setAttribute('autosize', '');
    el.setAttribute('max-rows', '5');
    document.querySelector('main').append(el);
    await el.updateComplete;
  });
});

const height = (page) =>
  page
    .locator('#grow')
    .getByRole('textbox')
    .evaluate((t) => t.getBoundingClientRect().height);

test('autosize grows with the text and stops at max-rows', async ({ page }) => {
  test.skip(!(await fieldSizing(page)), 'no field-sizing');
  const box = page.locator('#grow').getByRole('textbox');
  const start = await height(page);
  await box.fill('one\ntwo\nthree\nfour');
  await expect.poll(() => height(page)).toBeGreaterThan(start * 1.5);
  const four = await height(page);
  await box.fill('1\n2\n3\n4\n5\n6\n7\n8\n9\n10');
  await expect.poll(() => height(page)).toBeGreaterThan(four);
  const capped = await height(page);
  await box.fill('1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12\n13\n14');
  await settle(page);
  expect(await height(page)).toBe(capped);
  expect(await box.evaluate((t) => t.scrollHeight > t.clientHeight)).toBe(true);
});

test('autosize never shrinks below rows', async ({ page }) => {
  test.skip(!(await fieldSizing(page)), 'no field-sizing');
  const start = await height(page);
  await page.locator('#grow').getByRole('textbox').fill('');
  await settle(page);
  expect(await height(page)).toBeGreaterThanOrEqual(start - 1);
});

test('without field-sizing, an autosize textarea can still be resized by hand', async ({ page }) => {
  test.skip(await fieldSizing(page), 'field-sizing grows it instead');
  const box = page.locator('#grow').getByRole('textbox');
  expect(await box.evaluate((t) => getComputedStyle(t).resize)).toBe('vertical');
});

// Every engine Playwright ships may support field-sizing, so the rule's guard is checked directly too.
test('the autosize rules apply only where field-sizing is supported', async ({ page }) => {
  const guards = await page.locator('#grow').evaluate((el) => {
    const walk = (rules) => [...rules].flatMap((r) => [r, ...(r.cssRules ? walk(r.cssRules) : [])]);

    return el.shadowRoot.adoptedStyleSheets
      .flatMap((sheet) => walk(sheet.cssRules))
      .flatMap((r) =>
        r.selectorText?.includes(':host([autosize])') && r.style?.resize === 'none' ? [r.parentRule?.conditionText ?? null] : [],
      );
  });

  expect(guards.length).toBeGreaterThan(0);

  for (const guard of guards) expect(guard).toMatch(/field-sizing:\s*content/);
});
