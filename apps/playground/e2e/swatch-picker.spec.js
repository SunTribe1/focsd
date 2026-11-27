// cspell:ignore seagreen
import { expect, test } from './fixtures/test.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await page.goto('/swatch.html');
  await page.waitForFunction(() => customElements.get('focsd-swatch-picker'));
});

const group = (page, name) => page.getByRole('radiogroup', { name });

test('swatches are radios named by label, color name or hex', async ({ page }) => {
  const radios = group(page, 'Label color').getByRole('radio');
  await expect(radios.nth(0)).toHaveAccessibleName('tomato');
  await expect(radios.nth(1)).toHaveAccessibleName('seagreen');
  await expect(radios.nth(2)).toHaveAccessibleName('#123456');
  await expect(group(page, 'Theme').getByRole('radio', { name: 'Teal' })).toBeVisible();
  await expect(group(page, 'Label color').getByRole('radio', { name: 'tomato' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('#s [part~="check"]')).toHaveCount(1);
});

test('roving focus: one tab stop, arrows, Home and End; arrows select', async ({ page }) => {
  await group(page, 'Label color').getByRole('radio', { name: 'tomato' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(group(page, 'Label color').getByRole('radio', { name: 'seagreen' })).toBeFocused();
  await expect(page.locator('#s')).toHaveJSProperty('value', '#2e8b57');
  await page.keyboard.press('End');
  await expect(page.locator('#s')).toHaveJSProperty('value', '#123456');
  await page.keyboard.press('Home');
  await expect(page.locator('#s')).toHaveJSProperty('value', '#ff6347');
  await expect(group(page, 'Label color').locator('[tabindex="0"]')).toHaveCount(1);
});

test('custom color opens a color picker; its color becomes the value', async ({ page }) => {
  const custom = page.locator('#sc').getByRole('button', { name: 'Custom color' });
  await custom.click();
  const field = page.locator('#sc').getByRole('textbox');
  await field.fill('#336699');
  await field.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.locator('#sc')).toHaveJSProperty('value', '#336699');
  await expect(custom).toBeFocused();
});

test('required, form value and reset', async ({ page }) => {
  expect(await page.locator('#sc').evaluate((el) => [el.validity.valueMissing, el.validationMessage])).toEqual([true, 'Choose a color.']);
  await group(page, 'Theme').getByRole('radio', { name: 'Rust' }).click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["color","#ff6347"],["theme","#7c2d12"]');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#sc')).toHaveJSProperty('value', '');
});

test('one input and one change per edit; none when nothing changed', async ({ page }) => {
  const log = await page.locator('#s').evaluate((el) => {
    window.__ev = [];

    for (const t of ['input', 'change']) el.addEventListener(t, () => window.__ev.push(t));

    return null;
  });

  void log;
  await group(page, 'Label color').getByRole('radio', { name: 'tomato' }).click();
  expect(await page.evaluate(() => window.__ev)).toEqual([]);
  await group(page, 'Label color').getByRole('radio', { name: 'seagreen' }).click();
  expect(await page.evaluate(() => window.__ev)).toEqual(['input', 'change']);
});

test('custom color edit fires one input and one change', async ({ page }) => {
  await page.locator('#sc').evaluate((el) => {
    window.__ev = [];

    for (const t of ['input', 'change']) el.addEventListener(t, () => window.__ev.push(t));
  });
  await page.locator('#sc').getByRole('button', { name: 'Custom color' }).click();
  const field = page.locator('#sc').getByRole('textbox');
  await field.fill('#336699');
  await field.press('Enter');
  expect(await page.evaluate(() => window.__ev)).toEqual(['input', 'change']);
});

test('odd writes do not throw; values normalize; restore and reset validate; options are watched', async ({ page }) => {
  const result = await page.locator('#s').evaluate(async (el) => {
    const out = {};

    for (const v of [null, undefined, 5, {}, 'banana']) el.value = v;
    el.value = '#FF6347';
    await el.updateComplete;
    out.upper = el.value;
    el.value = 'tomato';
    await el.updateComplete;
    out.named = el.value;
    el.formStateRestoreCallback('not-a-color');
    out.restoredBad = el.value;
    el.formStateRestoreCallback('#abcdef');
    out.restoredOffList = el.value;
    el.formStateRestoreCallback('#2E8B57');
    out.restoredOk = el.value;
    el.swatches = null;
    el.swatches = 42;
    await el.updateComplete;

    return out;
  });

  expect(result).toEqual({ upper: '#ff6347', named: '#ff6347', restoredBad: '', restoredOffList: '', restoredOk: '#2e8b57' });

  const sc = await page.locator('#sc').evaluate(async (el) => {
    el.formStateRestoreCallback('#ABCDEF');
    const custom = el.value;
    const opt = document.createElement('focsd-option');
    opt.setAttribute('color', '#112233');
    opt.textContent = 'Navy';
    el.append(opt);
    await new Promise((r) => setTimeout(r));
    await el.updateComplete;

    return [custom, el.shadowRoot.querySelectorAll('[role="radio"]').length];
  });

  expect(sc).toEqual(['#abcdef', 3]);
});

test('the custom popup is a named dialog', async ({ page }) => {
  await page.locator('#sc').getByRole('button', { name: 'Custom color' }).click();
  await expect(page.getByRole('dialog', { name: 'Custom color' })).toBeVisible();
});

test('closing the popup with Escape still fires change after an input', async ({ page }) => {
  await page.locator('#sc').evaluate((el) => {
    window.__ev = [];

    for (const t of ['input', 'change']) el.addEventListener(t, () => window.__ev.push(t));
  });
  await page.locator('#sc').getByRole('button', { name: 'Custom color' }).click();
  // Pending input without the picker's commit: an edit that ends by closing the popup.
  await page.locator('#sc').evaluate((el) => {
    const picker = el.shadowRoot.querySelector('[part~="picker"]');
    picker.value = '#445566';
    picker.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  });
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.__ev)).toEqual(['input', 'change']);
});

