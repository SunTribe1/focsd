import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes5 } from './fixtures/pages.js';

// Re-homed from review-fixes-5.spec.js (Q48).

test('Escape twice never clears chosen values', async ({ page }) => {
  await openFromReviewFixes5(page);
  const input = page.getByRole('combobox', { name: 'Labels' });
  await input.focus();
  await input.press('ArrowDown');
  await input.press('Escape');
  await input.press('Escape');
  expect(await page.locator('#ms').evaluate((el) => el.value)).toBe('bug');
});

test('disabled multi-select and file upload cannot be changed', async ({ page }) => {
  await openFromReviewFixes5(page);
  await page.locator('#fu').evaluate((el) => {
    const data = new DataTransfer();
    data.items.add(new File(['a'], 'a.pdf', { type: 'application/pdf' }));
    el.shadowRoot
      .querySelector('[part~="dropzone"]')
      .dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
  });
  await page.evaluate(() => {
    document.getElementById('ms').disabled = true;
    document.getElementById('fu').disabled = true;
  });
  await expect(page.getByRole('button', { name: 'Remove Bug' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove a.pdf' })).toBeDisabled();

  const dragging = await page.locator('#fu').evaluate(async (el) => {
    el.shadowRoot.querySelector('[part~="dropzone"]').dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true }));
    await el.updateComplete;

    return el.shadowRoot.querySelector('[part~="dragging"]') !== null;
  });

  expect(dragging).toBe(false);
});
