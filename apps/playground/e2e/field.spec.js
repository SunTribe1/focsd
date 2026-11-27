// cspell:ignore labelable
import { expect, test } from './fixtures/test.js';
import { set } from './fixtures/dom.js';
import { expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/field.html');
  await page.waitForFunction(() => customElements.get('focsd-field'));
});

const email = (page) => page.getByRole('textbox', { name: 'Email' });

test('a native input is named by the label and described by the hint; the field has no role', async ({ page }) => {
  await expect(email(page)).toHaveAccessibleDescription('We reply within one working day');
  await expect(page.locator('#email-field')).not.toHaveAttribute('role');
  await page.getByText('Email', { exact: true }).click();
  await expect(email(page)).toBeFocused();
});

test('error goes into setCustomValidity, blocks submit and clears', async ({ page }) => {
  await set(page, 'email-field', { error: 'Enter a work email' });
  expect(await email(page).evaluate((el) => [el.validity.customError, el.validationMessage])).toEqual([true, 'Enter a work email']);
  await expect(email(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(email(page)).toHaveAccessibleDescription(/We reply within one working day.*Enter a work email/);
  expect(await page.locator('#f').evaluate((f) => f.checkValidity())).toBe(false);
  await set(page, 'email-field', { error: null });
  expect(await page.locator('#f').evaluate((f) => f.checkValidity())).toBe(true);
  await expect(email(page)).not.toHaveAttribute('aria-invalid');
});

test('a non-labelable [slot=control] gets aria-labelledby and aria-invalid', async ({ page }) => {
  const notes = page.getByRole('textbox', { name: 'Delivery notes' });
  await expect(notes).toHaveAttribute('aria-labelledby', /.+/);
  await set(page, 'notes-field', { error: 'Add a gate code' });
  await expect(notes).toHaveAttribute('aria-invalid', 'true');
  await expect(notes).toHaveAccessibleDescription('Add a gate code');
});

test('warning and success describe and are announced, never block', async ({ page }) => {
  await set(page, 'email-field', { warning: 'This looks like a personal address' });
  await expectAnnounced(page, 'This looks like a personal address');
  await set(page, 'email-field', { warning: null, success: 'Address verified' });
  await expectAnnounced(page, 'Address verified');
  expect(await page.locator('#f').evaluate((f) => f.checkValidity())).toBe(true);
});

test('required shows a hidden-from-AT marker; the name stays "Size"', async ({ page }) => {
  await expect(page.locator('#size-field [part~="marker"]')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Size' })).toBeVisible();
});

test('label position start puts the label beside the control and stacks when narrow', async ({ page }) => {
  await set(page, 'email-field', { 'label-position': 'start' });
  const label = await page.locator('#email-field > [data-focsd-field="label"]').boundingBox();
  const input = await email(page).boundingBox();
  expect(label.x + label.width).toBeLessThanOrEqual(input.x + 1);
  await page.setViewportSize({ width: 320, height: 800 });
  const l2 = await page.locator('#email-field > [data-focsd-field="label"]').boundingBox();
  const i2 = await email(page).boundingBox();
  expect(l2.y + l2.height).toBeLessThanOrEqual(i2.y + 1);
});

test('the error summary links to the wrapped control', async ({ page }) => {
  await set(page, 'email-field', { error: 'Enter a work email' });
  await page.locator('#summary').evaluate((s) => s.collect(document.getElementById('f')));
  await page.locator('#summary').getByRole('link', { name: 'Enter a work email' }).click();
  await expect(email(page)).toBeFocused();
});

test('author content is never replaced; generated nodes are marked', async ({ page }) => {
  await expect(page.locator('#email-field > input')).toHaveCount(1);
  await expect(page.locator('#email-field > [data-focsd-field]')).toHaveCount(2); // label, hint
});

test('a form-associated control defined after the field is wired once it upgrades', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const field = document.createElement('focsd-field');
    field.label = 'Late';
    field.hint = 'Hint';
    const el = document.createElement('late-input');
    field.append(el);
    document.body.append(field);
    await field.updateComplete;
    // Let the first slotchange (and the update it causes) settle: the element is defined well after.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    customElements.define(
      'late-input',
      class extends HTMLElement {
        static formAssociated = true;
      },
    );
    await customElements.whenDefined('late-input');
    await new Promise((r) => setTimeout(r));
    await field.updateComplete;

    return [field.querySelector('[data-focsd-field="label"]').localName, el.id !== '', Boolean(el.getAttribute('aria-describedby'))];
  });

  expect(result).toEqual(['label', true, true]);
});

test('an author aria-invalid="false" becomes true with an error and is restored after', async ({ page }) => {
  await page.locator('#email-field input').evaluate((el) => el.setAttribute('aria-invalid', 'false'));
  await set(page, 'email-field', { error: 'Enter a work email' });
  await expect(email(page)).toHaveAttribute('aria-invalid', 'true');
  await set(page, 'email-field', { error: null });
  await expect(email(page)).toHaveAttribute('aria-invalid', 'false');
});

test('a non-string error property does not throw', async ({ page }) => {
  const message = await page.locator('#email-field').evaluate(async (el) => {
    el.error = 42;
    await el.updateComplete;

    return el.control.validationMessage;
  });

  expect(message).toBe('42');
});

