import { expect, settle, test } from './fixtures/test.js';
import { ev as events } from './fixtures/dom.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/editable.html');
  await page.waitForFunction(() => customElements.get('focsd-editable') && window.__ready);
});

const display = (page, name) => page.getByRole('button', { name });

test('display mode is a button named with label, value and "edit"', async ({ page }) => {
  await expect(display(page, 'Project name: Atlas, edit')).toBeVisible();
  await expect(display(page, 'Description: Add a description, edit')).toBeVisible();
});

test('Enter opens a text field with the text selected; Enter commits; focus returns', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').focus();
  await page.keyboard.press('Enter');
  const field = page.getByRole('textbox', { name: 'Project name' });
  await expect(field).toBeFocused();
  expect(await field.evaluate((el) => [el.selectionStart, el.selectionEnd])).toEqual([0, 5]);
  await page.keyboard.type('Atlas 2');
  expect(await events(page)).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(display(page, 'Project name: Atlas 2, edit')).toBeFocused();
  expect(await events(page)).toEqual([{ id: 'e', type: 'change' }]);
});

test('one input and one change per committed edit; none when nothing changed', async ({ page }) => {
  await page.evaluate(() => {
    window.__all = [];

    for (const type of ['input', 'change']) document.getElementById('e').addEventListener(type, () => window.__all.push(type));
  });
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.type('Atlas 3');
  await page.keyboard.press('Enter');
  await expect(display(page, 'Project name: Atlas 3, edit')).toBeFocused();
  await display(page, 'Project name: Atlas 3, edit').click();
  await page.keyboard.press('Enter');
  await expect(display(page, 'Project name: Atlas 3, edit')).toBeFocused();
  expect(await page.evaluate(() => window.__all)).toEqual(['input', 'change']);
});

test('Escape restores the value, fires focsd-cancel and returns focus', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.type('Zephyr');
  await page.keyboard.press('Escape');
  await expect(display(page, 'Project name: Atlas, edit')).toBeFocused();
  await expect(page.locator('#e')).toHaveJSProperty('value', 'Atlas');
  expect(await events(page)).toEqual([{ id: 'e', type: 'focsd-cancel' }]);
});

test('Escape does not close a dialog around the editable', async ({ page }) => {
  const kept = await page.evaluate(async () => {
    const dialog = document.createElement('dialog');
    document.body.append(dialog);
    dialog.append(document.getElementById('en'));
    dialog.showModal();
    document.getElementById('en').shadowRoot.querySelector('[part~="display"]').click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    return dialog.open;
  });

  expect(kept).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveJSProperty('open', true);
});

test('blur commits by default; with keep-open-on-blur the draft stays open', async ({ page }) => {
  expect(await page.locator('#e').evaluate((el) => el.keepOpenOnBlur)).toBe(false);
  expect(await page.locator('#en').evaluate((el) => el.keepOpenOnBlur)).toBe(true);
  expect(await page.locator('#en').evaluate((el) => 'submitOnBlur' in el)).toBe(false);
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.type('Orion');
  await page.locator('h1').click();
  await expect(display(page, 'Project name: Orion, edit')).toBeVisible();
  await display(page, 'Code name: Kite, edit').click();
  await page.keyboard.type('Heron');
  await page.locator('h1').click();
  await expect(page.getByRole('textbox', { name: 'Code name' })).toHaveValue('Heron');
  await expect(page.locator('#en')).toHaveJSProperty('value', 'Kite');
});

test('losing the window does not commit', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.type('Nova');
  await page.evaluate(() => {
    document.hasFocus = () => false;
    document.activeElement.shadowRoot.activeElement.blur();
  });
  await settle(page);
  await expect(page.locator('#e')).toHaveJSProperty('editing', true);
  await expect(page.locator('#e')).toHaveJSProperty('value', 'Atlas');
});

test('multiline: Enter is a new line, Ctrl/Meta+Enter commits', async ({ page }) => {
  await display(page, 'Description: Add a description, edit').click();
  await page.keyboard.type('First line');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second line');
  await expect(page.locator('#em')).toHaveJSProperty('editing', true);
  await page.keyboard.press('ControlOrMeta+Enter');
  await expect(page.locator('#em')).toHaveJSProperty('value', 'First line\nSecond line');
  await expect(page.locator('#em')).toHaveJSProperty('editing', false);
});

test('Enter during IME composition does not commit', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();

  const stayed = await page.evaluate(() => {
    const input = document.getElementById('e').shadowRoot.querySelector('[part~="editor"]').shadowRoot.querySelector('input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, composed: true, cancelable: true }));

    return document.getElementById('e').editing;
  });

  expect(stayed).toBe(true);
});

test('an invalid value stays in edit mode with the error shown', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter');
  const field = page.getByRole('textbox', { name: 'Project name' });
  await expect(field).toBeFocused();
  await expect(field).toHaveAccessibleDescription('Error: Enter a value.');
  await expect(page.locator('#e')).toHaveJSProperty('value', 'Atlas');
});

test('submits the committed value; reset restores it and leaves edit mode', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.type('Vega');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["project","Vega"]');
  await display(page, 'Project name: Vega, edit').click();
  await page.keyboard.type('Draft');
  await page.evaluate(() => document.getElementById('f').reset());
  await expect(display(page, 'Project name: Atlas, edit')).toBeVisible();
  await expect(page.locator('#e')).toHaveJSProperty('editing', false);
});

