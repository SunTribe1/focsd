import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/consistent-inputs.html');
  await page.waitForFunction(() => window.__ready === true);
});

const invalidInputs = (page) =>
  page.locator('#dr').evaluate(async (el) => {
    await el.updateComplete;

    return [...el.shadowRoot.querySelectorAll('input')].map((i) => i.getAttribute('aria-invalid'));
  });

test('range picker: an author error sets aria-invalid on both inputs, and clearing removes it', async ({ page }) => {
  await page.locator('#dr').evaluate(async (el) => {
    el.error = 'Pick dates we can book';
    await el.updateComplete;
  });
  expect(await invalidInputs(page)).toEqual(['true', 'true']);
  await page.locator('#dr').evaluate(async (el) => {
    el.error = undefined;
    await el.updateComplete;
  });
  expect(await invalidInputs(page)).toEqual([null, null]);
});

test('range picker: the built-in error sets aria-invalid on both inputs, also after an author error goes', async ({ page }) => {
  await page.locator('#dr').evaluate(async (el) => {
    el.valueEnd = '2026-03-01';
    await el.updateComplete;
    el.reportValidity();
    await el.updateComplete;
  });
  expect(await invalidInputs(page)).toEqual(['true', 'true']);
  await page.locator('#dr').evaluate(async (el) => {
    el.error = 'Author error';
    await el.updateComplete;
    el.error = undefined;
    await el.updateComplete;
  });
  expect(await invalidInputs(page)).toEqual(['true', 'true']);
  await page.locator('#dr').evaluate(async (el) => {
    el.valueEnd = '2026-03-20';
    await el.updateComplete;
  });
  expect(await invalidInputs(page)).toEqual([null, null]);
});

test('file upload: the group carries the hint; the trigger does not repeat it', async ({ page }) => {
  await page.locator('#fu').evaluate(async (el) => {
    el.hint = 'PDF only';
    await el.updateComplete;
  });
  const group = page.locator('#fu').getByRole('group', { name: 'Attachments' });
  await expect(group).toHaveAccessibleDescription(/PDF only/);
  await expect(group.getByRole('button', { name: /Choose file/ })).not.toHaveAttribute('aria-describedby', /.+/);
});

test('file upload: a rejected file has its own rejection part, apart from the control error', async ({ page }) => {
  const upload = page.locator('#fu');

  await upload.evaluate(async (el) => {
    el.maxSize = 1;
    el.addFiles([new File(['too big'], 'notes.txt', { type: 'text/plain' })]);
    el.error = 'Add at least one file';
    await el.updateComplete;
  });

  await expect(upload.locator('[part~="rejection"]')).toHaveCount(1);
  await expect(upload.locator('[part~="rejection"]')).toHaveAttribute('part', 'error rejection');
  await expect(upload.locator('[part~="rejection"]')).toContainText('notes.txt');
  await expect(upload.locator('[part~="message"][part~="error"]')).not.toHaveAttribute('part', /\brejection\b/);
});
