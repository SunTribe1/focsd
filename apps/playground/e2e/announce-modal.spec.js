import { expect, test } from './fixtures/test.js';

// B14 I1: showModal() makes everything outside the dialog inert, and an inert live region is not
// heard. An announcement from inside an open modal must land in a region inside that modal.

/** True when the polite region sits (in the flat tree) inside an open modal dialog. */
const regionInsideModal = (page) =>
  page.evaluate(() => {
    const find = (root) => {
      const hit = root.querySelector('[data-focsd-announcer="polite"]');

      if (hit) return hit;

      for (const el of root.querySelectorAll('*')) {
        const inner = el.shadowRoot && find(el.shadowRoot);

        if (inner) return inner;
      }

      return null;
    };

    const region = find(document);

    for (let n = region; n; n = n.assignedSlot ?? n.parentNode ?? n.host)
      if (n instanceof HTMLDialogElement && n.matches(':modal')) return true;

    return false;
  });

test('a textarea in an open focsd-dialog announces its count inside the dialog', async ({ page }) => {
  await page.goto('/polish.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-dialog') && customElements.get('focsd-textarea')));
  await page.evaluate(async () => {
    const dialog = document.createElement('focsd-dialog');

    dialog.id = 'am-dialog';
    dialog.setAttribute('headline', 'Feedback');
    dialog.innerHTML = '<focsd-textarea id="am-notes" label="Message" maxlength="40"></focsd-textarea>';
    document.body.append(dialog);
    await dialog.updateComplete;
    dialog.show();
  });
  await page.locator('#am-notes').getByRole('textbox').pressSequentially('abc');
  await expect(page.locator('[data-focsd-announcer="polite"]')).toHaveText('3 of 40 characters', { timeout: 3000 });
  expect(await regionInsideModal(page)).toBe(true);
});

test('a grid in an open modal dialog announces inside the dialog', async ({ page }) => {
  await page.goto('/grid.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-data-grid')));
  await page.evaluate(async () => {
    const dialog = document.createElement('dialog');
    const grid = document.getElementById('invoices');

    document.body.append(dialog);
    dialog.append(grid);
    await grid.updateComplete;
    dialog.showModal();
  });
  await page.locator('#invoices').getByRole('searchbox', { name: 'Search Invoices' }).fill('contoso');
  await expect(page.locator('[data-focsd-announcer="polite"]')).toHaveText('9 of 64 rows');
  expect(await regionInsideModal(page)).toBe(true);
});
