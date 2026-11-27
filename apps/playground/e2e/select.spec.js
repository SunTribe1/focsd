import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes, openFromParityReviewFixes } from './fixtures/pages.js';
import { expectFloorFocusRing } from './fixtures/focus-ring.js';
import { pressTab } from './fixtures/keys.js';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('focsd-select') && customElements.get('focsd-option'));
});

const trigger = (page, name = /^Data region/) => page.getByRole('button', { name });
const listbox = (page) => page.getByRole('listbox', { name: 'Data region' });

test('trigger is a labelled listbox button showing the value, collapsed by default', async ({ page }) => {
  const button = trigger(page, 'Data region EU (Frankfurt)');
  await expect(button).toHaveAttribute('aria-haspopup', 'listbox');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(listbox(page)).toBeHidden();
});

test('click opens the listbox with options and focuses the selected one', async ({ page }) => {
  await trigger(page).click();
  await expect(listbox(page)).toBeVisible();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(listbox(page)).toMatchAriaSnapshot(`
    - listbox "Data region":
      - option "EU (Frankfurt)" [selected]
      - option "US (Virginia)"
      - option "Asia Pacific (Sydney)" [disabled]
      - option "UK (London)"
  `);
  await expect(page.getByRole('option', { name: 'EU (Frankfurt)' })).toBeFocused();
});

test('keyboard: ArrowDown opens, arrows skip disabled, Enter selects, closes and returns focus', async ({ page }) => {
  await page.evaluate(() => {
    window.selectEvents = [];
    const el = document.getElementById('sel');
    el.addEventListener('input', () => window.selectEvents.push('input'));
    el.addEventListener('change', () => window.selectEvents.push('change'));
  });
  await trigger(page).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'EU (Frankfurt)' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'US (Virginia)' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'UK (London)' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(listbox(page)).toBeHidden();
  await expect(trigger(page, 'Data region UK (London)')).toBeFocused();
  expect(await page.evaluate(() => document.getElementById('sel').value)).toBe('uk');
  expect(await page.evaluate(() => window.selectEvents)).toEqual(['input', 'change']);
});

test('Home/End jump; Escape closes without changing the value', async ({ page }) => {
  await trigger(page).click();
  await page.keyboard.press('End');
  await expect(page.getByRole('option', { name: 'UK (London)' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: 'EU (Frankfurt)' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(listbox(page)).toBeHidden();
  await expect(trigger(page, 'Data region EU (Frankfurt)')).toBeFocused();
});

test('typeahead focuses the next option starting with the typed character', async ({ page }) => {
  await trigger(page).click();
  await page.keyboard.press('u');
  await expect(page.getByRole('option', { name: 'US (Virginia)' })).toBeFocused();
  await page.keyboard.press('u');
  await expect(page.getByRole('option', { name: 'UK (London)' })).toBeFocused();
});

test('clicking an option selects it; clicking outside closes', async ({ page }) => {
  await trigger(page).click();
  await page.getByRole('option', { name: 'US (Virginia)' }).click();
  await expect(trigger(page, 'Data region US (Virginia)')).toBeVisible();
  await trigger(page).click();
  await expect(listbox(page)).toBeVisible();
  await page.getByRole('heading', { name: 'Select' }).click();
  await expect(listbox(page)).toBeHidden();
});

test('required without a value blocks submit; values submit in FormData; reset restores', async ({ page }) => {
  await page.locator('#sel-submit').click();
  await expect(page.locator('#sel-result')).toHaveText('');
  expect(await page.evaluate(() => document.getElementById('sel-req').validity.valueMissing)).toBe(true);
  await page.getByRole('button', { name: /^Default language/ }).click();
  await page.getByRole('option', { name: 'English' }).click();
  await page.locator('#sel-submit').click();
  await expect(page.locator('#sel-result')).toHaveText('{"region":"eu","language":"en"}');
  await page.locator('#sel-reset').click();
  expect(await page.evaluate(() => document.getElementById('sel-req').value)).toBe('');
  await expect(page.getByRole('button', { name: 'Default language Choose a language' })).toBeVisible();
});

test('Home/End pressed while the list is still opening are not lost', async ({ page }) => {
  await trigger(page).focus();
  await page.evaluate(() => {
    const button = document.getElementById('sel').shadowRoot.querySelector('[part~="trigger"]');
    button.click();
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true, cancelable: true }));
  });
  await expect(page.getByRole('option', { name: 'UK (London)' })).toBeFocused();
});

