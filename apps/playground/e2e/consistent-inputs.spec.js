import { expect, test } from './fixtures/test.js';
import { set } from './fixtures/dom.js';
import { announcements, expectAnnounced, recordAnnouncements } from './fixtures/announcements.js';
import { THEMES, expectAxeClean, gotoInTheme } from './fixtures/axe.js';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

const role = (id, r, name) => (page) => page.locator(`#${id}`).getByRole(r, { name });

/**
 * labelPart / bodyPart are the boxes the layout test compares (defaults: label / body).
 * invalid: for a role=group or button target (ARIA 1.2: no aria-invalid on either), the inner control(s)
 * that carry aria-invalid, or null when none supports it (the error is then in the description).
 */
const CONTROLS = [
  { id: 'tf', tag: 'focsd-text-field', name: 'Full name', target: role('tf', 'textbox', 'Full name') },
  { id: 'ta', tag: 'focsd-textarea', name: 'Bio', target: role('ta', 'textbox', 'Bio') },
  { id: 'nf', tag: 'focsd-number-field', name: 'Seats', target: role('nf', 'spinbutton', 'Seats') },
  { id: 'sf', tag: 'focsd-search-field', name: 'Search people', target: role('sf', 'searchbox', 'Search people') },
  {
    id: 'pf',
    tag: 'focsd-password-field',
    name: 'Password',
    target: (page) => page.locator('#pf').getByLabel('Password', { exact: true }),
  },
  { id: 'cf', tag: 'focsd-currency-field', name: 'Price', target: role('cf', 'spinbutton', 'Price') },
  {
    id: 'otp',
    tag: 'focsd-otp-field',
    name: 'Code',
    target: role('otp', 'group', 'Code'),
    invalid: (page) => page.locator('#otp [part~="cell"]'),
  },
  { id: 'sel', tag: 'focsd-select', name: /^Region/, target: role('sel', 'button', /^Region/), invalid: null },
  { id: 'cb', tag: 'focsd-combobox', name: 'Country', target: role('cb', 'combobox', 'Country') },
  { id: 'ms', tag: 'focsd-multi-select', name: 'Languages', target: role('ms', 'combobox', 'Languages') },
  {
    id: 'chk',
    tag: 'focsd-checkbox',
    name: 'Send me the newsletter',
    target: role('chk', 'checkbox', 'Send me the newsletter'),
    labelPart: 'text',
    bodyPart: 'control',
    side: true,
  },
  { id: 'rg', tag: 'focsd-radio-group', name: 'Plan', target: role('rg', 'radiogroup', 'Plan') },
  { id: 'seg', tag: 'focsd-segmented-control', name: 'View', target: role('seg', 'radiogroup', 'View') },
  {
    id: 'sw',
    tag: 'focsd-switch',
    name: 'Email alerts',
    target: role('sw', 'switch', 'Email alerts'),
    labelPart: 'label',
    bodyPart: 'control',
    side: true,
  },
  { id: 'sl', tag: 'focsd-slider', name: 'Volume', target: role('sl', 'slider', 'Volume') },
  { id: 'rt', tag: 'focsd-rating', name: 'Rating', target: role('rt', 'radiogroup', 'Rating') },
  { id: 'tg', tag: 'focsd-toggle-group', name: 'Alignment', target: role('tg', 'group', 'Alignment'), invalid: null },
  {
    id: 'tm',
    tag: 'focsd-time-field',
    name: 'Start time',
    target: role('tm', 'group', 'Start time'),
    invalid: (page) => page.locator('#tm').getByRole('spinbutton'),
  },
  { id: 'dp', tag: 'focsd-date-picker', name: 'Start date', target: role('dp', 'textbox', 'Start date') },
  {
    id: 'dr',
    tag: 'focsd-date-range-picker',
    name: 'Trip',
    target: role('dr', 'group', 'Trip'),
    invalid: (page) => page.locator('#dr').getByRole('textbox'),
  },
  { id: 'fu', tag: 'focsd-file-upload', name: 'Attachments', target: role('fu', 'group', 'Attachments'), invalid: null },
  { id: 'cp', tag: 'focsd-color-picker', name: /^Brand color/, target: role('cp', 'button', /^Brand color/), invalid: null },
  { id: 'ti', tag: 'focsd-tag-input', name: 'Skills', target: role('ti', 'textbox', 'Skills') },
  {
    id: 'ph',
    tag: 'focsd-phone-field',
    name: 'Mobile',
    target: role('ph', 'group', 'Mobile'),
    invalid: role('ph', 'textbox', 'Mobile'),
  },
  // 21c: drawing mode has no control that supports aria-invalid (a canvas role=img and buttons); typed mode's field does.
  { id: 'sig', tag: 'focsd-signature-pad', name: 'Signature', target: role('sig', 'group', 'Signature'), invalid: null },
];

test.beforeEach(async ({ page }) => {
  await recordAnnouncements(page);
  await page.goto('/consistent-inputs.html');
  await page.waitForFunction(() => window.__ready === true);
});

