import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes5, mountFormInMain as mount, openFromMinorsInputs } from './fixtures/pages.js';

// Re-homed from review-fixes-5.spec.js (Q48).

test('arrow order follows the grouped on-screen order', async ({ page }) => {
  await openFromReviewFixes5(page);
  await page.evaluate(() => {
    const item = document.createElement('focsd-command-item');
    item.setAttribute('value', 'archive');
    item.setAttribute('group', 'Projects');
    item.textContent = 'Archive project';
    document.getElementById('cmd').append(item);
  });
  await page.getByRole('button', { name: 'Open command palette' }).click();
  const input = page.getByRole('combobox', { name: 'Command palette' });

  const active = async () => {
    const id = await input.getAttribute('aria-activedescendant');

    return page.locator(`#cmd >> internal:attr=[id="${id}"]`).innerText();
  };

  const seen = [await active()];

  for (let i = 0; i < 2; i += 1) {
    await input.press('ArrowDown');
    seen.push(await active());
  }

  expect(seen.map((s) => s.split('\n')[0].trim())).toEqual(['New project', 'Open project', 'Archive project']);
});

// Re-homed from minors-inputs.spec.js (Q48).

test('command items added while the palette is open appear in the list', async ({ page }) => {
  await openFromMinorsInputs(page);
  await mount(page, '<focsd-command id="cp"><focsd-command-item value="one">One</focsd-command-item></focsd-command>');
  await page.locator('#cp').evaluate((el) => el.show());
  await page.locator('#cp').evaluate((el) => {
    const item = document.createElement('focsd-command-item');
    item.setAttribute('value', 'two');
    item.textContent = 'Two';
    el.append(item);
  });
  await expect(page.locator('#cp').getByRole('option', { name: 'Two' })).toBeVisible();
});