test('Home and End on the closed trigger open the list at the first and last option', async ({ page }) => {
  await trigger(page).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('option', { name: 'UK (London)' })).toBeFocused();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: 'EU (Frankfurt)' })).toBeFocused();
});

test('required select describes itself as required without invalid ARIA', async ({ page }) => {
  const button = page.getByRole('button', { name: /^Default language/ });
  await expect(button).toHaveAccessibleDescription('Required');
  await expect(button).not.toHaveAttribute('aria-required', /.*/);
});

// Re-homed from review-fixes.spec.js (Q48).

const deepActive = (page) =>
  page.evaluate(() => {
    let a = document.activeElement;

    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;

    return a?.getAttribute('part') || a?.id || a?.localName;
  });

test('select inside another shadow root returns focus to its trigger', async ({ page }) => {
  await openFromReviewFixes(page);
  await page.evaluate(() => {
    const outer = document.createElement('div');
    outer.id = 'outer';
    document.body.prepend(outer);
    const root = outer.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<focsd-select label="Nested" value="a"><focsd-option value="a">A</focsd-option><focsd-option value="b">B</focsd-option></focsd-select>';
  });
  await page.getByRole('button', { name: /^Nested/ }).click();
  await expect(page.getByRole('option', { name: 'A', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect.poll(() => deepActive(page)).toMatch(/\btrigger\b/);
});

test('select trigger shows the floor focus ring', async ({ page }) => {
  await openFromReviewFixes(page);
  await page.getByRole('textbox', { name: 'Workspace ID' }).focus();
  const button = page.getByRole('button', { name: /^Data region/ });
  await button.focus();
  await pressTab(page, { shift: true });
  await pressTab(page);
  await expect(button).toBeFocused();
  await expectFloorFocusRing(button);
});

// Re-homed from review-fixes-10.spec.js (Q48).

test('an author value write after a sync in the same task is honoured', async ({ page }) => {
  await page.goto('/parity.html');
  await page.waitForFunction(() => Boolean(customElements.get('focsd-select')));

  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-size');
    el.multiple = true;
    el.options[0].selected = true;
    await el.updateComplete;
    el.value = 'l';
    await el.updateComplete;

    return [el.value, el.selectedOptions.map((o) => o.value)];
  });

  expect(r).toEqual(['l', ['l']]);
});

// Re-homed from minors-select.spec.js (Q48).

/** Append markup to the form and wait for it to render. */
const mount = (page, html) =>
  page.evaluate(async (markup) => {
    const form = document.getElementById('sf');
    form.insertAdjacentHTML('beforeend', markup);
    const el = form.lastElementChild;
    await el.updateComplete;

    return true;
  }, html);

const data = (page, name) => page.locator('#sf').evaluate((f, n) => new FormData(f).getAll(n), name);

const openFromMinorsSelect = async (page) => {
  await page.goto('/selects.html');
  await page.waitForFunction(() => ['focsd-select', 'focsd-option-group'].every((t) => customElements.get(t)));
};

test('duplicate option values mark only the first as selected', async ({ page }) => {
  await openFromMinorsSelect(page);
  await mount(
    page,
    '<focsd-select id="dup" label="Dup" name="dup" value="a"><focsd-option value="a">One</focsd-option><focsd-option value="a">Two</focsd-option></focsd-select>',
  );
  await expect(page.locator('#dup focsd-option[aria-selected="true"]')).toHaveCount(1);
});

test('a select with no choosable options does not open an empty list', async ({ page }) => {
  await openFromMinorsSelect(page);
  await mount(page, '<focsd-select id="none" label="None"><focsd-option value="a" disabled>A</focsd-option></focsd-select>');
  await page.locator('#none [part~="trigger"]').click();
  expect(await page.locator('#none').evaluate((el) => el.open)).toBe(false);
});

test('removing the chosen option from a group stops submitting it', async ({ page }) => {
  await openFromMinorsSelect(page);
  await mount(
    page,
    '<focsd-select id="rm" label="Rm" name="rm" value="b"><focsd-option-group label="G"><focsd-option value="a">A</focsd-option><focsd-option value="b">B</focsd-option></focsd-option-group></focsd-select>',
  );
  expect(await data(page, 'rm')).toEqual(['b']);
  await page.locator('#rm focsd-option[value="b"]').evaluate((el) => el.remove());
  await expect.poll(() => data(page, 'rm')).not.toEqual(['b']);
});

test('removing a chosen option from a multiple select drops it from the value', async ({ page }) => {
  await openFromMinorsSelect(page);
  await mount(
    page,
    '<focsd-select id="rmm" label="Rmm" name="rmm" multiple><focsd-option-group label="G"><focsd-option value="a" selected>A</focsd-option><focsd-option value="b" selected>B</focsd-option></focsd-option-group></focsd-select>',
  );
  expect(await data(page, 'rmm')).toEqual(['a', 'b']);
  await page.locator('#rmm focsd-option[value="a"]').evaluate((el) => el.remove());
  await expect.poll(() => data(page, 'rmm')).toEqual(['b']);
  await expect.poll(() => page.locator('#rmm').evaluate((el) => el.value)).toBe('b');
});

test('setting value on a multiple select selects that option alone, even when it is already first', async ({ page }) => {
  await openFromMinorsSelect(page);
  await mount(
    page,
    '<focsd-select id="mv" label="Mv" name="mv" multiple><focsd-option value="a" selected>A</focsd-option><focsd-option value="b" selected>B</focsd-option></focsd-select>',
  );
  await page.locator('#mv').evaluate((el) => {
    el.value = 'a';

    return el.updateComplete;
  });
  expect(await data(page, 'mv')).toEqual(['a']);
  await page.locator('#mv').evaluate((el) => {
    el.value = 'nope';

    return el.updateComplete;
  });
  expect(await data(page, 'mv')).toEqual([]);
  expect(await page.locator('#mv').evaluate((el) => el.value)).toBe('');
});

test('open drives the list from code', async ({ page }) => {
  await openFromMinorsSelect(page);
  await mount(page, '<focsd-select id="op" label="Op"><focsd-option value="a">A</focsd-option></focsd-select>');
  await page.locator('#op').evaluate((el) => (el.open = true));
  await expect(page.locator('#op').getByRole('listbox')).toBeVisible();
  await page.locator('#op').evaluate((el) => (el.open = false));
  await expect(page.locator('#op').getByRole('listbox')).toBeHidden();
});

test('form reset uses the current value attribute', async ({ page }) => {
  await openFromMinorsSelect(page);
  await mount(
    page,
    '<focsd-select id="rs" label="Rs" name="rs" value="a"><focsd-option value="a">A</focsd-option><focsd-option value="b">B</focsd-option></focsd-select>',
  );
  await page.locator('#rs').evaluate((el) => el.setAttribute('value', 'b'));
  await page.locator('#rs').evaluate((el) => {
    el.value = 'a';
    el.form.reset();

    return el.updateComplete;
  });
  expect(await page.locator('#rs').evaluate((el) => el.value)).toBe('b');
});

test('the chevron points down in right-to-left pages too', async ({ page }) => {
  await openFromMinorsSelect(page);
  await mount(page, '<focsd-select id="rtl" label="Rtl" dir="rtl"><focsd-option value="a">A</focsd-option></focsd-select>');

  // Logical borders (m3) mirror in RTL, and the rotation mirrors with them: the corner where the
  // two drawn borders meet still ends up straight below the centre.
  const tip = await page.locator('#rtl').evaluate((el) => {
    const cs = getComputedStyle(el.shadowRoot.querySelector('[part~="indicator"]'));
    const m = new DOMMatrix(cs.transform);
    const side = Number.parseFloat(cs.borderRightWidth) > 0 ? 1 : -1;
    const corner = m.transformPoint(new DOMPoint(side, 1));
    const origin = m.transformPoint(new DOMPoint(0, 0));

    return { x: Math.abs(Math.round((corner.x - origin.x) * 100) / 100), down: corner.y > origin.y, bottom: cs.borderBottomWidth };
  });

  expect(tip).toEqual({ x: 0, down: true, bottom: '2px' });
});

// Re-homed from parity-review-fixes.spec.js (Q48).

test('host aria-label names a select whose trigger uses aria-labelledby', async ({ page }) => {
  await openFromParityReviewFixes(page);
  await expect(page.locator('#pt-aria-select [part~="trigger"]')).toHaveAccessibleName('Country Canada');
});

test('selection set through option.selected before insertion is kept (single and multiple)', async ({ page }) => {
  await openFromParityReviewFixes(page);

  const r = await page.evaluate(async () => {
    const make = (multiple) => {
      const select = document.createElement('focsd-select');
      select.multiple = multiple;

      for (const [value, on] of [
        ['a', false],
        ['b', true],
        ['c', multiple],
      ]) {
        const option = document.createElement('focsd-option');
        option.value = value;
        option.textContent = value;
        option.selected = on;
        select.append(option);
      }

      document.body.append(select);

      return select;
    };

    const single = make(false);
    const multi = make(true);
    await single.updateComplete;
    await multi.updateComplete;

    return [single.value, multi.selectedOptions.map((o) => o.value)];
  });

  expect(r).toEqual(['b', ['b', 'c']]);
});

test('a multiple selection restored before first render survives it', async ({ page }) => {
  await openFromParityReviewFixes(page);

  const r = await page.evaluate(async () => {
    const select = document.createElement('focsd-select');
    Object.assign(select, { multiple: true, name: 'r' });

    for (const value of ['a', 'b', 'c']) {
      const option = document.createElement('focsd-option');
      option.value = value;
      select.append(option);
    }

    const state = new FormData();
    state.append('r', 'c');
    select.formStateRestoreCallback(state);
    document.body.append(select);
    await select.updateComplete;

    return select.selectedOptions.map((o) => o.value);
  });

  expect(r).toEqual(['c']);
});

test('switching to multiple keeps the current selection in state, ARIA and form data', async ({ page }) => {
  await openFromParityReviewFixes(page);

  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-size');
    el.selectedIndex = 2;
    await el.updateComplete;
    el.multiple = true;
    await el.updateComplete;

    return {
      selected: el.selectedOptions.map((o) => o.value),
      aria: el.options.map((o) => o.getAttribute('aria-selected')),
      data: new FormData(document.getElementById('pf')).getAll('size'),
    };
  });

  expect(r).toEqual({ selected: ['l'], aria: ['false', 'false', 'true'], data: ['l'] });
});

test('a select moved while open resets to closed, and its trigger says so (B14 m2)', async ({ page }) => {
  await trigger(page).click();
  await expect(listbox(page)).toBeVisible();
  // A framework move: removal hides the popover without toggle events.
  await page.evaluate(() => {
    const select = document.getElementById('sel');
    select.parentElement.append(select);
  });
  await expect(listbox(page)).toBeHidden();
  expect(await page.locator('#sel').evaluate((el) => el.open)).toBe(false);
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  await trigger(page).click();
  await expect(listbox(page)).toBeVisible();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
});
