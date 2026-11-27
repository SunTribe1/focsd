import { expect, test } from './fixtures/test.js';
import { expectAxeClean } from './fixtures/axe.js';

// Wave 21a: focsd-segmented-control and focsd-segment on segmented.html (Chromium per owner rule).

/** @param {import('@playwright/test').Page} page */
const open = async (page) => {
  await page.goto('/segmented.html');
  await page.waitForFunction(() => window.__ready);
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} id
 */
const valueOf = (page, id) => page.locator(`#${id}`).evaluate((el) => /** @type {any} */ (el).value);

test('is a radiogroup named by its label, with one tab stop on the selected segment', async ({ page }) => {
  await open(page);
  const group = page.getByRole('radiogroup', { name: 'Calendar view' });
  const host = page.locator('#view');

  await expect(group).toBeVisible();
  await expect(host.getByRole('radio')).toHaveCount(4);
  await expect(host.getByRole('radio', { name: 'Week' })).toBeChecked();
  await expect(host.getByRole('radio', { name: 'Week' })).toHaveAttribute('tabindex', '0');
  await expect(host.getByRole('radio', { name: 'Day' })).toHaveAttribute('tabindex', '-1');
  await expect(group).toHaveAccessibleDescription(/Changes the calendar at once/);
});

test('APG radio keys: arrows select (skipping disabled, wrapping), Home and End', async ({ page }) => {
  await open(page);
  // The radios are slotted: find them from the host (a role query does not cross the slot).
  const group = page.locator('#view');

  await group.getByRole('radio', { name: 'Week' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(group.getByRole('radio', { name: 'Year' })).toBeFocused();
  await expect(group.getByRole('radio', { name: 'Year' })).toBeChecked();
  expect(await valueOf(page, 'view')).toBe('year');
  await page.keyboard.press('ArrowDown');
  await expect(group.getByRole('radio', { name: 'Day' })).toBeChecked();
  await page.keyboard.press('ArrowUp');
  await expect(group.getByRole('radio', { name: 'Year' })).toBeChecked();
  await page.keyboard.press('Home');
  await expect(group.getByRole('radio', { name: 'Day' })).toBeFocused();
  await expect(group.getByRole('radio', { name: 'Day' })).toBeChecked();
  await page.keyboard.press('End');
  await expect(group.getByRole('radio', { name: 'Year' })).toBeChecked();
  // Tab leaves the group from its one tab stop.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: 'Monthly' })).toBeFocused();
});

test('arrows are mirrored in RTL', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('radiogroup', { name: 'Shift' })).toBeVisible();
  const group = page.locator('#rtl');

  await group.getByRole('radio', { name: 'Noon' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(group.getByRole('radio', { name: 'Night' })).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(group.getByRole('radio', { name: 'Morning' })).toBeChecked();
});

test('fires input then change once per selection', async ({ page }) => {
  await open(page);
  await page.locator('#view').evaluate((el) => {
    window.__events = [];

    for (const type of ['input', 'change']) el.addEventListener(type, () => window.__events.push(type));
  });
  await page.getByRole('radio', { name: 'Day' }).click();
  await page.getByRole('radio', { name: 'Day' }).click();
  expect(await page.evaluate(() => window.__events)).toEqual(['input', 'change']);
});

test('submits its value; required blocks submit until a segment is chosen', async ({ page }) => {
  await open(page);
  expect(await page.locator('#form').evaluate((f) => /** @type {HTMLFormElement} */ (f).checkValidity())).toBe(false);
  expect(await page.locator('#plan').evaluate((el) => /** @type {any} */ (el).validity.valueMissing)).toBe(true);
  await page.getByRole('radio', { name: 'Yearly' }).click();
  await page.locator('#submit').click();
  await expect(page.locator('#out')).toHaveText(
    JSON.stringify([
      ['view', 'week'],
      ['billing', 'yearly'],
    ]),
  );
});

test('form reset restores the value attribute', async ({ page }) => {
  await open(page);
  await page.getByRole('radio', { name: 'Day' }).click();
  await page.locator('#form').evaluate((f) => /** @type {HTMLFormElement} */ (f).reset());
  await expect(page.getByRole('radio', { name: 'Week' })).toBeChecked();
});

test('a disabled control has no tab stop and ignores clicks', async ({ page }) => {
  await open(page);
  await page.locator('#view').evaluate(async (el) => {
    el.toggleAttribute('disabled', true);
    await /** @type {any} */ (el).updateComplete;
  });
  await expect(page.locator('#view focsd-segment[tabindex="0"]')).toHaveCount(0);
  // A disabled control's segments are not actionable for Playwright, so dispatch the click.
  await page.getByRole('radio', { name: 'Day' }).dispatchEvent('click');
  expect(await valueOf(page, 'view')).toBe('week');
});

test('the selected segment is not shown by color alone (weight and edge)', async ({ page }) => {
  await open(page);

  const style = (name) =>
    page.getByRole('radio', { name }).evaluate((el) => {
      const s = getComputedStyle(el);

      return { weight: Number(s.fontWeight), edge: s.borderTopColor };
    });

  const [on, off] = [await style('Week'), await style('Day')];

  expect(on.weight).toBeGreaterThan(off.weight);
  expect(on.edge).not.toBe(off.edge);
});

test('segments are at least 44 px tall at every size', async ({ page }) => {
  await open(page);

  for (const id of ['view', 'small', 'layout']) {
    const heights = await page.locator(`#${id} focsd-segment`).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));

    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
  }
});

test('stacks the segments vertically in a narrow container', async ({ page }) => {
  await open(page);
  const boxes = await page.locator('#stacked focsd-segment').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));

  expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height - 1);
  expect(Math.abs(boxes[1].x - boxes[0].x)).toBeLessThanOrEqual(1);
  // The same control in a wide container stays in one row.
  await page.locator('#narrow').evaluate((el) => (el.style.inlineSize = '40rem'));
  await expect
    .poll(() =>
      page.locator('#stacked focsd-segment').evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().y))).size),
    )
    .toBe(1);
});

test('icons are decorative: the label alone names the segment', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('radio', { name: 'List', exact: true })).toBeVisible();
  await expect(page.locator('#layout focsd-segment').first().locator('[part~="icon"]')).toHaveAttribute('aria-hidden', 'true');
});

test('has no axe violations', async ({ page }) => {
  await open(page);
  await expectAxeClean(page);
});

test('segments keep their own height when a parent stretches the control', async ({ page }) => {
  await open(page);

  // A grid parent with spare height stretches its rows (the docs preview and playground cards do this).
  const heights = await page.evaluate(async () => {
    const box = document.createElement('div');
    box.style.cssText = 'display: grid; block-size: 30rem; inline-size: 26rem';
    box.innerHTML =
      '<focsd-segmented-control label="View" value="b" hint="A hint"><focsd-segment value="a">A</focsd-segment><focsd-segment value="b">B</focsd-segment></focsd-segmented-control>';
    document.body.append(box);
    const control = /** @type {any} */ (box.firstElementChild);
    await control.updateComplete;
    const segment = /** @type {HTMLElement} */ (box.querySelector('focsd-segment'));
    const height = segment.getBoundingClientRect().height;
    const controlHeight = Number.parseFloat(getComputedStyle(segment).getPropertyValue('--focsd-control-height')) || 36;

    box.remove();

    return { height, controlHeight };
  });

  expect(heights.height).toBeLessThanOrEqual(heights.controlHeight * 1.5);
});
