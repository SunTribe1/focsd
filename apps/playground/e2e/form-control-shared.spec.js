// cspell:ignore الجوال السعر
// cspell:ignore Évora Łódź nukta virama
import { expect, test } from './fixtures/test.js';
import { openFromReviewFixes5, openFromParityReviewFixes } from './fixtures/pages.js';

// Behavior every list-based form control shares (quality batch B8): query matching ignores case
// and accents, list keys wrap and skip disabled options, value events have one shape, and the
// error summary focuses a field's first focusable element.

test.beforeEach(async ({ page }) => {
  await page.goto('/selects.html');
  await page.waitForFunction(() =>
    ['focsd-combobox', 'focsd-select', 'focsd-tag-input', 'focsd-error-summary'].every((n) => customElements.get(n)),
  );
});

// Values carry no letters, so only the (accented) labels can match a query.
const CITIES = `<focsd-option value="1">Paris</focsd-option><focsd-option value="2">Évora</focsd-option><focsd-option value="3">Łódź</focsd-option>`;

/** Append markup to the page body and wait for it to render. */
const mount = (page, markup) =>
  page.evaluate(async (html) => {
    const box = document.createElement('div');
    box.id = 'b8-stage';
    box.innerHTML = html;
    document.body.prepend(box);
    await Promise.all([...box.querySelectorAll('*')].map((el) => el.updateComplete));
  }, markup);

test.describe('accent-insensitive matching ("e" finds "é")', () => {
  test('combobox filters its options', async ({ page }) => {
    await mount(page, `<focsd-combobox id="b8-cb" label="City">${CITIES}</focsd-combobox>`);
    await page.locator('#b8-cb').getByRole('combobox').pressSequentially('evo');
    await expect(page.locator('#b8-cb').getByRole('option')).toHaveText(['Évora']);
  });

  test('searchable select filters its options', async ({ page }) => {
    await mount(page, `<focsd-select id="b8-sel" label="City" searchable>${CITIES}</focsd-select>`);
    await page.locator('#b8-sel').getByRole('button', { name: /^City/ }).click();
    await page.locator('#b8-sel').getByRole('searchbox').pressSequentially('evo');
    await expect(page.locator('#b8-sel focsd-option:not([hidden])')).toHaveText(['Évora']);
  });

  test('select typeahead jumps to an accented label', async ({ page }) => {
    await mount(page, `<focsd-select id="b8-sel" label="City">${CITIES}</focsd-select>`);
    await page.locator('#b8-sel').getByRole('button', { name: /^City/ }).click();
    await expect(page.locator('#b8-sel focsd-option[value="1"]')).toBeFocused();
    await page.keyboard.press('e');
    await expect(page.locator('#b8-sel focsd-option[value="2"]')).toBeFocused();
    await page.keyboard.press('p');
    await expect(page.locator('#b8-sel focsd-option[value="1"]')).toBeFocused();
  });

  test('tag input suggestions', async ({ page }) => {
    await mount(page, `<focsd-tag-input id="b8-tags" label="Cities">${CITIES}</focsd-tag-input>`);
    await page.locator('#b8-tags').getByRole('combobox').pressSequentially('evo');
    await expect(page.locator('#b8-tags').getByRole('option')).toHaveText(['Évora']);
  });
});

test.describe('list keys wrap and skip disabled options', () => {
  const OPTIONS = `<focsd-option value="a">Alpha</focsd-option><focsd-option value="b">Beta</focsd-option><focsd-option value="c" disabled>Gamma</focsd-option>`;

  /** The label of the combobox's active option. */
  const active = (page, id) => page.locator(`#${id}`).locator('[part~="option"][part~="active"]');

  test('combobox: Up from nothing is the last enabled option; Down wraps to the first', async ({ page }) => {
    await mount(page, `<focsd-combobox id="b8-cb" label="Letter">${OPTIONS}</focsd-combobox>`);
    const input = page.locator('#b8-cb').getByRole('combobox');
    await input.click();
    await input.press('ArrowUp');
    await expect(active(page, 'b8-cb')).toHaveText('Beta');
    await input.press('ArrowDown');
    await expect(active(page, 'b8-cb')).toHaveText('Alpha');
    await input.press('ArrowUp');
    await expect(active(page, 'b8-cb')).toHaveText('Beta');
  });

  test('tag input: Up from nothing is the last suggestion; Down wraps', async ({ page }) => {
    await mount(page, `<focsd-tag-input id="b8-tags" label="Letters">${OPTIONS}</focsd-tag-input>`);
    const input = page.locator('#b8-tags').getByRole('combobox');
    await input.click();
    await input.press('ArrowUp');
    await expect(active(page, 'b8-tags')).toHaveText('Beta');
    await input.press('ArrowDown');
    await expect(active(page, 'b8-tags')).toHaveText('Alpha');
  });
});

