import { expect, test } from './fixtures/test.js';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/editor.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-rich-text')));
  await page.evaluate(() => document.getElementById('notes').updateComplete);
});

const editable = (page, id) => page.locator(`#${id} [contenteditable]`);
const toolbar = (page, id) => page.locator(`#${id}`).getByRole('toolbar');

test('a named, multi-line text box with a labelled toolbar and the initial value', async ({ page }) => {
  await expect(page.getByRole('textbox', { name: 'Release notes' })).toBeVisible();
  await expect(editable(page, 'notes')).toHaveAttribute('aria-multiline', 'true');
  await expect(editable(page, 'notes')).toHaveAttribute('aria-description', 'Shown to customers');
  await expect(toolbar(page, 'notes')).toHaveAccessibleName('Formatting');
  await expect(editable(page, 'notes')).toContainText('Hi there');
  expect(await page.evaluate(() => document.getElementById('notes').value)).toBe('<p>Hi there</p>');
});

test('typing updates value, form data and fires input', async ({ page }) => {
  await page.evaluate(() => {
    window.__inputs = 0;
    document.getElementById('notes').addEventListener('input', () => (window.__inputs += 1));
  });
  await editable(page, 'notes').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' and welcome');

  const r = await page.evaluate(() => [
    document.getElementById('notes').value,
    new FormData(document.getElementById('ef')).get('notes'),
    window.__inputs,
  ]);

  expect(r[0]).toBe('<p>Hi there and welcome</p>');
  expect(r[1]).toBe(r[0]);
  expect(r[2]).toBeGreaterThan(0);
});

