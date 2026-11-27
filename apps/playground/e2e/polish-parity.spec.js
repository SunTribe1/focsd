import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-button')));
});

test('M1: removing popovertarget drops aria-expanded', async ({ page }) => {
  const control = page.locator('#pt-pop-btn [part~="control"]');
  await expect(control).toHaveAttribute('aria-expanded', 'false');
  await page.evaluate(() => document.getElementById('pt-pop-btn').removeAttribute('popovertarget'));
  await expect(control).not.toHaveAttribute('aria-expanded');
});

test('M2: removing a forwarded host aria-label restores the control’s own name', async ({ page }) => {
  const group = page.locator('#pt-align [role="group"]');
  await expect(group).toHaveAccessibleName('Align');
  await page.evaluate(() => document.getElementById('pt-align').setAttribute('aria-label', 'Alignment'));
  await expect(group).toHaveAccessibleName('Alignment');
  await page.evaluate(() => document.getElementById('pt-align').removeAttribute('aria-label'));
  await expect(group).toHaveAccessibleName('Align');
});

test('M5: an open disclosure inserted into a group that already has one open is closed', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const late = document.createElement('focsd-disclosure');
    Object.assign(late, { name: 'faq', summary: 'Late', open: true });
    document.getElementById('pt-faq1').after(late);
    await late.updateComplete;
    await new Promise((resolve) => setTimeout(resolve));

    return [late.open, document.getElementById('pt-faq1').open];
  });

  expect(r).toEqual([false, true]);
});

test('M6: a drag that ends on the backdrop does not close a closedby="any" dialog', async ({ page }) => {
  await page.evaluate(() => document.getElementById('pt-dialog').setAttribute('closedby', 'any'));
  await page.locator('#pt-dialog-open').click();
  const box = await page.locator('#pt-dialog dialog [part~="body"]').boundingBox();
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(4, 4);
  await page.mouse.up();
  await expect(page.locator('#pt-dialog dialog')).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(page.locator('#pt-dialog dialog')).toBeHidden();
});

test('M7: a time range with min after max wraps past midnight', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-time');
    Object.assign(el, { min: '22:00', max: '06:00', value: '23:00' });
    await el.updateComplete;
    const late = el.validity.valid;
    el.value = '05:00';
    await el.updateComplete;
    const early = el.validity.valid;
    el.value = '12:00';
    await el.updateComplete;

    return [late, early, el.validity.rangeUnderflow, el.validity.rangeOverflow];
  });

  expect(r).toEqual([true, true, true, true]);
});

test('M9: file showPicker without a user gesture throws NotAllowedError', async ({ page }) => {
  const name = await page.evaluate(() => {
    // Playwright's evaluate runs with a user gesture; model a call made without one.
    Object.defineProperty(navigator, 'userActivation', { value: { isActive: false }, configurable: true });

    try {
      document.getElementById('pt-file').showPicker();

      return null;
    } catch (e) {
      return e.name;
    }
  });

  expect(name).toBe('NotAllowedError');
});

test('M10: spellcheck="" forwards as true and the property is a boolean', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-name');
    el.setAttribute('spellcheck', '');
    await el.updateComplete;
    const on = [el.spellcheck, el.shadowRoot.querySelector('[part~="control"]').getAttribute('spellcheck')];
    el.spellcheck = false;
    await el.updateComplete;

    return [...on, el.spellcheck, el.shadowRoot.querySelector('[part~="control"]').getAttribute('spellcheck')];
  });

  expect(r).toEqual([true, 'true', false, 'false']);
});