test('non-string values and author ARIA do not break it', async ({ page }) => {
  const name = await page.evaluate(async () => {
    const el = document.getElementById('en');
    el.value = 42;
    await el.updateComplete;

    return el.value;
  });

  expect(name).toBe('42');
  await expect(display(page, 'Code name: 42, edit')).toBeVisible();
  await page.evaluate(() => document.getElementById('en').setAttribute('aria-label', 'Rename'));
  await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible();
});

test('a host error does not block committing a fix', async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById('e').error = 'Name taken';
  });
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.type('Nova');
  await page.keyboard.press('Enter');
  await expect(page.locator('#e')).toHaveJSProperty('editing', false);
  await expect(page.locator('#e')).toHaveJSProperty('value', 'Nova');
  expect(await events(page)).toEqual([{ id: 'e', type: 'change' }]);
});

test('readonly shows the value and never opens the editor', async ({ page }) => {
  await page.evaluate(() => document.getElementById('en').setAttribute('readonly', ''));
  const box = page.getByRole('textbox', { name: 'Code name' });
  await expect(box).toHaveAttribute('aria-readonly', 'true');
  await box.click();
  await page.keyboard.press('Enter');
  await expect(page.locator('#en')).toHaveJSProperty('editing', false);
  await page.evaluate(() => document.getElementById('en').removeAttribute('readonly'));
  await display(page, 'Code name: Kite, edit').click();
  await page.evaluate(() => document.getElementById('en').setAttribute('readonly', ''));
  await expect(page.locator('#en')).toHaveJSProperty('editing', false);
});

test('reset while editing returns focus to the button', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.type('Draft');
  await page.evaluate(() => document.getElementById('f').reset());
  await expect(display(page, 'Project name: Atlas, edit')).toBeFocused();
});

test('disabling while editing closes the editor without a Lit warning', async ({ page }) => {
  const warnings = [];
  page.on('console', (m) => {
    if (/change-in-update|update after an update/i.test(m.text())) warnings.push(m.text());
  });
  await display(page, 'Project name: Atlas, edit').click();
  await page.evaluate(() => document.getElementById('e').setAttribute('disabled', ''));
  await expect(page.locator('#e')).toHaveJSProperty('editing', false);
  await settle(page);
  expect(warnings).toEqual([]);
});

test('a refused blur commit keeps the editor open with the error', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.press('Backspace');
  await page.locator('h1').click();
  await expect(page.locator('#e')).toHaveJSProperty('editing', true);
  await expect(page.locator('#e [part~="message"]')).toContainText('Enter a value.');
  await expect(page.locator('#e')).toHaveJSProperty('value', 'Atlas');
});

test('keyCode 229 keydown (IME) does not commit', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();

  const stayed = await page.evaluate(() => {
    const input = document.getElementById('e').shadowRoot.querySelector('[part~="editor"]').shadowRoot.querySelector('input');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, composed: true, cancelable: true }));

    return document.getElementById('e').editing;
  });

  expect(stayed).toBe(true);
});

test('host aria-describedby reaches the inner input while editing', async ({ page }) => {
  await page.evaluate(() => {
    document.body.insertAdjacentHTML('beforeend', '<p id="why" hidden>Shown on invoices</p>');
    document.getElementById('e').setAttribute('aria-describedby', 'why');
  });
  await display(page, 'Project name: Atlas, edit').click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveAccessibleDescription(/Shown on invoices/);
});

test('removing the host aria-label after an edit does not restore a stale name', async ({ page }) => {
  await page.evaluate(() => document.getElementById('e').setAttribute('aria-label', 'Rename'));
  await page.getByRole('button', { name: 'Rename' }).click();
  await page.keyboard.type('Vega');
  await page.keyboard.press('Enter');
  await page.evaluate(() => document.getElementById('e').removeAttribute('aria-label'));
  await expect(display(page, 'Project name: Vega, edit')).toBeVisible();
});

test('read-only keeps the host description', async ({ page }) => {
  await page.evaluate(() => {
    const el = document.getElementById('en');
    el.setAttribute('aria-description', 'Internal name');
    el.setAttribute('readonly', '');
  });
  await expect(page.getByRole('textbox', { name: 'Code name' })).toHaveAccessibleDescription(/Internal name/);
});

for (const theme of THEMES)
  test(`axe-clean, display and editing, in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/editable.html', theme, 'focsd-editable');
    await expectAxeClean(page);
    await display(page, 'Project name: Atlas, edit').click();
    await expectAxeClean(page);
  });

// 14a-10 M-17: a value set by a script while editing replaces the draft, as on a native input.
test('a value set while editing shows in the editor and is not overwritten by the draft', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();
  await page.keyboard.type('Atlas 2');
  await page.locator('#e').evaluate(async (el) => {
    el.value = 'Borealis';
    await el.updateComplete;
  });
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Borealis');
  await page.keyboard.press('Enter');
  await expect(page.locator('#e')).toHaveJSProperty('value', 'Borealis');
  expect(await events(page)).toEqual([]);
});

// 14a-10 M-18: disabled while the editor has focus: no focus call on the now-disabled button.
test('disabling while editing does not try to focus the disabled button', async ({ page }) => {
  await display(page, 'Project name: Atlas, edit').click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toBeFocused();

  const calls = await page.locator('#e').evaluate(async (el) => {
    let count = 0;
    const original = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function focus(...args) {
      if (this.getAttribute?.('part')?.includes('display')) count += 1;

      return original.apply(this, args);
    };

    el.disabled = true;
    await el.updateComplete;
    await el.updateComplete;
    HTMLElement.prototype.focus = original;

    return count;
  });

  expect(calls).toBe(0);
  await expect(page.locator('#e')).not.toHaveAttribute('editing');
});