test('clearing the error keeps a custom validity the app set, and removes the id the field gave', async ({ page }) => {
  const result = await page.locator('#email-field').evaluate(async (el) => {
    const input = el.control;
    input.removeAttribute('id');
    input.setCustomValidity('App rule');
    el.error = 'Enter a work email';
    await el.updateComplete;
    const idWhileWrapped = input.id !== '';
    el.error = '';
    await el.updateComplete;
    const kept = input.validationMessage;
    el.querySelector(':scope > [data-focsd-field="label"]').remove();
    el.label = '';
    el.removeChild(input);
    await el.updateComplete;

    return [kept, idWhileWrapped, input.hasAttribute('id')];
  });

  expect(result).toEqual(['App rule', true, false]);
});

for (const theme of THEMES)
  test(`axe-clean with every message state in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/field.html', theme, 'focsd-field');
    await set(page, 'email-field', { error: 'Enter a work email' });
    await set(page, 'size-field', { warning: 'Medium sells out first' });
    await set(page, 'notes-field', { success: 'Saved' });
    await expectAxeClean(page);
  });

// 14a-9: a show-password button beside the input is not a second control.
test('only form controls count toward the one-control warning; buttons, meters and outputs do not', async ({ page }) => {
  const warnings = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning' && msg.text().includes('wraps one control')) warnings.push(msg.text());
  });

  const mount = (html) =>
    page.evaluate(async (markup) => {
      const host = document.createElement('div');
      host.innerHTML = markup;
      document.body.append(host);
      await host.querySelector('focsd-field').updateComplete;
    }, html);

  await mount(
    '<focsd-field label="Password"><input type="password"><button type="button">Show</button><input type="button" value="Copy"><meter value="0.5"></meter><output>Weak</output></focsd-field>',
  );
  // Console messages arrive asynchronously: a sentinel logged after the mount proves every earlier message is in.
  await page.evaluate(() => console.warn('wraps one control: sentinel'));
  await expect.poll(() => warnings.at(-1)).toBe('wraps one control: sentinel');
  expect(warnings).toEqual(['wraps one control: sentinel']);
  await mount('<focsd-field label="Name"><input><select><option>One</option></select></focsd-field>');
  await expect.poll(() => warnings.length).toBe(2);
});

test('the first form control is the one labelled, even after a button', async ({ page }) => {
  await page.evaluate(async () => {
    const host = document.createElement('div');
    host.innerHTML = '<focsd-field id="card-field" label="Card number"><button type="button">Scan</button><input></focsd-field>';
    document.body.append(host);
    await host.querySelector('focsd-field').updateComplete;
  });
  await expect(page.locator('#card-field').getByRole('textbox', { name: 'Card number' })).toBeVisible();
  await expect(page.locator('#card-field').getByRole('button')).toHaveAccessibleName('Scan');
});

test('an aria-invalid the author changes during an error is kept, during and after it', async ({ page }) => {
  await set(page, 'email-field', { error: 'Enter a work email' });
  await page.locator('#email-field input').evaluate((el) => el.setAttribute('aria-invalid', 'spelling'));
  await set(page, 'email-field', { hint: 'Any address works' });
  await expect(email(page)).toHaveAttribute('aria-invalid', 'spelling');
  await set(page, 'email-field', { error: null });
  await expect(email(page)).toHaveAttribute('aria-invalid', 'spelling');
});

test('a custom validity the app sets during an error is the one left after it clears', async ({ page }) => {
  const result = await page.locator('#email-field').evaluate(async (el) => {
    const input = el.control;
    input.setCustomValidity('Old rule');
    el.error = 'Enter a work email';
    await el.updateComplete;
    input.setCustomValidity('New rule');
    el.hint = 'Any address works';
    await el.updateComplete;
    const during = input.validationMessage;
    el.error = '';
    await el.updateComplete;

    return [during, input.validationMessage];
  });

  expect(result).toEqual(['Enter a work email', 'New rule']);
});

// 14a-10 I-3: a Focsd control (form-associated, with its input in a shadow root) is named by the
// field's label and described by its current hint and message, even when only the text changes.
test('a wrapped focsd-text-field is named and described through its shadow input', async ({ page }) => {
  await page.evaluate(async () => {
    const host = document.createElement('div');
    host.innerHTML =
      '<focsd-field id="tf-field" label="Work email" hint="We reply within a day"><focsd-text-field name="work"></focsd-text-field></focsd-field>';
    document.body.append(host);
    await customElements.whenDefined('focsd-text-field');
    await host.querySelector('focsd-field').updateComplete;
  });
  const input = page.locator('#tf-field').getByRole('textbox');
  await expect(input).toHaveAccessibleName('Work email');
  await expect(input).toHaveAccessibleDescription('We reply within a day');
  await set(page, 'tf-field', { error: 'Too short' });
  await expect(input).toHaveAccessibleDescription(/Too short/);
  await set(page, 'tf-field', { error: 'Already taken' });
  await expect(input).toHaveAccessibleDescription(/Already taken/);
  await expect(input).not.toHaveAccessibleDescription(/Too short/);
  await set(page, 'tf-field', { hint: 'Use your company address' });
  await expect(input).toHaveAccessibleDescription(/Use your company address/);
});

// 14a-10 M-19: a label with nothing to wire is reported once, not left silently unattached.
test('a field with a label but no direct control warns once', async ({ page }) => {
  const warnings = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning' && msg.text().includes('focsd-field')) warnings.push(msg.text());
  });
  await page.evaluate(async () => {
    const host = document.createElement('div');
    host.innerHTML = '<focsd-field label="Name"><div><input></div></focsd-field>';
    document.body.append(host);
    await host.querySelector('focsd-field').updateComplete;
    console.warn('focsd-field sentinel');
  });
  await expect.poll(() => warnings.at(-1)).toBe('focsd-field sentinel');
  expect(warnings).toHaveLength(2);
  expect(warnings[0]).toContain('no control');
});
