import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/consistent-inputs.html');
  await page.waitForFunction(() => window.__ready === true);
});

/** Mount a fresh element in a plain display:block wrapper (the page's #f is a grid, which turns children block-level). */
const mount = (page, name, props = {}) =>
  page.evaluate(
    async (arg) => {
      document.querySelector('#plain')?.remove();
      const wrap = document.createElement('div');
      wrap.id = 'plain';
      wrap.style.cssText = 'display:block;inline-size:50rem';
      wrap.innerHTML = 'Before text ';
      const el = document.createElement(arg.name);
      el.setAttribute('label', 'Field');

      for (const [k, v] of Object.entries(arg.props)) el.setAttribute(k, v);
      wrap.append(el);
      document.body.append(wrap);
      await el.updateComplete;
      const text = wrap.firstChild;
      const range = document.createRange();
      range.selectNodeContents(text);
      const t = range.getBoundingClientRect();
      const r = el.getBoundingClientRect();

      return {
        display: getComputedStyle(el).display,
        sameLine: r.left >= t.right - 1 && r.top < t.bottom && r.bottom > t.top,
        width: (() => {
          el.style.maxInlineSize = '20rem';

          return el.getBoundingClientRect().width;
        })(),
      };
    },
    { name, props },
  );

test.describe('host box in plain block flow', () => {
  test('color picker is inline-grid by default, beside text', async ({ page }) => {
    const box = await mount(page, 'focsd-color-picker');
    expect(box.display).toBe('inline-grid');
    expect(box.sameLine).toBe(true);
    expect(box.width).toBeLessThanOrEqual(320);
  });

  for (const attrs of [{ inline: '' }, { 'label-position': 'start' }, { 'label-position': 'end' }])
    test(`color picker is grid with ${JSON.stringify(attrs)}`, async ({ page }) => {
      const box = await mount(page, 'focsd-color-picker', attrs);
      expect(box.display).toBe('grid');
      expect(box.width).toBeLessThanOrEqual(320);
    });

  for (const tag of ['focsd-tag-input', 'focsd-phone-field'])
    test(`${tag} is grid or block and honors max-inline-size`, async ({ page }) => {
      const box = await mount(page, tag);
      expect(['block', 'grid']).toContain(box.display);
      expect(box.width).toBeLessThanOrEqual(320);
    });
});

test('the phone example is part="example" and the hint is the author hint', async ({ page }) => {
  const phone = page.locator('#ph');
  await phone.evaluate(async (el) => {
    el.setAttribute('hint', 'We only text for delivery');
    el.setAttribute('warning', 'Check the number');
    await el.updateComplete;
  });
  await expect(phone.locator('[part~="hint"]')).toHaveText('We only text for delivery');
  await expect(phone.locator('[part~="example"]')).toContainText(/\d/);

  const order = await phone.locator('[part~="field"]').evaluate((group) => {
    const root = group.getRootNode();

    return group
      .getAttribute('aria-describedby')
      .split(' ')
      .map((id) => root.getElementById(id).getAttribute('part'));
  });

  expect(order).toEqual(['hint', 'example', expect.stringContaining('message')]);
});

test('the tag input is described on its text input, never a remove button', async ({ page }) => {
  const tags = page.locator('#ti');
  await tags.evaluate(async (el) => {
    el.value = 'a,b';
    el.setAttribute('error', 'Too few');
    await el.updateComplete;
  });
  await expect(tags.locator('[part~="control"]')).toHaveAttribute('aria-invalid', 'true');
  await expect(tags.locator('[part~="remove"]').first()).not.toHaveAttribute('aria-invalid', 'true');
  await expect(tags.locator('[part~="remove"]').first()).not.toHaveAttribute('aria-describedby', /.+/);
});

