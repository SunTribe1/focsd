import { expect, test } from './fixtures/test.js';
import { announcements, expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/consistent-inputs.html');
  await page.waitForFunction(() => window.__ready === true);
});

test('a fresh control reflects no empty message or position attributes', async ({ page }) => {
  const attrs = await page
    .locator('#tf')
    .evaluate((el) => ['error', 'warning', 'success', 'label-position'].filter((a) => el.hasAttribute(a)));

  expect(attrs).toEqual([]);
});

test('error set as a property blocks validity right away', async ({ page }) => {
  const result = await page.locator('#tf').evaluate((el) => {
    el.error = 'Enter your full name';
    const now = { valid: el.checkValidity(), message: el.validationMessage };
    el.error = '';

    return { ...now, after: el.checkValidity() };
  });

  expect(result).toEqual({ valid: false, message: 'Enter your full name', after: true });
});

test('collect() finds an error set as a property in the same task', async ({ page }) => {
  const items = await page.evaluate(() => {
    const field = document.getElementById('ta');
    field.error = 'Required';

    return document.getElementById('summary').collect(document.getElementById('f'));
  });

  expect(items).toEqual([{ field: 'ta', message: 'Required' }]);
});

test('the message names its kind for assistive tech, with no padding text', async ({ page }) => {
  const tf = page.locator('#tf');
  await tf.evaluate(async (el) => {
    el.warning = 'Check the spelling';
    await el.updateComplete;
  });
  await expect(tf.locator('[part~="message"]')).toHaveText('Warning: Check the spelling', { useInnerText: false });
  expect(await tf.locator('[part~="message"]').evaluate((p) => p.textContent)).toBe('Warning: Check the spelling');
  await expect(page.getByRole('textbox', { name: 'Full name' })).toHaveAccessibleDescription(/Warning: Check the spelling/);

  await tf.evaluate(async (el) => {
    el.warning = '';
    el.success = 'Username available';
    await el.updateComplete;
  });
  await expectAnnounced(page, 'Success: Username available');
  expect((await announcements(page)).filter((a) => a.text.includes('Username available'))).toHaveLength(1);
});

test('a date picker subclass can override shownMessage and describedByIds', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const Base = customElements.get('focsd-date-picker');

    class Override extends Base {
      get shownMessage() {
        return { kind: 'warning', text: 'From the subclass' };
      }

      describedByIds() {
        return [...super.describedByIds(), 'extra-id'];
      }
    }

    customElements.define('pg-override-date-picker', Override);

    const el = document.createElement('pg-override-date-picker');
    el.setAttribute('label', 'Due date');
    document.getElementById('stage').append(el);
    await el.updateComplete;

    return {
      message: el.shadowRoot.querySelector('[part~="message"]')?.textContent ?? null,
      ids: el.describedByIds(),
      hint: el.messageIds.hint,
    };
  });

  expect(result.message).toBe('Warning: From the subclass');
  expect(result.ids).toEqual([result.hint, expect.any(String), 'extra-id']);
});

test('a blank error is no error: no thick border, and a warning still shows its color', async ({ page }) => {
  const tf = page.locator('#tf');

  const box = () =>
    tf.evaluate(async (el) => {
      await el.updateComplete;
      const s = getComputedStyle(el.shadowRoot.querySelector('[part~="control"]'));

      return { width: s.borderTopWidth, color: s.borderTopColor };
    });

  const plain = await box();

  await tf.evaluate((el) => el.setAttribute('warning', 'Check the spelling'));
  const warned = await box();

  await tf.evaluate((el) => el.setAttribute('error', '   '));
  expect(await tf.evaluate((el) => el.error)).toBeUndefined();
  expect(await tf.evaluate((el) => el.checkValidity())).toBe(true);
  expect(await box()).toEqual(warned);
  await expect(tf.locator('[part~="message"]')).toHaveAttribute('part', /\bwarning\b/);

  await tf.evaluate((el) => {
    el.removeAttribute('warning');
    el.error = ' \n ';
  });
  expect(await tf.evaluate((el) => el.error)).toBeUndefined();
  expect(await box()).toEqual(plain);
});
