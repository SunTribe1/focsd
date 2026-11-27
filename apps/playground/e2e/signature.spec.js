import { expect, test } from './fixtures/test.js';
import { expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { pressTab } from './fixtures/keys.js';

// focsd-signature-pad (wave 21c): drawing, the typed alternative (WCAG 2.1.1, 2.5.7), Clear and
// Undo, the PNG form value, required, forced colors and high-DPI.

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const pad = (page, id = 'pad') => page.locator(`#${id}`);
const canvas = (page, id = 'pad') => pad(page, id).getByRole('img');

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/signature.html');
  await page.waitForFunction(() => window.__ready === true);
});

/** Draw a stroke across the canvas with the mouse, from (x1, y1) to (x2, y2) in canvas pixels. */
async function draw(page, [x1, y1, x2, y2], id = 'pad') {
  const box = await canvas(page, id).boundingBox();
  await page.mouse.move(box.x + x1, box.y + y1);
  await page.mouse.down();
  await page.mouse.move(box.x + (x1 + x2) / 2, box.y + (y1 + y2) / 2, { steps: 4 });
  await page.mouse.move(box.x + x2, box.y + y2, { steps: 4 });
  await page.mouse.up();
  await pad(page, id).evaluate((el) => el.updateComplete);
}

/** The form's entries: files as { name, type, size }. */
const formEntries = (page) =>
  page.locator('#sign-form').evaluate(async (form) => {
    await form.querySelector('focsd-signature-pad').updateComplete;

    return [...new FormData(form)].map(([key, v]) => [key, v instanceof File ? { name: v.name, type: v.type, size: v.size } : v]);
  });

test('drawing with the mouse gives a PNG file in the form data', async ({ page }) => {
  await expect(canvas(page)).toHaveAccessibleName('Signature, empty');
  expect(await formEntries(page)).toEqual([]);
  await draw(page, [20, 30, 200, 90]);

  await expect(canvas(page)).toHaveAccessibleName('Signature, signed');
  const entries = await formEntries(page);
  expect(entries).toHaveLength(1);
  expect(entries[0][0]).toBe('signature');
  expect(entries[0][1]).toMatchObject({ name: 'signature.png', type: 'image/png' });
  expect(entries[0][1].size).toBeGreaterThan(100);
  await expectAnnounced(page, 'Signature added');
});

test('input fires at each stroke end, change when the pointer leaves', async ({ page }) => {
  await pad(page).evaluate((el) => {
    window.__events = [];

    for (const type of ['input', 'change']) el.addEventListener(type, () => window.__events.push(type));
  });
  await draw(page, [20, 30, 120, 60]);
  await draw(page, [40, 70, 160, 40]);
  expect(await page.evaluate(() => window.__events)).toEqual(['input', 'input']);
  await page.mouse.move(0, 0);
  await expect.poll(() => page.evaluate(() => window.__events)).toEqual(['input', 'input', 'change']);
});