test('value events: input is composed, change bubbles but stays in its tree', async ({ page }) => {
  await mount(
    page,
    `<focsd-combobox id="b8-cb" label="City">${CITIES}</focsd-combobox><focsd-tag-input id="b8-tags" label="Cities"></focsd-tag-input>`,
  );
  await page.evaluate(() => {
    window.__b8Events = [];

    for (const id of ['b8-cb', 'b8-tags'])
      for (const type of ['input', 'change'])
        document.getElementById(id).addEventListener(type, (e) => window.__b8Events.push(`${id} ${e.type} ${e.bubbles} ${e.composed}`));
  });
  const combo = page.locator('#b8-cb').getByRole('combobox');
  await combo.click();
  await combo.press('ArrowDown');
  await combo.press('Enter');
  const tags = page.locator('#b8-tags').getByRole('textbox');
  await tags.fill('Lit');
  await tags.press('Enter');
  // The tag input's text box also fires native `input` events per key, so only its change is checked.
  const events = await page.evaluate(() => window.__b8Events);
  expect(events.filter((e) => e.startsWith('b8-cb'))).toEqual(['b8-cb input true true', 'b8-cb change true false']);
  expect(events.filter((e) => e.startsWith('b8-tags change'))).toEqual(['b8-tags change true false']);
});

test.describe('error summary focuses the field', () => {
  /** Mount a summary and `field`, collect, and click the summary link. */
  const follow = async (page, field) => {
    await mount(page, `<focsd-error-summary id="b8-sum"></focsd-error-summary>${field}`);
    await page.locator('#b8-sum').evaluate((el) => el.collect(null));
    await page.locator('#b8-sum').getByRole('link', { name: 'Fix this' }).click();
  };

  test('skips a disabled select', async ({ page }) => {
    await follow(
      page,
      '<div error="Fix this"><select disabled><option>x</option></select><select id="b8-target"><option>y</option></select></div>',
    );
    await expect(page.locator('#b8-target')).toBeFocused();
  });

  test('a radio group: the checked radio (tab stop), not a link in an earlier label', async ({ page }) => {
    await follow(
      page,
      `<focsd-radio-group id="b8-rg" label="Plan" error="Fix this" value="team">
        <focsd-radio value="solo">Solo (<a href="#terms">terms</a>)</focsd-radio>
        <focsd-radio id="b8-target" value="team">Team</focsd-radio>
      </focsd-radio-group>`,
    );
    await expect(page.locator('#b8-target')).toBeFocused();
  });
});

/**
 * Record the value events each host in `ids` fires itself (not native events retargeted from its
 * shadow root), as `type bubbles composed`.
 */
const recordValueEvents = (page, ids) =>
  page.evaluate((list) => {
    window.__b8Values = Object.fromEntries(list.map((id) => [id, []]));

    for (const id of list) {
      const el = document.getElementById(id);

      for (const type of ['input', 'change'])
        el.addEventListener(type, (e) => {
          if (e.composedPath()[0] === el) window.__b8Values[id].push(`${e.type} ${e.bubbles} ${e.composed}`);
        });
    }
  }, ids);

const valueEvents = (page, id) => page.evaluate((key) => window.__b8Values[key], id);

const INPUT = 'input true true';
const CHANGE = 'change true false';