test('keyboard shortcut and toolbar formatting, with pressed state', async ({ page }) => {
  await editable(page, 'notes').click();
  await expect(editable(page, 'notes')).toBeFocused();
  await page.keyboard.press('End');
  await expect.poll(() => page.evaluate(() => document.getElementById('notes').editor.state.selection.from)).toBe(9);
  await page.keyboard.press('ControlOrMeta+b');
  await page.keyboard.type(' bold');
  await expect(toolbar(page, 'notes').getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
  await toolbar(page, 'notes').getByRole('button', { name: 'Heading 2' }).click();
  const value = await page.evaluate(() => document.getElementById('notes').value);
  expect(value).toBe('<h2>Hi there<strong> bold</strong></h2>');
});

test('the toolbar is one tab stop with arrow-key navigation', async ({ page }) => {
  const bold = toolbar(page, 'notes').getByRole('button', { name: 'Bold' });
  await bold.focus();
  await page.keyboard.press('ArrowRight');
  await expect(toolbar(page, 'notes').getByRole('button', { name: 'Italic' })).toBeFocused();
  await page.keyboard.press('End');
  await expect(toolbar(page, 'notes').getByRole('button', { name: 'Redo' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(bold).toBeFocused();

  const stops = await page
    .locator('#notes')
    .evaluate((el) => el.shadowRoot.querySelectorAll('[role="toolbar"] button[tabindex="0"]').length);

  expect(stops).toBe(1);
});

test('links: only safe URLs are applied', async ({ page }) => {
  await editable(page, 'notes').click();
  await page.keyboard.press('ControlOrMeta+a');
  await toolbar(page, 'notes').getByRole('button', { name: 'Link' }).click();
  const url = page.locator('#notes').getByRole('textbox', { name: 'Link address' });
  await url.fill('javascript:alert(1)');
  await url.press('Enter');
  expect(await page.evaluate(() => document.getElementById('notes').value)).not.toContain('href');
  await toolbar(page, 'notes').getByRole('button', { name: 'Link' }).click();
  await url.fill('https://example.com');
  await url.press('Enter');
  expect(await page.evaluate(() => document.getElementById('notes').value)).toContain('href="https://example.com"');
});

test('scripts and event handlers never survive', async ({ page }) => {
  const value = await page.evaluate(async () => {
    const el = document.getElementById('notes');
    el.value = '<p>ok<script>window.__pwned=1</script><img src=x onerror="window.__pwned=1"><a href="javascript:alert(1)">x</a></p>';
    await el.updateComplete;

    return el.value;
  });

  expect(value).not.toMatch(/script|onerror|javascript:/i);
  expect(await page.evaluate(() => window.__pwned ?? 0)).toBe(0);
});

test('required, reset and disabled behave like native controls', async ({ page }) => {
  expect(await page.evaluate(() => document.getElementById('req').validity.valueMissing)).toBe(true);
  await editable(page, 'notes').click();
  await page.keyboard.type('changed ');
  await page.locator('#ef-reset').click();
  expect(await page.evaluate(() => document.getElementById('notes').value)).toBe('<p>Hi there</p>');
  await expect(editable(page, 'off')).toHaveAttribute('contenteditable', 'false');
  await expect(toolbar(page, 'off').getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-disabled', 'true');
});

test('no WCAG 2.2 AA violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
});

// Final-review fixes.

test('keeps working and keeps edits after being moved in the DOM', async ({ page }) => {
  await editable(page, 'notes').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' friend');
  await page.evaluate(() => {
    const el = document.getElementById('notes');
    el.parentElement.append(el);
  });
  await expect.poll(() => page.evaluate(() => document.getElementById('notes').value)).toBe('<p>Hi there friend</p>');
  await editable(page, 'notes').click();
  await page.keyboard.press('End');
  await page.keyboard.type('!');
  await expect.poll(() => page.evaluate(() => document.getElementById('notes').value)).toBe('<p>Hi there friend!</p>');
  await expect(toolbar(page, 'notes').getByRole('button', { name: 'Bold' })).toBeEnabled();
});

test('a read-only required empty editor does not block the form', async ({ page }) => {
  await page.evaluate(() => {
    const el = document.getElementById('req');
    el.readOnly = true;

    return el.updateComplete;
  });
  await expect.poll(() => page.evaluate(() => document.getElementById('req').validity.valid)).toBe(true);
});

test('a host aria-label names the editor when there is no label', async ({ page }) => {
  await page.evaluate(() => {
    const el = document.createElement('focsd-rich-text');
    el.id = 'aria-only';
    el.setAttribute('aria-label', 'Comment');
    document.querySelector('main').append(el);

    return el.updateComplete;
  });
  await expect(page.getByRole('textbox', { name: 'Comment' })).toBeVisible();
});

test('a host aria-labelledby and aria-describedby name and describe the editor', async ({ page }) => {
  await page.evaluate(() => {
    const main = document.querySelector('main');
    main.insertAdjacentHTML('beforeend', '<h2 id="ext-name">Feedback</h2><p id="ext-desc">Be kind</p>');
    const el = document.createElement('focsd-rich-text');
    el.setAttribute('aria-labelledby', 'ext-name');
    el.setAttribute('aria-describedby', 'ext-desc');
    el.id = 'by-ref';
    main.append(el);

    return el.updateComplete;
  });
  await expect(page.getByRole('textbox', { name: 'Feedback' })).toHaveAccessibleDescription('Be kind');
});

test('content styles apply when the editor is inside another shadow root', async ({ page }) => {
  const style = await page.evaluate(async () => {
    const outer = document.createElement('div');
    document.querySelector('main').append(outer);
    const root = outer.attachShadow({ mode: 'open' });
    root.innerHTML = '<focsd-rich-text label="Inner" placeholder="Type here"></focsd-rich-text>';
    const el = root.querySelector('focsd-rich-text');
    await el.updateComplete;
    await new Promise((r) => requestAnimationFrame(r));
    const content = el.querySelector('[contenteditable]');
    const p = content.querySelector('p');

    return { whiteSpace: getComputedStyle(content).whiteSpace, placeholder: getComputedStyle(p, '::before').content };
  });

  expect(style.whiteSpace).toMatch(/^(pre-wrap|break-spaces)$/);
  expect(style.placeholder).toBe('"Type here"');
});

// Deferred minors.

test('links keep only a safe href: pasted class, target and rel are dropped', async ({ page }) => {
  const value = await page.evaluate(async () => {
    const el = document.getElementById('notes');
    el.value = '<p><a href="https://example.com" class="evil" target="_blank" rel="" style="color:red">x</a></p>';
    await el.updateComplete;

    return el.value;
  });

  expect(value).not.toMatch(/class=|target=|style=/);
  expect(value).toContain('href="https://example.com"');
  expect(value).toContain('rel="noopener noreferrer nofollow"');
});

test('value is cleaned even before the editor exists', async ({ page }) => {
  const value = await page.evaluate(() => {
    const el = document.createElement('focsd-rich-text');
    el.value = '<p onclick="alert(1)">Hi<script>alert(1)</script> <a href="javascript:alert(1)">x</a></p>';

    return el.value;
  });

  expect(value).not.toMatch(/script|onclick|javascript:/);
  expect(value).toContain('Hi');
});

test('the link form closes and cannot apply once the editor is disabled', async ({ page }) => {
  await editable(page, 'notes').click();
  await page.keyboard.press('ControlOrMeta+a');
  await toolbar(page, 'notes').getByRole('button', { name: 'Link' }).click();
  await expect(page.locator('#notes').getByRole('textbox', { name: /address/i })).toBeVisible();
  await page.evaluate(() => {
    document.getElementById('notes').disabled = true;

    return document.getElementById('notes').updateComplete;
  });
  await expect(page.locator('#notes').getByRole('textbox', { name: /address/i })).toHaveCount(0);
  expect(await page.evaluate(() => document.getElementById('notes').value)).not.toContain('<a');
});

test('error uses the shared accessor: no empty attribute, validity follows it in the same task', async ({ page }) => {
  const result = await page.locator('#notes').evaluate(async (el) => {
    const fresh = el.hasAttribute('error');

    el.error = 'Add release notes';
    const now = { valid: el.checkValidity(), message: el.validationMessage };

    await el.updateComplete;
    const invalid = el.querySelector('[contenteditable]').getAttribute('aria-invalid');

    el.error = '';
    const after = el.checkValidity();

    await el.updateComplete;

    return { fresh, ...now, invalid, after, attr: el.hasAttribute('error') };
  });

  expect(result).toEqual({ fresh: false, valid: false, message: 'Add release notes', invalid: 'true', after: true, attr: false });
});

test('the toolbar draws its icons without loading the icon sanitizer (B11 fix I1)', async ({ page }) => {
  const sanitizer = [];
  page.on('request', (request) => {
    if (/icon-sources|svg-sanitize/.test(request.url())) sanitizer.push(request.url());
  });
  await page.goto('/editor.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-rich-text')));
  await page.evaluate(() => document.getElementById('notes').updateComplete);
  await expect(toolbar(page, 'notes').getByRole('button', { name: 'Bold' }).locator('svg path')).toHaveCount(1);
  expect(sanitizer).toEqual([]);
});
