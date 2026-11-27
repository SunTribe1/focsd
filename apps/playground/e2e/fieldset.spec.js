import { expect, test } from './fixtures/test.js';
import { mountFixture as mount, openFromReviewFixes, openFromParityReviewFixes } from './fixtures/pages.js';

// Re-homed from review-fixes.spec.js (Q48).

test('fields re-enable after their fieldset is re-enabled', async ({ page }) => {
  await openFromReviewFixes(page);
  await mount(
    page,
    `<form id="f"><fieldset id="fs">
    <focsd-text-field id="t" label="Name" name="n" value="x"></focsd-text-field>
    <focsd-select id="s" label="Pick" name="p" value="a"><focsd-option value="a">A</focsd-option></focsd-select>
  </fieldset></form>`,
  );
  await page.evaluate(() => {
    document.getElementById('fs').disabled = true;
  });
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeDisabled();
  await page.evaluate(() => {
    document.getElementById('fs').disabled = false;
  });
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeEnabled();
  expect(
    await page.evaluate(() => [
      document.getElementById('t').hasAttribute('disabled'),
      document.getElementById('s').hasAttribute('disabled'),
    ]),
  ).toEqual([false, false]);
  expect(await page.evaluate(() => Object.fromEntries(new FormData(document.getElementById('f'))))).toEqual({ n: 'x', p: 'a' });
});

// Re-homed from parity-review-fixes.spec.js (Q48).

test('a control the author disabled while the fieldset was disabled stays disabled', async ({ page }) => {
  await openFromParityReviewFixes(page);

  const disabled = await page.evaluate(async () => {
    const fs = document.getElementById('pt-fs');
    const text = document.getElementById('pt-fs-text');
    fs.disabled = true;
    await fs.updateComplete;
    text.disabled = true;
    await text.updateComplete;
    await new Promise((r) => setTimeout(r));
    fs.disabled = false;
    await fs.updateComplete;
    await new Promise((r) => setTimeout(r));

    return text.disabled;
  });

  expect(disabled).toBe(true);
});

test('a fieldset disabled from the start re-enables its controls', async ({ page }) => {
  await openFromParityReviewFixes(page);

  const r = await page.evaluate(async () => {
    const fs = document.createElement('focsd-fieldset');
    fs.disabled = true;
    const text = document.createElement('focsd-text-field');
    text.label = 'Late';
    fs.append(text);
    document.body.append(fs);
    await fs.updateComplete;
    const before = text.disabled;
    fs.disabled = false;
    await fs.updateComplete;
    await new Promise((resolve) => setTimeout(resolve));

    return [before, text.disabled];
  });

  expect(r).toEqual([true, false]);
});