test.describe('value events: input on every edit, change only on commit', () => {
  test('currency field: typing fires input only; a key step commits', async ({ page }) => {
    await mount(page, '<focsd-currency-field id="b8-cur" label="Price" currency="EUR"></focsd-currency-field>');
    await recordValueEvents(page, ['b8-cur']);
    const box = page.locator('#b8-cur').getByRole('spinbutton');
    await box.pressSequentially('12');
    expect(await valueEvents(page, 'b8-cur')).toEqual([INPUT, INPUT]);
    await box.press('ArrowUp');
    expect(await valueEvents(page, 'b8-cur')).toEqual([INPUT, INPUT, INPUT, CHANGE]);
  });

  test('slider: a key commits; a drag fires input and one change at the end', async ({ page }) => {
    await mount(page, '<focsd-slider id="b8-sl" label="Volume" value="10" style="inline-size: 300px"></focsd-slider>');
    await recordValueEvents(page, ['b8-sl']);
    await page.locator('#b8-sl').getByRole('slider').press('ArrowRight');
    expect(await valueEvents(page, 'b8-sl')).toEqual([INPUT, CHANGE]);

    const track = await page.locator('#b8-sl').evaluate((el) => {
      const r = el.shadowRoot.querySelector('[part~="track"]').getBoundingClientRect();

      return { x: r.x, y: r.y + r.height / 2, w: r.width };
    });

    await page.mouse.move(track.x + track.w * 0.3, track.y);
    await page.mouse.down();
    await page.mouse.move(track.x + track.w * 0.6, track.y, { steps: 3 });
    const during = await valueEvents(page, 'b8-sl');
    expect(during.slice(2).every((e) => e === INPUT)).toBe(true);
    await page.mouse.up();
    const after = await valueEvents(page, 'b8-sl');
    expect(after.at(-1)).toBe(CHANGE);
    expect(after.filter((e) => e === CHANGE)).toHaveLength(2);
  });

  test('color picker: dragging the area fires input, and change once on release', async ({ page }) => {
    await page.goto('/color.html');
    await page.waitForFunction(() => customElements.get('focsd-color-picker'));
    await recordValueEvents(page, ['cp']);
    await page.getByRole('button', { name: /Brand color/ }).click();
    const area = page.locator('#cp [part~="area"]');
    await area.click({ position: { x: 10, y: 10 } });
    expect(await valueEvents(page, 'cp')).toEqual([INPUT, CHANGE]);
    const box = await area.boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 60, box.y + 40, { steps: 3 });
    expect((await valueEvents(page, 'cp')).slice(2).every((e) => e === INPUT)).toBe(true);
    await page.mouse.up();
    const events = await valueEvents(page, 'cp');
    expect(events.at(-1)).toBe(CHANGE);
    expect(events.filter((e) => e === CHANGE)).toHaveLength(2);
  });
});

test.describe('value events: one input and one change per committed edit', () => {
  test('file upload: choosing files fires input then change', async ({ page }) => {
    await mount(page, '<focsd-file-upload id="b8-up" label="Attachment"></focsd-file-upload>');
    await recordValueEvents(page, ['b8-up']);
    await page.locator('#b8-up input[type="file"]').setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('a') });
    await expect.poll(() => valueEvents(page, 'b8-up')).toEqual([INPUT, CHANGE]);
  });

  test('time field: each segment edit fires input then change', async ({ page }) => {
    await mount(page, '<focsd-time-field id="b8-tf" label="Start" value="09:30" hour-cycle="h23"></focsd-time-field>');
    await recordValueEvents(page, ['b8-tf']);
    await page.locator('#b8-tf').getByRole('spinbutton').first().press('ArrowUp');
    expect(await valueEvents(page, 'b8-tf')).toEqual([INPUT, CHANGE]);
  });

  test('phone field: typing fires input only; leaving the number and choosing a country commit', async ({ page }) => {
    await mount(page, '<focsd-phone-field id="b8-ph" label="Mobile" country="GB"></focsd-phone-field>');
    await recordValueEvents(page, ['b8-ph']);
    await page.locator('#b8-ph').getByRole('textbox').pressSequentially('7400');
    const typed = await valueEvents(page, 'b8-ph');
    expect(typed.length).toBeGreaterThan(0);
    expect(typed.every((e) => e === INPUT)).toBe(true);
    const country = page.locator('#b8-ph').getByRole('combobox', { name: 'Country' });
    await country.fill('france');
    await country.press('Enter');
    // Leaving the number commits it (change); choosing a country then commits the new value.
    expect((await valueEvents(page, 'b8-ph')).slice(typed.length)).toEqual([CHANGE, INPUT, CHANGE]);
  });
});

