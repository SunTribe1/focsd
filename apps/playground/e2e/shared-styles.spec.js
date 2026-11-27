/**
 * Quality batch B7: the shared style layer. One focus ring (token), one active-option cue on every
 * listbox, the reduced-motion spinner cue, and the overlay layers.
 */
import { expect, test } from './fixtures/test.js';
import { expectFloorFocusRing } from './fixtures/focus-ring.js';

test.describe('every listbox marks its active option with the inset two-tone ring (Q15)', () => {
  test('select: the focused option', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Data region/ }).focus();
    await page.keyboard.press('ArrowDown');
    const option = page.getByRole('option', { name: 'EU (Frankfurt)' });
    await expect(option).toBeFocused();
    await expectFloorFocusRing(option, { inset: true });
  });

  test('combobox and multi-select: the active descendant', async ({ page }) => {
    await page.goto('/inputs.html');
    const country = page.getByRole('combobox', { name: 'Country' });
    await country.fill('g');
    await country.press('ArrowDown');
    await expectFloorFocusRing(page.locator('#cb [part~="active"]'), { inset: true });

    const labels = page.getByRole('combobox', { name: 'Labels' });
    await labels.focus();
    await labels.press('ArrowDown');
    await labels.press('ArrowDown');
    await expectFloorFocusRing(page.locator('#ms [part~="active"]'), { inset: true });
  });

  test('command palette: the active command', async ({ page }) => {
    await page.goto('/inputs.html');
    await page.getByRole('button', { name: 'Open command palette' }).focus();
    await page.keyboard.press('Enter');
    const input = page.getByRole('combobox', { name: 'Command palette' });
    await expect(input).toBeFocused();
    await input.press('ArrowDown');
    await expectFloorFocusRing(page.locator('#cmd [part~="active"]'), { inset: true });
  });

  test('tag input and phone field: the suggestion and country lists', async ({ page }) => {
    await page.goto('/tags.html');
    const languages = page.locator('#ts').getByRole('combobox', { name: 'Languages' });
    await languages.focus();
    await page.keyboard.press('ArrowDown');
    await expectFloorFocusRing(page.locator('#ts [part~="active"]'), { inset: true });

    await page.goto('/phone.html');
    const country = page.locator('#p').getByRole('combobox', { name: 'Country' });
    await country.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expectFloorFocusRing(page.locator('#p [part~="active"]'), { inset: true });
  });
});

test('the active-option ring sits evenly on every side, with the text where it was (m6)', async ({ page }) => {
  /** The inline-start border and padding of an option. */
  const edges = (locator) =>
    locator.evaluate((el) => {
      const style = getComputedStyle(el);

      return { border: style.borderLeftWidth, padding: style.paddingLeft };
    });

  await page.goto('/inputs.html');
  const country = page.getByRole('combobox', { name: 'Country' });
  await country.fill('g');
  await country.press('ArrowDown');
  // 12px (space-3) plus the 3px selection bar, now drawn inside the box instead of as a border.
  expect(await edges(page.locator('#cb [part~="active"]'))).toEqual({ border: '0px', padding: '15px' });

  await page.goto('/');
  await page.getByRole('button', { name: /^Data region/ }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  expect(await edges(page.getByRole('option', { name: 'US (Virginia)' }))).toEqual({ border: '0px', padding: '15px' });
});

test('virtual list marks its active row with the inset two-tone ring while it has keyboard focus (Q15)', async ({ page }) => {
  await page.goto('/virtual-list.html');
  const box = page.getByRole('listbox', { name: 'Recipients' });
  await box.focus();
  await page.keyboard.press('ArrowDown');
  await expectFloorFocusRing(page.locator('#pick [part~="active"]'), { inset: true });
});

test('the spinner keeps a slow pulse under reduced motion, so busy still shows (Q18)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/display.html');

  const motion = await page.evaluate(() => {
    const spin = document.getElementById('spinner').shadowRoot.querySelector('[part~="spinner"]');
    const style = getComputedStyle(spin);

    return { name: style.animationName, duration: Number.parseFloat(style.animationDuration), count: style.animationIterationCount };
  });

  expect(motion.name).toBe('focsd-pulse');
  expect(motion.count).toBe('infinite');
  expect(motion.duration).toBeGreaterThan(0.1);
});

test('a non-modal sheet sits above sticky headers and in-flow panels (Q21)', async ({ page }) => {
  await page.goto('/sheet.html');
  await expect(page.getByRole('region', { name: 'Now playing' })).toBeVisible();

  // A sticky header and an in-flow panel on the popover layer, both covering the sheet's area.
  // (Open popovers live in the browser's top layer and stack above any z-index; see the sheet docs.)
  const topAt = (sheetZ) =>
    page.evaluate((z) => {
      const sheet = document.getElementById('nm');
      sheet.style.removeProperty('--focsd-bottom-sheet-z');

      if (z) sheet.style.setProperty('--focsd-bottom-sheet-z', z);
      const panel = sheet.shadowRoot.querySelector('[part~="panel"]').getBoundingClientRect();

      const cover = (id, css) => {
        const el = document.getElementById(id) ?? document.body.appendChild(Object.assign(document.createElement('div'), { id }));
        el.style.cssText = css;
      };

      cover('sticky-cover', 'position: fixed; inset: 0; z-index: var(--focsd-layer-sticky); background: rgb(200 0 0 / 0.1);');
      cover('panel-cover', 'position: absolute; inset: 0; z-index: var(--focsd-layer-popover); background: rgb(0 0 200 / 0.1);');
      // The panel can run past the bottom of the viewport; test a point in its visible part.
      const hit = document.elementFromPoint(panel.left + panel.width / 2, (panel.top + Math.min(panel.bottom, innerHeight)) / 2);

      return hit?.id || hit?.localName;
    }, sheetZ);

  expect(await topAt(null)).toBe('nm');
  // Control: on its old z-index (50) the sheet sat under the in-flow panel.
  expect(await topAt('50')).toBe('panel-cover');
});