/** Set (string) or remove (null) attributes, then wait for the render. */
/** aria-invalid where the control carries it: the target, or a group's inner controls (see `invalid`). */
const expectInvalid = async (page, c, on) => {
  if (c.invalid === undefined) {
    if (on) await expect(c.target(page)).toHaveAttribute('aria-invalid', 'true');
    else await expect(c.target(page)).not.toHaveAttribute('aria-invalid', 'true');

    return;
  }

  await expect(c.target(page)).not.toHaveAttribute('aria-invalid');

  if (c.invalid === null) {
    if (on) await expect(c.target(page)).toHaveAccessibleDescription(/Error: Enter a value we can use/);

    return;
  }

  const inner = c.invalid(page);

  await expect(inner.first()).toBeAttached();
  const every = Array.from({ length: await inner.count() }, () => on);

  await expect.poll(() => inner.evaluateAll((els) => els.map((el) => el.getAttribute('aria-invalid') === 'true'))).toEqual(every);
};

const part = (page, id, name) => page.locator(`#${id}`).locator(`[part~="${name}"]`).first();
const valid = (page, selector) => page.locator(selector).evaluate((el) => el.checkValidity());

/** The label and body boxes of case `c`. */
const labelBox = (page, c) => part(page, c.id, c.labelPart ?? 'label').boundingBox();
const bodyBox = (page, c) => part(page, c.id, c.bodyPart ?? 'body').boundingBox();

/**
 * The default label place (end for a checkbox or switch, top for the others) and, for the
 * others, the narrow stack.
 * @param {{ id: string, side?: boolean, labelPart?: string, bodyPart?: string }} c
 */
function labelPlacementTests(c) {
  // A checkbox or switch puts its label at the end by default and never stacks it; the others
  // put it on top, and a start label stacks on top when the field is narrow.
  if (c.side)
    test('the label is at the end by default', async ({ page }) => {
      const [l, b] = [await labelBox(page, c), await bodyBox(page, c)];
      expect(l.x).toBeGreaterThanOrEqual(b.x + b.width - 1);
    });
  else {
    test('the label is on top by default', async ({ page }) => {
      const [l, b] = [await labelBox(page, c), await bodyBox(page, c)];
      expect(l.y + l.height).toBeLessThanOrEqual(b.y + 1);
    });

    test('a start label stacks on top when the field is narrow', async ({ page }) => {
      await set(page, c.id, { 'label-position': 'start' });
      await page.locator('#stage').evaluate((el) => (el.style.inlineSize = '20rem'));
      const [l, b] = [await labelBox(page, c), await bodyBox(page, c)];
      expect(l.y + l.height).toBeLessThanOrEqual(b.y + 1);
    });
  }
}

