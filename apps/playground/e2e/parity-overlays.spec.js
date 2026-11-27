import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-dialog')));
});

const dialog = (page) => page.locator('#pt-dialog dialog');

test('show-modal command opens focsd-dialog; requestClose fires a cancelable cancel', async ({ page }) => {
  await page.locator('#pt-dialog-open').click();
  await expect(dialog(page)).toBeVisible();

  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-dialog');
    const veto = (e) => e.preventDefault();
    el.addEventListener('cancel', veto);
    el.requestClose('later');
    await el.updateComplete;
    const stayed = el.open;
    el.removeEventListener('cancel', veto);
    el.requestClose('later');
    await new Promise((resolve) => el.addEventListener('close', resolve, { once: true }));

    return { stayed, open: el.open, returnValue: el.returnValue };
  });

  expect(r).toEqual({ stayed: true, open: false, returnValue: 'later' });
});

test('Escape fires cancel on the host, which can veto it', async ({ page }) => {
  await page.locator('#pt-dialog-open').click();
  await page.evaluate(() => document.getElementById('pt-dialog').addEventListener('cancel', (e) => e.preventDefault(), { once: true }));
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});

test('closedby: closerequest ignores backdrop clicks, any closes on them, none ignores Escape', async ({ page }) => {
  await page.locator('#pt-dialog-open').click();
  await page.mouse.click(4, 4);
  await expect(dialog(page)).toBeVisible();
  await page.evaluate(() => document.getElementById('pt-dialog').setAttribute('closedby', 'any'));
  await page.mouse.click(4, 4);
  await expect(dialog(page)).toBeHidden();

  await page.evaluate(() => document.getElementById('pt-dialog').setAttribute('closedby', 'none'));
  await page.locator('#pt-dialog-open').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.mouse.click(4, 4);
  await expect(dialog(page)).toBeVisible();
  await page.locator('#pt-dialog focsd-button[data-dialog-close]').click();
  await expect(dialog(page)).toBeHidden();
});

test('name makes disclosures and accordion items an exclusive group', async ({ page }) => {
  await page.locator('#pt-faq2 [part~="trigger"]').click();
  await expect(page.locator('#pt-faq2')).toHaveAttribute('open', '');
  await expect(page.locator('#pt-faq1')).not.toHaveAttribute('open');
  await expect(page.locator('#pt-other')).toHaveAttribute('open', '');
  await page.evaluate(() => (document.getElementById('pt-acc2').open = true));
  await expect(page.locator('#pt-acc1')).not.toHaveAttribute('open');
  expect(await page.evaluate(() => document.getElementById('pt-faq1').name)).toBe('faq');
});
