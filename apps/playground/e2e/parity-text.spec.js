import { expect, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-text-field')));
});

const inner = (page, id) => page.locator(`#${id}`).locator('[part~="control"]').first();

test('constraint and keyboard attributes reach the inner input and validate natively', async ({ page }) => {
  await page.evaluate(async () => {
    const el = document.getElementById('pt-name');
    Object.assign(el, {
      minlength: 3,
      maxlength: 8,
      pattern: '[A-Za-z]+',
      size: 12,
      inputMode: 'email',
      enterKeyHint: 'send',
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: false,
    });
    await el.updateComplete;
  });
  const input = inner(page, 'pt-name');

  for (const [attr, value] of [
    ['minlength', '3'],
    ['maxlength', '8'],
    ['pattern', '[A-Za-z]+'],
    ['size', '12'],
    ['inputmode', 'email'],
    ['enterkeyhint', 'send'],
    ['autocapitalize', 'off'],
    ['autocorrect', 'off'],
    ['spellcheck', 'false'],
  ]) {
    await expect(input, attr).toHaveAttribute(attr, value);
  }

  await input.fill('a1');
  expect(await page.evaluate(() => document.getElementById('pt-name').validity.patternMismatch)).toBe(true);
  expect(await page.evaluate(() => [document.getElementById('pt-name').minLength, document.getElementById('pt-name').maxLength])).toEqual([
    3, 8,
  ]);
});

test('selection API is delegated to the inner control', async ({ page }) => {
  const result = await page.evaluate(() => {
    const el = document.getElementById('pt-name');
    el.focus();
    el.setSelectionRange(1, 3);
    const range = [el.selectionStart, el.selectionEnd];
    el.setRangeText('XY', 0, 1);
    el.select();

    return { range, value: el.value, all: [el.selectionStart, el.selectionEnd] };
  });

  expect(result).toEqual({ range: [1, 3], value: 'XYda', all: [0, 4] });
});

test('dirname submits the text direction', async ({ page }) => {
  await page.evaluate(async () => {
    const el = document.getElementById('pt-name');
    el.dirname = 'name.dir';
    await el.updateComplete;
  });
  await page.locator('#pt-ro').evaluate((el) => (el.readOnly = false));
  await page.locator('#pt-ro').evaluate(async (el) => {
    el.required = false;
    await el.updateComplete;
  });
  await page.evaluate(() => document.getElementById('pt-terms').removeAttribute('required'));
  await page.locator('#pt-submit').click();
  await expect(page.locator('#pt-result')).toContainText('"name.dir":"ltr"');
});

test('textarea forwards cols and wrap and reports textLength', async ({ page }) => {
  await page.evaluate(async () => {
    const el = document.getElementById('pt-notes');
    Object.assign(el, { cols: 30, wrap: 'hard', value: 'hello' });
    await el.updateComplete;
  });
  const area = inner(page, 'pt-notes');
  await expect(area).toHaveAttribute('cols', '30');
  await expect(area).toHaveAttribute('wrap', 'hard');
  expect(await page.evaluate(() => document.getElementById('pt-notes').textLength)).toBe(5);
});

test('number field: valueAsNumber, stepUp and stepDown', async ({ page }) => {
  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-qty');
    el.max = 5;
    const start = el.valueAsNumber;
    el.stepUp(2);
    const up = el.valueAsNumber;
    el.stepUp(10);
    const capped = el.valueAsNumber;
    el.stepDown();
    el.valueAsNumber = 1.5;
    await el.updateComplete;

    return [start, up, capped, el.value];
  });

  expect(r).toEqual([2, 4, 5, '1.5']);
});