test('the inline color picker is described on its text field', async ({ page }) => {
  const picker = page.locator('#cp');
  await picker.evaluate(async (el) => {
    el.toggleAttribute('inline', true);
    el.setAttribute('hint', 'Used for your badge');
    await el.updateComplete;
  });
  await picker.evaluate(async (el) => {
    el.setAttribute('warning', 'Low contrast');
    await el.updateComplete;
  });
  await expect(picker.locator('[part~="trigger"]')).toHaveCount(0);

  const info = await picker.locator('[part~="field"]').evaluate((field) => {
    const root = field.getRootNode();

    const els = field
      .getAttribute('aria-describedby')
      .split(' ')
      .map((id) => root.getElementById(id));

    const panel = root.querySelector('[part~="panel"]');

    return {
      parts: els.map((e) => e.getAttribute('part')),
      afterPanel: els.every((e) => Boolean(panel.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING)),
    };
  });

  expect(info.parts).toEqual(['hint', expect.stringContaining('message')]);
  expect(info.afterPanel).toBe(true);
});

test('an error attribute present before the tag input is connected does not throw', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const errors = [];
    window.addEventListener('error', (e) => errors.push(e.message));
    const parsed = document.createElement('div');
    parsed.innerHTML = '<focsd-tag-input label="Early" error="Required"></focsd-tag-input>';
    const made = document.createElement('focsd-tag-input');
    made.error = 'Required';
    made.setCustomValidity?.('Custom');
    document.body.append(parsed, made);
    await Promise.all([parsed.firstElementChild.updateComplete, made.updateComplete]);
    const input = parsed.firstElementChild.shadowRoot.querySelector('[part~="control"]');

    return { errors, invalid: input.getAttribute('aria-invalid') };
  });

  expect(result.errors).toEqual([]);
  expect(result.invalid).toBe('true');
});

test('inline color picker keeps aria-invalid for bad text after an error is cleared', async ({ page }) => {
  const picker = page.locator('#cp');
  await picker.evaluate((el) => el.toggleAttribute('inline', true));
  const field = picker.locator('[part~="field"]');
  await field.fill('not a color');
  await field.press('Enter');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await picker.evaluate(async (el) => {
    el.setAttribute('error', 'Pick one');
    await el.updateComplete;
    el.removeAttribute('error');
    await el.updateComplete;
  });
  await expect(field).toHaveAttribute('aria-invalid', 'true');
});

test('inline color picker: valid text after bad text clears aria-invalid; an author error still sets it', async ({ page }) => {
  const picker = page.locator('#cp');

  await picker.evaluate((el) => el.toggleAttribute('inline', true));
  const field = picker.locator('[part~="field"]');

  await field.fill('not a color');
  await field.press('Enter');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await field.fill('#112233');
  await field.press('Enter');
  await expect(field).not.toHaveAttribute('aria-invalid');
  await picker.evaluate((el) => el.setAttribute('error', 'Pick one'));
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await picker.evaluate((el) => el.removeAttribute('error'));
  await expect(field).not.toHaveAttribute('aria-invalid');
});

for (const [tag, id] of [
  ['tag input', 'ti'],
  ['phone field', 'ph'],
])
  test(`${tag}: an error keeps the inner input's padding and colors the outer box`, async ({ page }) => {
    const host = page.locator(`#${id}`);

    const read = () =>
      host.evaluate((el) => {
        const control = el.shadowRoot.querySelector('[part~="field"] [part~="control"]');
        const field = el.shadowRoot.querySelector('[part~="field"]');

        return {
          padding: getComputedStyle(control).paddingInlineStart,
          controlBorder: getComputedStyle(control).borderInlineStartWidth,
          fieldBorder: getComputedStyle(field).borderInlineStartColor,
        };
      });

    const before = await read();
    await host.evaluate(async (el) => {
      el.setAttribute('error', 'Required');
      await el.updateComplete;
    });
    const after = await read();
    expect(after.padding).toBe(before.padding);
    expect(after.controlBorder).toBe(before.controlBorder);
    expect(after.fieldBorder).not.toBe(before.fieldBorder);
  });
