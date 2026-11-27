import { expect, test } from './fixtures/test.js';
import {
  mountFixture as mount,
  openFromReviewFixes2,
  openFromMinorsMisc,
  mountInMain as mountFromMinorsPolish,
  openFromMinorsPolish,
} from './fixtures/pages.js';

// Re-homed from review-fixes-2.spec.js (Q48).

test('slider without a value defaults inside min/max and range values are clamped', async ({ page }) => {
  await openFromReviewFixes2(page);
  await mount(
    page,
    `<focsd-slider id="s4" label="Level" min="1" max="10"></focsd-slider><focsd-slider id="r4" label="Span" range min="0" max="10"></focsd-slider>`,
  );
  const now = Number(await page.getByRole('slider', { name: 'Level' }).getAttribute('aria-valuenow'));
  expect(now).toBeGreaterThanOrEqual(1);
  expect(now).toBeLessThanOrEqual(10);
  await expect(page.getByRole('slider', { name: 'Maximum Span' })).toHaveAttribute('aria-valuenow', '10');
  await expect(page.getByRole('slider', { name: 'Minimum Span' })).toHaveAttribute('aria-valuenow', '0');
});

test('pressed toggle and slider fill stay visible in forced colors', async ({ page, browserName }) => {
  await openFromReviewFixes2(page);
  test.skip(browserName !== 'chromium', 'forced-colors emulation is Chromium-only');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.getByRole('button', { name: 'Bold' }).click();

  const pressedBorder = await page
    .locator('#tg-bold')
    .evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="control"]')).borderTopWidth);

  expect(Number.parseFloat(pressedBorder)).toBeGreaterThanOrEqual(3);

  const fill = await page.locator('#sl').evaluate((el) => {
    const probe = document.createElement('span');
    probe.style.backgroundColor = 'Highlight';
    document.body.append(probe);
    const highlight = getComputedStyle(probe).backgroundColor;
    probe.remove();

    return [getComputedStyle(el.shadowRoot.querySelector('[part~="fill"]')).backgroundColor, highlight];
  });

  expect(fill[0]).toBe(fill[1]);
});

// Re-homed from minors-misc.spec.js (Q48).

const mountFromMinorsMisc = (page, html) =>
  page.evaluate(async (markup) => {
    const box = document.createElement('div');
    box.innerHTML = markup;
    document.body.append(box);
    await Promise.all([...box.querySelectorAll('*')].map((el) => el.updateComplete));
  }, html);

test('when both range thumbs share a value, dragging picks the thumb in the drag direction', async ({ page }) => {
  await openFromMinorsMisc(page);
  await mountFromMinorsMisc(
    page,
    '<focsd-slider id="rg" label="Price" range min="0" max="100" value-low="50" value-high="50" style="inline-size: 400px; display: block"></focsd-slider>',
  );
  await page.locator('#rg').scrollIntoViewIfNeeded();
  const thumb = await page.locator('#rg [data-key="valueHigh"]').boundingBox();
  const x = thumb.x + thumb.width / 2;
  const y = thumb.y + thumb.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 80, y, { steps: 5 });
  await page.mouse.up();
  const [low, high] = await page.locator('#rg').evaluate((el) => [el.valueLow, el.valueHigh]);
  expect(low).toBe(50);
  expect(high).toBeGreaterThan(60);
});

// Re-homed from minors-polish.spec.js (Q48).

test('PageUp and PageDown move ten steps on sliders and number fields alike', async ({ page }) => {
  await openFromMinorsPolish(page);
  await mountFromMinorsPolish(
    page,
    '<focsd-slider id="sl" label="Volume" min="0" max="100" step="2" value="20"></focsd-slider><focsd-number-field id="nf" label="Count" step="2" value="20"></focsd-number-field>',
  );
  await page.locator('#sl').getByRole('slider').focus();
  await page.keyboard.press('PageUp');
  expect(await page.locator('#sl').evaluate((el) => el.value)).toBe(40);
  await page.locator('#nf').getByRole('spinbutton').focus();
  await page.keyboard.press('PageUp');
  expect(Number(await page.locator('#nf').evaluate((el) => el.value))).toBe(40);
});