test('the typed mode works by keyboard alone and notes typed in the form', async ({ page }) => {
  await page.locator('#sign-form').evaluate((form) => form.closest('section').querySelector('h2').setAttribute('tabindex', '-1'));
  await page.locator('#sign-heading').focus();
  await pressTab(page);
  await expect(pad(page).getByRole('button', { name: 'Type instead' })).toBeFocused();
  await page.keyboard.press('Enter');

  const field = pad(page).getByRole('textbox', { name: 'Type your name for Signature' });
  await expect(field).toBeFocused();
  // The hint is on the group only, so it is read once when focus enters, not again for each part.
  await expect(field).not.toHaveAccessibleDescription(/Draw with a mouse/);
  await expect(pad(page).getByRole('group', { name: 'Signature' })).toHaveAccessibleDescription(/Draw with a mouse, finger or pen/);
  await page.keyboard.type('Ada Lovelace');
  await expect(canvas(page)).toHaveAccessibleName('Signature, signed');
  await expect(pad(page).getByRole('button', { name: 'Undo' })).toHaveCount(0);

  const entries = await formEntries(page);
  expect(entries.map(([key]) => key)).toEqual(['signature', 'signature-typed']);
  expect(entries[0][1]).toMatchObject({ name: 'signature.png', type: 'image/png' });
  expect(entries[1][1]).toBe('true');
  expect(await pad(page).evaluate((el) => el.toSVG())).toMatch(/<text [^>]*font-style="italic"[^>]*>Ada Lovelace<\/text>/);

  // Back to drawing, by keyboard: the mode button keeps focus.
  await pressTab(page);
  await expect(pad(page).getByRole('button', { name: 'Draw instead' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(pad(page).getByRole('button', { name: 'Type instead' })).toBeFocused();
  await expect(canvas(page)).toHaveAccessibleName('Signature, empty');
});

test('Clear empties the value and required blocks submit', async ({ page }) => {
  expect(await pad(page).evaluate((el) => [el.checkValidity(), el.validity.valueMissing])).toEqual([false, true]);
  expect(await pad(page).evaluate((el) => el.validationMessage)).toBe('Add your signature.');
  await draw(page, [20, 30, 200, 90]);
  expect(await pad(page).evaluate((el) => el.checkValidity())).toBe(true);

  await pad(page).getByRole('button', { name: 'Clear' }).click();
  await expect(canvas(page)).toHaveAccessibleName('Signature, empty');
  await expectAnnounced(page, 'Signature cleared');
  await expect(pad(page).getByRole('button', { name: 'Type instead' })).toBeFocused();
  expect(await formEntries(page)).toEqual([]);
  expect(await pad(page).evaluate((el) => el.validity.valueMissing)).toBe(true);

  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toHaveText('');
});

test('a signed pad submits with the form', async ({ page }) => {
  await draw(page, [20, 30, 200, 90]);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toHaveText(/^signature: signature\.png \(image\/png, \d+ B\)$/);
});

test('Undo removes the last stroke; the methods give PNG and SVG', async ({ page }) => {
  await draw(page, [20, 30, 120, 60]);
  await draw(page, [40, 90, 200, 40]);
  const paths = () => pad(page).evaluate((el) => (el.toSVG().match(/M/g) ?? []).length);
  expect(await paths()).toBe(2);

  await pad(page).getByRole('button', { name: 'Undo' }).click();
  expect(await paths()).toBe(1);
  expect(await pad(page).evaluate((el) => el.toDataURL())).toMatch(/^data:image\/png;base64,/);

  await pad(page).getByRole('button', { name: 'Undo' }).click();
  await expect(pad(page).getByRole('button', { name: 'Undo' })).toBeDisabled();
  await expect(pad(page).getByRole('button', { name: 'Type instead' })).toBeFocused();
  expect(await pad(page).evaluate((el) => [el.toSVG(), el.toDataURL()])).toEqual(['', '']);
});

test('no PNG is made while the pointer moves, only when the stroke ends', async ({ page }) => {
  await page.evaluate(() => {
    window.__png = 0;

    for (const method of ['toDataURL', 'toBlob']) {
      const original = HTMLCanvasElement.prototype[method];
      HTMLCanvasElement.prototype[method] = function (...args) {
        window.__png += 1;

        return original.apply(this, args);
      };
    }
  });
  const box = await canvas(page).boundingBox();
  await page.mouse.move(box.x + 20, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 90, { steps: 40 });
  expect(await page.evaluate(() => window.__png)).toBe(0);
  await page.mouse.up();
  expect(await page.evaluate(() => window.__png)).toBe(1);
});

test('a submit straight after the last stroke carries the signature', async ({ page }) => {
  const box = await canvas(page).boundingBox();
  await page.mouse.move(box.x + 20, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 90, { steps: 4 });
  await page.mouse.up();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toHaveText(/signature\.png/);
});

test('a submit straight after typing carries the typed signature', async ({ page }) => {
  await pad(page).getByRole('button', { name: 'Type instead' }).click();
  await page.keyboard.type('Ada');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toHaveText(/signature: signature\.png .*signature-typed: true/);
});

test('form reset returns to the drawing mode', async ({ page }) => {
  await pad(page).getByRole('button', { name: 'Type instead' }).click();
  await page.keyboard.type('Ada');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(pad(page).getByRole('button', { name: 'Type instead' })).toBeVisible();
  await expect(canvas(page)).toHaveAccessibleName('Signature, empty');
});

test('Clear in typed mode also empties the drawing', async ({ page }) => {
  await draw(page, [20, 30, 200, 90]);
  await pad(page).getByRole('button', { name: 'Type instead' }).click();
  await page.keyboard.type('Ada');
  await pad(page).getByRole('button', { name: 'Clear' }).click();
  await pad(page).getByRole('button', { name: 'Draw instead' }).click();
  await expect(canvas(page)).toHaveAccessibleName('Signature, empty');
});

test('form reset clears the drawing', async ({ page }) => {
  await draw(page, [20, 30, 200, 90]);
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(canvas(page)).toHaveAccessibleName('Signature, empty');
  expect(await formEntries(page)).toEqual([]);
});

test('a disabled pad ignores drawing and its buttons', async ({ page }) => {
  await draw(page, [20, 30, 200, 90], 'off');
  await expect(canvas(page, 'off')).toHaveAccessibleName('Approver, empty');
  await expect(pad(page, 'off').getByRole('button', { name: 'Type instead' })).toBeDisabled();
});

test('the canvas takes pointer input only on itself (touch-action: none)', async ({ page }) => {
  expect(await canvas(page).evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
  expect(await pad(page).evaluate((el) => getComputedStyle(el).touchAction)).toBe('auto');
});

test('the saved image uses pen-color, the typed preview its italic font', async ({ page }) => {
  const svg = await pad(page, 'typed').evaluate((el) => el.toSVG());
  expect(svg).toContain('fill="#1d3a8a"');
  expect(svg).toContain('Ada Lovelace');
  await expect(canvas(page, 'typed')).toHaveAccessibleName('Witness, signed');
});

/** The color of the canvas pixel at (x, y) CSS pixels, and the canvas's CSS color, as [r, g, b]. */
const inkAt = (page, x, y) =>
  canvas(page).evaluate(
    (el, [px, py]) => {
      const scale = el.width / el.clientWidth;
      const [r, g, b] = el.getContext('2d').getImageData(Math.round(px * scale), Math.round(py * scale), 1, 1).data;
      // The CSS color (oklch in the themes) as the canvas paints it.
      const probe = document.createElement('canvas').getContext('2d');
      probe.fillStyle = getComputedStyle(el).color;
      probe.fillRect(0, 0, 1, 1);
      const [r2, g2, b2] = probe.getImageData(0, 0, 1, 1).data;
      const css = [r2, g2, b2];

      return { pixel: [r, g, b], css };
    },
    [x, y],
  );

test('in forced colors the stroke is drawn in CanvasText', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await draw(page, [20, 50, 200, 50]);
  const { pixel, css } = await inkAt(page, 110, 50);
  expect(pixel).toEqual(css);
});

test.describe('high-DPI', () => {
  test.use({ deviceScaleFactor: 2 });

  test('the canvas has two device pixels per CSS pixel', async ({ page }) => {
    const [w, cw, h, ch] = await canvas(page).evaluate((el) => [el.width, el.clientWidth, el.height, el.clientHeight]);
    expect(w).toBe(cw * 2);
    expect(h).toBe(ch * 2);
    await draw(page, [20, 50, 200, 50]);
    const { pixel, css } = await inkAt(page, 110, 50);
    expect(pixel).toEqual(css);
  });
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('a tap draws a dot', async ({ page }) => {
    const box = await canvas(page).boundingBox();
    await page.touchscreen.tap(box.x + 60, box.y + 40);
    await expect(canvas(page)).toHaveAccessibleName('Signature, signed');
    expect(await pad(page).evaluate((el) => el.toSVG())).toMatch(/l0 0/);
  });
});