// 14a-10: disabling is not a user commit, so the popup it closes fires no change.
test('disabling while a custom edit is pending closes the popup without a change', async ({ page }) => {
  await page.locator('#sc').evaluate((el) => {
    window.__ev = [];

    for (const t of ['input', 'change']) el.addEventListener(t, () => window.__ev.push(t));
  });
  await page.locator('#sc').getByRole('button', { name: 'Custom color' }).click();
  await page.locator('#sc').evaluate(async (el) => {
    const picker = el.shadowRoot.querySelector('[part~="picker"]');
    picker.value = '#445566';
    picker.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    el.disabled = true;
    await el.updateComplete;
  });
  await expect(page.getByRole('dialog', { name: 'Custom color' })).toBeHidden();
  expect(await page.evaluate(() => window.__ev)).toEqual(['input']);
});

// 14a-10 I-4 (controller ruling): the color chip stays 32px; each swatch and the custom button is a 44px target.
test('swatches and the custom button are 44px targets around a 32px chip', async ({ page }) => {
  const sizes = await page.locator('#sc').evaluate((el) =>
    [...el.shadowRoot.querySelectorAll('[part~="swatch"], [part~="custom"]')].map((b) => {
      const box = b.getBoundingClientRect();
      const chip = b.querySelector('[part~="chip"]').getBoundingClientRect();

      return [Math.round(box.width), Math.round(box.height), Math.round(chip.width), Math.round(chip.height)];
    }),
  );

  expect(sizes.length).toBeGreaterThan(1);
  expect(sizes.every(([w, h, cw, ch]) => w >= 44 && h >= 44 && cw === 32 && ch === 32)).toBe(true);
});

// 14a-10 M-11: a later labelled entry names a color the swatches list already offered.
test('a labelled option names a color that the swatches list repeats', async ({ page }) => {
  const names = await page.evaluate(async () => {
    const el = document.createElement('focsd-swatch-picker');
    el.label = 'Brand';
    el.swatches = 'red, #00f';
    el.innerHTML = '<focsd-option color="red" label="Brand red"></focsd-option><focsd-option color="#0000ff"></focsd-option>';
    document.body.append(el);
    await el.updateComplete;
    const items = el.items.map((i) => [i.key, i.name]);
    el.remove();

    return items;
  });

  expect(names).toEqual([
    ['#ff0000', 'Brand red'],
    ['#0000ff', 'blue'],
  ]);
});

test('author ARIA is kept on the radio group', async ({ page }) => {
  await page.locator('#s').evaluate(async (el) => {
    el.setAttribute('aria-label', 'Tag color');
    await el.updateComplete;
  });
  await expect(page.getByRole('radiogroup', { name: 'Tag color' })).toBeVisible();
});

for (const theme of THEMES)
  test(`axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/swatch.html', theme, 'focsd-swatch-picker');
    await expectAxeClean(page);
  });

// 14a-9: in a narrow column the swatches wrap and the custom color button ends their last row.
test('when the swatches wrap, the custom color button sits on their last row', async ({ page }) => {
  const picker = page.locator('#sw');
  const radios = await picker.getByRole('radio').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  const custom = await picker.getByRole('button', { name: 'Custom color' }).boundingBox();

  expect(new Set(radios.map(Math.round)).size).toBeGreaterThan(1);
  expect(Math.abs(custom.y - Math.max(...radios))).toBeLessThan(1);
});

// 14b-10 (14a-10 re-review hand-off): the row reaches 6px past the picker on each side so the chips
// line up with the label. At a container's edge only that hit-area margin may be cut off: every chip
// stays inside the picker, the picker inside its container, and a phone-width page does not scroll sideways.
test('at a clipping container edge the chips stay whole and the page does not scroll sideways', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });

  const result = await page.evaluate(async () => {
    const box = document.createElement('div');
    box.style.overflow = 'hidden';
    box.style.inlineSize = '200px';
    const el = document.createElement('focsd-swatch-picker');
    el.label = 'Edge';
    el.allowCustom = true;
    el.swatches = '#ff6347,#2e8b57,#123456,#0f766e,#7c2d12,#1d4ed8';
    box.append(el);
    document.querySelector('main').prepend(box);
    await el.updateComplete;
    const outer = box.getBoundingClientRect();
    const host = el.getBoundingClientRect();
    const chips = [...el.shadowRoot.querySelectorAll('[part~="chip"]')].map((c) => c.getBoundingClientRect());

    return {
      chipsInHost: chips.every((c) => c.left >= host.left - 0.5 && c.right <= host.right + 0.5),
      hostInBox: host.left >= outer.left - 0.5 && host.right <= outer.right + 0.5,
      wrapped: new Set(chips.map((c) => Math.round(c.top))).size > 1,
      scrolls: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

  expect(result).toEqual({ chipsInHost: true, hostInBox: true, wrapped: true, scrolls: false });
});
