// cspell:ignore anad eine hier ablegen
import { expect, ready, test } from './fixtures/test.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/tags.html');
  await page.waitForFunction(() => customElements.get('focsd-tag-input'));
});

const input = (page, id = 't') => page.locator(`#${id}`).getByRole('textbox');
const tags = (page, id = 't') => page.locator(`#${id}`).getByRole('listitem');

const paste = (page, id, text) =>
  page.locator(`#${id}`).evaluate((el, t) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', t);
    // Firefox ignores clipboardData in the ClipboardEvent constructor; the component only reads the property.
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: dt });
    el.shadowRoot.querySelector('input').dispatchEvent(event);
  }, text);

test('Enter, comma and Tab commit trimmed tags; duplicates are refused and announced', async ({ page }) => {
  await input(page).fill('  Lit ');
  await input(page).press('Enter');
  await input(page).pressSequentially('JS,');
  await input(page).fill('Rust');
  await input(page).press('Tab');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['CSS', 'HTML', 'Lit', 'JS', 'Rust']);
  await expect(tags(page)).toHaveText(['CSS', 'HTML', 'Lit', 'JS', 'Rust']);
  await page.locator('#t').evaluate((el) => (el.values = ['CSS']));
  await input(page).fill('css');
  await input(page).press('Enter');
  await expect(page.locator('#t').locator('[part~="status"]')).toHaveText('css is already added');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['CSS']);
});

test('paste splits on separators and new lines, up to max', async ({ page }) => {
  await paste(page, 't', 'Go, Rust\nZig, Elm');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['CSS', 'HTML', 'Go', 'Rust', 'Zig']);
  await expect(page.locator('#t').locator('[part~="status"]')).toHaveText('Maximum of 5 selected.');
});

test('Backspace walks into tags and removes them; focus lands sensibly', async ({ page }) => {
  await input(page).focus();
  await input(page).press('Backspace');
  await expect(page.getByRole('button', { name: 'Remove HTML' })).toBeFocused();
  await page.keyboard.press('Backspace');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['CSS']);
  await expect(page.getByRole('button', { name: 'Remove CSS' })).toBeFocused();
  await expect(page.locator('#t').locator('[part~="status"]')).toHaveText('HTML removed');
  await page.keyboard.press('ArrowRight');
  await expect(input(page)).toBeFocused();
});

test('clicking a remove button removes that tag', async ({ page }) => {
  await page.getByRole('button', { name: 'Remove CSS' }).click();
  await expect(page.locator('#t')).toHaveJSProperty('values', ['HTML']);
  await expect(input(page)).toBeFocused();
});

test('suggestions behave like a combobox and add the option value', async ({ page }) => {
  const box = page.locator('#ts').getByRole('combobox', { name: 'Languages' });
  await box.fill('fre');
  await page.keyboard.press('ArrowDown');
  await expect(box).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ts')).toHaveJSProperty('values', ['fr']);
  await expect(tags(page, 'ts')).toHaveText(['French']);
  await expect(box).toHaveValue('');
});

test('form gets one entry per tag; reset restores', async ({ page }) => {
  await input(page).fill('a,b');
  await input(page).press('Enter');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('#out')).toContainText('["skills","CSS"],["skills","HTML"],["skills","a"],["skills","b"]');
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('#t')).toHaveJSProperty('values', ['CSS', 'HTML']);
});

test('input and change fire once per commit', async ({ page }) => {
  await input(page).fill('x');
  await input(page).press('Enter');
  expect(await page.evaluate(() => window.__events.filter((e) => e.id === 't').map((e) => e.type))).toEqual(['input', 'change']);
});

test('RTL: the back arrow follows reading direction', async ({ page }) => {
  await input(page, 'tr').fill('ا');
  await input(page, 'tr').press('Enter');
  await input(page, 'tr').press('ArrowRight');
  await expect(page.locator('#tr').getByRole('button', { name: /ا/ })).toBeFocused();
});

test('required with no tags is valueMissing', async ({ page }) => {
  await page.locator('#ts').evaluate((el) => (el.required = true));
  expect(await page.locator('#ts').evaluate((el) => el.validity.valueMissing)).toBe(true);
});

// Re-homed from deferred-minors.spec.js (Q48).

// Deferred minor findings: tag input focus and paste, phone restore and list cost, currency
// setRangeText and the file upload drop text.
const openTagInputFromDeferredMinors = async (page) => {
  await page.goto('/tags.html');
  await ready(page, 'focsd-tag-input');
};

test('the tags are one tab stop; arrows move between them', async ({ page }) => {
  await openTagInputFromDeferredMinors(page);
  const css = page.getByRole('button', { name: 'Remove CSS' });
  const htmlTag = page.getByRole('button', { name: 'Remove HTML' });
  await page.locator('#t').evaluate((el) => el.insertAdjacentHTML('beforebegin', '<button id="before" tabindex="0">Before</button>'));
  await input(page).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(htmlTag).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(css).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(input(page)).toBeFocused();
  // Back in, focus returns to the tag last visited.
  await page.keyboard.press('Shift+Tab');
  await expect(css).toBeFocused();
  // One more Shift+Tab leaves the tags (and the component) instead of visiting each tag.
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#before')).toBeFocused();

  const stops = await page
    .locator('#t')
    .evaluate((el) => [...el.shadowRoot.querySelectorAll('[part~="remove"]')].filter((b) => b.tabIndex >= 0).length);

  expect(stops).toBe(1);
  // Removal and names are unchanged.
  await page.keyboard.press('Tab');
  await expect(css).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['HTML']);
  await expect(htmlTag).toBeFocused();
});

test('paste goes in at the caret', async ({ page }) => {
  await openTagInputFromDeferredMinors(page);
  await page.locator('#t').evaluate((el) => (el.values = []));
  await input(page).fill('Lisp');
  await input(page).evaluate((el) => el.setSelectionRange(0, 0));
  await paste(page, 't', 'Go,');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['Go', 'Lisp']);
  await expect(input(page)).toHaveValue('');
});

test('paste replaces the selected text', async ({ page }) => {
  await openTagInputFromDeferredMinors(page);
  await page.locator('#t').evaluate((el) => (el.values = []));
  await input(page).fill('abc');
  await input(page).evaluate((el) => el.setSelectionRange(1, 2));
  await paste(page, 't', 'x,y');
  await expect(page.locator('#t')).toHaveJSProperty('values', ['ax', 'yc']);
});

test('a suggestion whose value holds the separator becomes one tag', async ({ page }) => {
  await openTagInputFromDeferredMinors(page);
  const box = page.locator('#tc').getByRole('combobox', { name: 'Cities' });
  await box.fill('new');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.locator('#tc')).toHaveJSProperty('values', ['New York NY']);
  await expect(page.locator('#tc').getByRole('listitem')).toHaveText(['New York, NY']);
  // Once chosen it is no longer suggested.
  await box.fill('n');
  await expect(page.locator('#tc [part~="option"]')).toHaveCount(0);
});

test('chosen tags are hidden from suggestions whatever their case', async ({ page }) => {
  await openTagInputFromDeferredMinors(page);
  await page.locator('#ts').evaluate((el) => (el.values = ['DE']));
  await page.locator('#ts').getByRole('combobox').fill('e');
  await expect(page.locator('#ts [part~="option"]')).toHaveText(['French', 'Japanese']);
});
