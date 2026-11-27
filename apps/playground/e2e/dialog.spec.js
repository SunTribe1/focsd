import { expect, test } from './fixtures/test.js';
import { pressTab } from './fixtures/keys.js';
import {
  mountFixture as mount,
  openFromReviewFixes,
  mountInMain as mountFromMinorsForms,
  openFromMinorsForms,
  openFromParityReviewFixes,
} from './fixtures/pages.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('focsd-dialog'));
});

const openDialog = async (page) => {
  await page.locator('#dlg-open').click();
  await expect(page.getByRole('dialog', { name: 'Remove Lukas Brandt?' })).toBeVisible();
};

test('is closed by default and not in the accessibility tree', async ({ page }) => {
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('opens as a labelled modal dialog with heading, body and actions', async ({ page }) => {
  await openDialog(page);
  await expect(page.getByRole('dialog', { name: 'Remove Lukas Brandt?' })).toMatchAriaSnapshot(`
    - dialog "Remove Lukas Brandt?":
      - heading "Remove Lukas Brandt?" [level=2]
      - paragraph: Lukas loses access to 8 projects immediately. Their files stay in the workspace.
      - button "Keep member"
      - button "Remove Lukas"
  `);
  expect(await page.evaluate(() => document.getElementById('dlg').open)).toBe(true);
});

test('moves focus into the dialog and keeps Tab inside it', async ({ page }) => {
  await openDialog(page);
  const inside = () => page.evaluate(() => document.getElementById('dlg').contains(document.activeElement));
  expect(await inside()).toBe(true);

  for (let i = 0; i < 4; i += 1) {
    await pressTab(page);
    const where = await page.evaluate(() => document.activeElement?.closest?.('#dlg') !== null || document.activeElement === document.body);
    expect(where).toBe(true);
  }
});

test('Escape closes, fires close and returns focus to the opener', async ({ page }) => {
  await openDialog(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#dlg-result')).toHaveText('closed: (dismissed)');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('dlg-open');
});

test('an action marked data-dialog-close closes with its value', async ({ page }) => {
  await openDialog(page);
  await page.getByRole('button', { name: 'Remove Lukas' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#dlg-result')).toHaveText('closed: remove');
  expect(await page.evaluate(() => document.getElementById('dlg').returnValue)).toBe('remove');
});

// Re-homed from review-fixes.spec.js (Q48).

test('dialog returnValue resets between openings', async ({ page }) => {
  await openFromReviewFixes(page);
  await page.locator('#dlg-open').click();
  await page.getByRole('button', { name: 'Remove Lukas' }).click();
  await expect(page.locator('#dlg-result')).toHaveText('closed: remove');
  await page.locator('#dlg-open').click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await expect(page.locator('#dlg-result')).toHaveText('closed: (dismissed)');
});

test('closing an inner dialog does not close the outer one', async ({ page }) => {
  await openFromReviewFixes(page);
  await mount(
    page,
    `<focsd-dialog id="outer-d" headline="Outer"><p>Outer body</p>
    <focsd-dialog id="inner-d" headline="Inner"><focsd-button slot="actions" data-dialog-close value="ok">Inner OK</focsd-button></focsd-dialog></focsd-dialog>`,
  );
  await page.evaluate(() => {
    document.getElementById('outer-d').show();
    document.getElementById('inner-d').show();
  });
  await page.getByRole('button', { name: 'Inner OK' }).click();
  await expect
    .poll(() => page.evaluate(() => [document.getElementById('outer-d').open, document.getElementById('inner-d').open]))
    .toEqual([true, false]);
});

test('opening via the open property restores focus to the previously focused element', async ({ page }) => {
  await openFromReviewFixes(page);
  await page.locator('#btn-plain').focus();
  await page.evaluate(() => {
    document.getElementById('dlg').open = true;
  });
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('btn-plain');
});

// Re-homed from minors-forms.spec.js (Q48).

test('a drag that ends on the backdrop does not close a closedby=any dialog', async ({ page }) => {
  await openFromMinorsForms(page);
  await mountFromMinorsForms(
    page,
    '<focsd-dialog id="dg" headline="Hi" closedby="any"><p id="dg-text">Select this text</p></focsd-dialog>',
  );
  await page.locator('#dg').evaluate((el) => el.show());
  const text = await page.locator('#dg-text').boundingBox();
  await page.mouse.move(text.x + 5, text.y + 5);
  await page.mouse.down();
  await page.mouse.move(5, 5, { steps: 5 });
  await page.mouse.up();
  expect(await page.locator('#dg').evaluate((el) => el.open)).toBe(true);
});

// Re-homed from parity-review-fixes.spec.js (Q48).

test('closedby=none still lets Escape close a listbox inside the dialog', async ({ page }) => {
  await openFromParityReviewFixes(page);
  await page.evaluate(() => document.getElementById('pt-dialog').setAttribute('closedby', 'none'));
  await page.locator('#pt-dialog-open').click();
  await page.locator('#pt-dialog-select [part~="trigger"]').click();
  const listbox = page.locator('#pt-dialog-select [part~="listbox"]');
  await expect(listbox).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(listbox).toBeHidden();
  await expect(page.locator('#pt-dialog dialog')).toBeVisible();
});