test('the skip link sits above toasts (m10)', async ({ page }) => {
  await page.goto('/display.html');

  const [link, toast] = await page.evaluate(async () => {
    const toaster = document.body.appendChild(document.createElement('focsd-toaster'));
    await customElements.whenDefined('focsd-toaster');

    return [Number(getComputedStyle(document.querySelector('focsd-skip-link')).zIndex), Number(getComputedStyle(toaster).zIndex)];
  });

  expect(toast).toBeGreaterThan(0);
  expect(link).toBeGreaterThan(toast);
});

test('a focused chart point gets the two-tone ring, not just an ink stroke (Q13)', async ({ page }) => {
  await page.goto('/charts.html');
  const bar = page.locator('#bar');
  await bar.locator('[part~="point"][tabindex="0"]').focus();
  await page.keyboard.press('ArrowRight');

  const ring = await bar.evaluate((el) => {
    const group = el.shadowRoot.querySelector('[part~="focus-ring"]');
    const stroke = (cls) => getComputedStyle(group.querySelector(cls)).stroke;

    const probe = (token) => {
      const p = document.createElement('div');
      p.style.setProperty('color', `var(${token})`);
      el.shadowRoot.append(p);
      const value = getComputedStyle(p).color;
      p.remove();

      return value;
    };

    return {
      shown: getComputedStyle(group).display !== 'none',
      outer: stroke('.ring-outer') === probe('--focsd-focus-outer'),
      inner: stroke('.ring-inner') === probe('--focsd-focus-inner'),
      hidden: group.getAttribute('aria-hidden'),
    };
  });

  expect(ring).toEqual({ shown: true, outer: true, inner: true, hidden: 'true' });

  await page.mouse.click(5, 5);
  await expect.poll(() => bar.evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="focus-ring"]')).display)).toBe('none');
});

test('the rich-text ring wraps the field while the text has focus, not around toolbar buttons (m19)', async ({ page }) => {
  await page.goto('/editor.html');
  const editor = page.locator('#notes');
  const field = editor.locator('[part~="field"]');
  await editor.locator('.ProseMirror').focus();
  await expectFloorFocusRing(field);
  // The transparent outline is what forced-colors mode shows once box-shadow is dropped.
  expect(await field.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');

  await editor.getByRole('toolbar').getByRole('button').first().focus();
  await expect.poll(() => field.evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
});

test('an invalid rich-text field turns its border critical without moving the text (m18)', async ({ page }) => {
  await page.goto('/editor.html');
  const editor = page.locator('#notes');
  const text = editor.locator('.ProseMirror');
  const before = await text.boundingBox();
  await editor.evaluate((el) => {
    el.error = 'Add a summary.';
  });
  const field = editor.locator('[part~="field"]');

  const critical = () =>
    field.evaluate((el) => {
      const probe = document.createElement('span');

      probe.style.color = 'var(--focsd-critical)';
      el.append(probe);
      const color = getComputedStyle(probe).color;

      probe.remove();

      return [getComputedStyle(el).borderTopColor, color];
    });

  await expect
    .poll(async () => {
      const [border, color] = await critical();

      return border === color;
    })
    .toBe(true);
  await expect.poll(() => field.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('1px');
  const after = await text.boundingBox();
  expect(after.x).toBeCloseTo(before.x, 0);
  expect(after.width).toBeCloseTo(before.width, 0);
});

test('the select chevron points down in right-to-left text too (m3, guards the logical borders)', async ({ page }) => {
  await page.goto('/');

  const angle = (dir) =>
    page.locator('#sel').evaluate((el, d) => {
      el.setAttribute('dir', d);
      const indicator = el.shadowRoot.querySelector('[part~="indicator"]');
      const style = getComputedStyle(indicator);
      const m = new DOMMatrix(style.transform);
      // The corner where the two drawn borders meet, after the transform: down is +y with no x.
      const right = Number.parseFloat(style.borderRightWidth) > 0 ? 1 : -1;
      const corner = m.transformPoint(new DOMPoint(right, 1));
      const origin = m.transformPoint(new DOMPoint(0, 0));

      return { dx: Math.round((corner.x - origin.x) * 100) / 100, dy: Math.round((corner.y - origin.y) * 100) / 100 };
    }, dir);

  for (const dir of ['ltr', 'rtl']) {
    const { dx, dy } = await angle(dir);
    expect(Math.abs(dx), dir).toBeLessThan(0.01);
    expect(dy, dir).toBeGreaterThan(0);
  }
});

test('a focus color set on a wrapper reaches the ring inside a component (I1)', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const wrap = document.createElement('div');
    wrap.style.setProperty('--focsd-focus-outer', 'rgb(255, 0, 0)');
    wrap.innerHTML = '<focsd-button id="ring-probe">Save changes</focsd-button>';
    document.body.prepend(wrap);
  });
  await page.keyboard.press('Shift');
  await page.locator('#ring-probe').getByRole('button').focus();

  const ring = () =>
    page.locator('#ring-probe').evaluate((el) => getComputedStyle(el.shadowRoot.querySelector('[part~="control"]')).boxShadow);

  await expect.poll(ring).toContain('rgb(255, 0, 0)');
});