test('date pickers fire one input per keystroke, not the inner input too (B14 hand-off)', async ({ page }) => {
  await mount(
    page,
    '<focsd-date-picker id="b14-dp" label="Due"></focsd-date-picker><focsd-date-range-picker id="b14-rg" label="Stay"></focsd-date-range-picker>',
  );
  // Every input event the page sees from each host, its own or retargeted from its shadow root.
  await page.evaluate(() => {
    window.__b14Inputs = { 'b14-dp': 0, 'b14-rg': 0 };

    for (const id of Object.keys(window.__b14Inputs))
      document.getElementById(id).addEventListener('input', () => (window.__b14Inputs[id] += 1));
  });
  await page.locator('#b14-dp').getByRole('textbox').pressSequentially('2026');
  await page.locator('#b14-rg').getByRole('textbox').first().pressSequentially('20');

  expect(await page.evaluate(() => window.__b14Inputs)).toEqual({ 'b14-dp': 4, 'b14-rg': 2 });
});

test.describe('list keys in the phone country list and the color swatches', () => {
  test('phone countries: Down from nothing is the first, Up wraps to the last, Home and End', async ({ page }) => {
    await mount(page, '<focsd-phone-field id="b8-ph" label="Mobile" country="GB"></focsd-phone-field>');
    const country = page.locator('#b8-ph').getByRole('combobox', { name: 'Country' });
    await country.fill('united');
    const names = await page.locator('#b8-ph [part~="option-name"]').allTextContents();
    expect(names.length).toBeGreaterThan(2);
    const active = page.locator('#b8-ph [part~="option"][part~="active"] [part~="option-name"]');
    await country.press('ArrowDown');
    await expect(active).toHaveText(names[0]);
    await country.press('ArrowUp');
    await expect(active).toHaveText(names.at(-1));
    await country.press('ArrowDown');
    await expect(active).toHaveText(names[0]);
    await country.press('End');
    await expect(active).toHaveText(names.at(-1));
    await country.press('Home');
    await expect(active).toHaveText(names[0]);
  });

  test('phone countries: matching ignores marks beyond Latin accents (Devanagari nukta)', async ({ page }) => {
    await mount(page, '<div lang="hi"><focsd-phone-field id="b8-ph" label="Mobile" country="IN"></focsd-phone-field></div>');
    const country = page.locator('#b8-ph').getByRole('combobox');
    // France is फ़्रांस (with nukta and virama); people often type it without them.
    await country.fill('फरांस');
    await expect(page.locator('#b8-ph [part~="option-name"]')).toHaveText(['फ़्रांस']);
  });

  test('color swatches wrap with the arrows; Home and End go to the ends', async ({ page }) => {
    await page.goto('/color.html');
    await page.waitForFunction(() => customElements.get('focsd-color-picker'));
    await page.getByRole('button', { name: /Brand color/ }).click();
    const radios = page.locator('#cp').getByRole('radiogroup', { name: 'Swatches' }).getByRole('radio');
    await radios.last().focus();
    await page.keyboard.press('ArrowRight');
    await expect(radios.first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(radios.last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(radios.first()).toBeFocused();
    await page.keyboard.press('End');
    await expect(radios.last()).toBeFocused();
  });
});

test('date picker: a chosen date goes through emit(), so a subclass override still runs', async ({ page }) => {
  await page.evaluate(() => {
    const Picker = customElements.get('focsd-date-picker');

    customElements.define(
      'b8-date-picker',
      class extends Picker {
        emit() {
          window.__b8Emits = (window.__b8Emits ?? 0) + 1;
          super.emit();
        }
      },
    );
  });
  await mount(page, '<b8-date-picker id="b8-dp" label="Departure" value="2026-03-14"></b8-date-picker>');
  await recordValueEvents(page, ['b8-dp']);
  await page.locator('#b8-dp').getByRole('button', { name: 'Choose date', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('#b8-dp')).toHaveJSProperty('value', '2026-03-15');
  expect(await page.evaluate(() => window.__b8Emits)).toBe(1);
  expect(await valueEvents(page, 'b8-dp')).toEqual([INPUT, CHANGE]);
});

// Re-homed from review-fixes-5.spec.js (Q48).

test('new form controls restore their state on back navigation', async ({ page, browserName }) => {
  await openFromReviewFixes5(page);
  test.skip(browserName === 'firefox', 'Firefox does not restore form-associated custom element state');
  await page.evaluate(() => window.addEventListener('unload', () => {}));
  const cb = page.getByRole('combobox', { name: 'Country' });
  await cb.fill('fr');
  await page.getByRole('option', { name: 'France' }).click();
  await page.getByRole('textbox', { name: 'Departure' }).fill('2026-07-01');
  await page.getByRole('group', { name: 'Meeting time' }).getByRole('spinbutton', { name: 'Hours' }).focus();
  await page.keyboard.press('ArrowUp');
  await page.getByRole('combobox', { name: 'Labels' }).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await page.getByRole('group', { name: 'Trip dates' }).getByRole('textbox', { name: 'End date' }).fill('2026-05-20');
  await page.goto('/');
  await page.goBack();
  await page.waitForFunction(() => customElements.get('focsd-time-field'));
  await expect(cb).toHaveValue('France');
  await expect(page.getByRole('textbox', { name: 'Departure' })).toHaveValue('2026-07-01');
  await expect(page.getByRole('group', { name: 'Meeting time' }).getByRole('spinbutton', { name: 'Hours' })).toHaveAttribute(
    'aria-valuenow',
    '10',
  );
  await expect(page.getByRole('button', { name: 'Remove Design' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Trip dates' }).getByRole('textbox', { name: 'End date' })).toHaveValue('2026-05-20');
});

// Re-homed from wave13-restore-rtl.spec.js (Q48).

// Review item 10: form state restore (as the browser does after navigation) and RTL for the new
// form controls. Restore is driven through formStateRestoreCallback with the state the control
// itself reported to the browser.
const restore = (page, selector) =>
  page.locator(selector).evaluate((el) => {
    // ElementInternals has no getter for the saved state, so read what the control would save.
    let saved = el.value;

    if (el.name && el.values) {
      saved = new FormData();

      for (const v of el.values) saved.append(el.name, v);
    }

    // A page coming back starts empty, renders, and then the browser restores the saved state.
    el.formResetCallback();

    return el.updateComplete
      .then(() => el.formStateRestoreCallback(saved, 'restore'))
      .then(() => el.updateComplete)
      .then(() => el.values ?? el.value);
  });

test('color, tag, phone and currency values survive a form state restore', async ({ page }) => {
  await page.goto('/color.html');
  await page.waitForFunction(() => customElements.get('focsd-color-picker'));
  await page.locator('#cpi').getByRole('textbox').fill('#ff0000');
  await page.locator('#cpi').getByRole('textbox').press('Enter');
  expect(await restore(page, '#cpi')).toBe(await page.locator('#cpi').evaluate((el) => el.value));

  await page.goto('/tags.html');
  await page.waitForFunction(() => customElements.get('focsd-tag-input'));
  await page.locator('#t').evaluate((el) => (el.values = ['x', 'y']));
  expect(await restore(page, '#t')).toEqual(['x', 'y']);

  await page.goto('/phone.html');
  await page.waitForFunction(() => customElements.get('focsd-phone-field'));
  await page.locator('#p').getByRole('textbox').fill('020 7183 8750');
  expect(await restore(page, '#p')).toBe('+442071838750');
  await expect(page.locator('#p').getByRole('textbox')).toHaveValue('2071 838750');

  await page.goto('/currency.html');
  await page.waitForFunction(() => customElements.get('focsd-currency-field'));
  await page.locator('#cj').getByRole('spinbutton').fill('42');
  expect(await restore(page, '#cj')).toBe('42');
});

// Re-homed from parity-review-fixes.spec.js (Q48).

test('readonly does not bar validation on controls that ignore readonly', async ({ page }) => {
  await openFromParityReviewFixes(page);

  const r = await page.evaluate(async () => {
    const el = document.getElementById('pt-terms');
    Object.assign(el, { required: true, readOnly: true, checked: false });
    await el.updateComplete;

    return [el.validity.valueMissing, el.willValidate];
  });

  // The flag is reported, but HTML bars any form-associated element with a `readonly` attribute
  // from constraint validation, so willValidate is false whatever the control does with it.
  expect(r).toEqual([true, false]);
});