for (const c of CONTROLS)
  test.describe(c.tag, () => {
    test('hint, then the shown message, describe the control', async ({ page }) => {
      await set(page, c.id, { hint: 'Shown on your profile', warning: 'Check the spelling' });
      await expect(c.target(page)).toHaveAccessibleDescription(/Shown on your profile.*Check the spelling/);
      await set(page, c.id, { error: 'Enter a value we can use' });
      await expect(c.target(page)).toHaveAccessibleDescription(/Shown on your profile.*Enter a value we can use/);
      await expect(c.target(page)).not.toHaveAccessibleDescription(/Check the spelling/);
    });

    test('only the highest message shows, with its icon', async ({ page }) => {
      await set(page, c.id, { error: 'Taken', warning: 'Unusual', success: 'Available' });
      await expect(page.locator(`#${c.id}`).locator('[part~="message"]')).toHaveCount(1);
      await expect(part(page, c.id, 'message')).toHaveAttribute('part', /\berror\b/);
      await expect(part(page, c.id, 'message-icon')).toBeVisible();
      await set(page, c.id, { error: null });
      await expect(part(page, c.id, 'message')).toHaveAttribute('part', /\bwarning\b/);
      await set(page, c.id, { warning: null });
      await expect(part(page, c.id, 'message')).toHaveAttribute('part', /\bsuccess\b/);
      await set(page, c.id, { success: null });
      await expect(page.locator(`#${c.id}`).locator('[part~="message"]')).toHaveCount(0);
    });

    test('error blocks submit and sets aria-invalid; removing it restores validity', async ({ page }) => {
      expect(await valid(page, '#f')).toBe(true);
      await set(page, c.id, { error: 'Enter a value we can use' });
      expect(await valid(page, `#${c.id}`)).toBe(false);
      expect(await page.locator(`#${c.id}`).evaluate((el) => el.validationMessage)).toBe('Enter a value we can use');
      expect(await valid(page, '#f')).toBe(false);
      await expectInvalid(page, c, true);
      await set(page, c.id, { error: null });
      expect(await valid(page, '#f')).toBe(true);
      await expectInvalid(page, c, false);
    });

    test('a host aria-description reaches the control', async ({ page }) => {
      await set(page, c.id, { 'aria-description': 'Billed monthly' });
      await expect(c.target(page)).toHaveAccessibleDescription(/Billed monthly/);
    });

    test('a disabled fieldset bars the error from validation; enabling restores it', async ({ page }) => {
      await set(page, c.id, { error: 'Enter a value we can use' });
      await page.locator(`#${c.id}`).evaluate(async (el) => {
        const fieldset = document.createElement('fieldset');
        el.before(fieldset);
        fieldset.append(el);
        fieldset.disabled = true;
        await el.updateComplete;
      });
      expect(await page.locator(`#${c.id}`).evaluate((el) => el.isDisabled)).toBe(true);
      expect(await valid(page, '#f')).toBe(true);
      await page.locator(`#${c.id}`).evaluate(async (el) => {
        el.closest('fieldset').disabled = false;
        await el.updateComplete;
      });
      expect(await valid(page, '#f')).toBe(false);
    });

    test('form reset keeps the author error', async ({ page }) => {
      await set(page, c.id, { error: 'Enter a value we can use' });
      await page.locator('#f').evaluate((form) => form.reset());
      await page.locator(`#${c.id}`).evaluate((el) => el.updateComplete);
      await expect(page.locator(`#${c.id}`)).toHaveAttribute('error', 'Enter a value we can use');
      expect(await valid(page, `#${c.id}`)).toBe(false);
      await expectInvalid(page, c, true);
    });

    test('warning and success never block', async ({ page }) => {
      await set(page, c.id, { warning: 'Unusual', success: 'Available' });
      expect(await valid(page, '#f')).toBe(true);
    });

    test('a message set after load is announced politely, once', async ({ page }) => {
      await set(page, c.id, { success: 'Username available' });
      await expectAnnounced(page, 'Username available');
      expect((await announcements(page)).filter((a) => a.text.includes('Username available'))).toHaveLength(1);
    });

    test('the name is the same in every label position', async ({ page }) => {
      for (const position of ['top', 'start', 'end']) {
        await set(page, c.id, { 'label-position': position });
        await expect(c.target(page)).toHaveAccessibleName(c.name);
      }
    });

    labelPlacementTests(c);

    test('label positions: beside, and in RTL', async ({ page }) => {
      await set(page, c.id, { 'label-position': 'start' });
      let [l, b] = [await labelBox(page, c), await bodyBox(page, c)];
      expect(l.x + l.width).toBeLessThanOrEqual(b.x + 1);
      expect(Math.abs(l.y - b.y)).toBeLessThanOrEqual(8);

      await page.locator('#stage').evaluate((el) => el.setAttribute('dir', 'rtl'));
      [l, b] = [await labelBox(page, c), await bodyBox(page, c)];
      expect(l.x).toBeGreaterThanOrEqual(b.x + b.width - 1);
      // Polled: after the earlier resizes the container-query rules can apply a frame after the update.
      const gap = async (fn) => fn(await labelBox(page, c), await bodyBox(page, c));
      await set(page, c.id, { 'label-position': 'end' });
      await expect.poll(() => gap((l2, b2) => b2.x + 1 - (l2.x + l2.width))).toBeGreaterThanOrEqual(0); // end is the left in RTL
      await set(page, c.id, { 'label-position': 'top' });
      await expect.poll(() => gap((l2, b2) => b2.y + 1 - (l2.y + l2.height))).toBeGreaterThanOrEqual(0);
    });
  });

test('built-in help sits between the author hint and the message (R38)', async ({ page }) => {
  await set(page, 'ta', { maxlength: '200', hint: 'Shown on your profile', error: 'Enter a value we can use' });
  await expect(role('ta', 'textbox', 'Bio')(page)).toHaveAccessibleDescription(/^Shown on your profile.*200.*Enter a value we can use$/);
});

test('error summary collects every control with an error and links to it', async ({ page }) => {
  await set(page, 'tf', { error: 'Enter your full name' });
  await set(page, 'rg', { error: 'Choose a plan' });
  await page.locator('#summary').evaluate((s) => s.collect(document.getElementById('f')));
  const links = page.locator('#summary').getByRole('link');
  await expect(links).toHaveText(['Enter your full name', 'Choose a plan']);
  await links.nth(1).click();
  await expect(page.locator('#rg').getByRole('radio', { name: 'Pro' })).toBeFocused();
});

for (const theme of THEMES)
  test(`every control with every message is axe-clean in the ${theme} theme`, async ({ page }) => {
    await gotoInTheme(page, '/consistent-inputs.html', theme, 'focsd-phone-field');
    await page.waitForFunction(() => window.__ready === true);
    await page.evaluate(async () => {
      const kinds = ['error', 'warning', 'success'];
      const all = [...document.querySelectorAll('#f > *')].filter((el) => el.localName.startsWith('focsd-'));
      all.forEach((el, i) => {
        el.setAttribute('hint', 'Shown on your profile');
        el.setAttribute(kinds[i % 3], 'Check this value');
        el.setAttribute('label-position', ['top', 'start', 'end'][i % 3]);
      });
      await Promise.all(all.map((el) => el.updateComplete));
    });
    await expectAxeClean(page);
  });
