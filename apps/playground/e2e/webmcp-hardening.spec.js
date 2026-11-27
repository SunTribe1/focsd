// cspell:ignore swatchy
import { expect, settle, test } from './fixtures/test.js';
import { recordModelContext } from './fixtures/webmcp.js';

// @focsd/webmcp edge cases from the pre-launch review.

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.beforeEach(async ({ page }) => {
  await recordModelContext(page);
  await page.goto('/webmcp.html');
  await page.waitForFunction(() => window.__tools.has('book-table'));
});

/** Add a form to the page and wait for its tool. */
const addForm = (page, name, inner, attrs = '') =>
  page.evaluate(
    async ([n, html, extra]) => {
      document
        .querySelector('main')
        .insertAdjacentHTML(
          'beforeend',
          `<form id="f-${n}" toolname="${n}" tooldescription="Test ${n}." ${extra}>${html}<button type="submit">Go</button></form>`,
        );
      const form = document.getElementById(`f-${n}`);
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (e.agentInvoked) e.respondWith(Promise.resolve({ ok: true, data: Object.fromEntries(new FormData(form)) }));
      });
      await customElements.whenDefined('focsd-text-field');
    },
    [name, inner, attrs],
  );

const toolSchema = (page, name) => page.waitForFunction((n) => window.__tools.get(n)?.inputSchema, name).then((h) => h.jsonValue());

test('replacing a form with a new one of the same name keeps exactly one tool', async ({ page }) => {
  await page.locator('#contact').evaluate((form) => {
    const copy = form.cloneNode(true);
    form.replaceWith(copy);
  });
  await expect.poll(() => page.evaluate(() => window.__tools.has('contact-us'))).toBe(true);
  await settle(page);
  expect(await page.evaluate(() => window.__tools.has('contact-us'))).toBe(true);
});

test('changing the description re-registers the tool instead of dropping it', async ({ page }) => {
  await page.locator('#contact').evaluate((f) => f.setAttribute('tooldescription', 'Write to us.'));
  await expect.poll(() => page.evaluate(() => window.__tools.get('contact-us')?.description)).toBe('Write to us.');
});

test('fields added later appear in the schema', async ({ page }) => {
  await page.locator('#contact').evaluate((f) => {
    const field = document.createElement('focsd-text-field');
    field.setAttribute('label', 'Order number');
    field.setAttribute('name', 'order');
    f.prepend(field);
  });
  await expect
    .poll(() => page.evaluate(() => Object.keys(window.__tools.get('contact-us')?.inputSchema?.properties ?? {})))
    .toContain('order');
});

test('read-only fields, password-type text fields and placeholder or disabled options are never offered', async ({ page }) => {
  await addForm(
    page,
    'pricing',
    `<input name="price" value="10" readonly>
     <focsd-text-field label="Code" name="code" readonly></focsd-text-field>
     <focsd-text-field label="Secret" name="secret" type="password"></focsd-text-field>
     <select name="size"><option value="">Choose a size</option><option value="s">Small</option><option value="m" disabled>Medium</option></select>
     <focsd-select label="Color" name="color"><focsd-option value="red">Red</focsd-option><focsd-option value="blue" disabled>Blue</focsd-option></focsd-select>
     <input name="ref" pattern="[A-Z]{3}">`,
  );
  const s = await toolSchema(page, 'pricing');
  expect(Object.keys(s.properties).toSorted()).toEqual(['color', 'ref', 'size']);
  expect(s.properties.size.enum).toEqual(['s']);
  expect(s.properties.color.enum).toEqual(['red']);
  expect(s.properties.ref.pattern).toBe('^(?:[A-Z]{3})$');
});

test('a hidden input sharing a name with a checkbox is left alone; the checkbox is set', async ({ page }) => {
  await addForm(
    page,
    'agree',
    `<input type="hidden" name="agree" value="0"><input type="checkbox" name="agree" value="1">`,
    'toolautosubmit',
  );
  await toolSchema(page, 'agree');
  const result = await page.evaluate(() => window.__tools.get('agree').execute({ agree: true }));
  expect(result.data.agree).toBe('1');
  await expect(page.locator('#f-agree input[type=hidden]')).toHaveValue('0');
});

test('an autosubmit call on a form the browser finds invalid returns the problems instead of hanging', async ({ page }) => {
  await addForm(page, 'when', `<focsd-date-picker label="Date" name="date" min="2026-01-01"></focsd-date-picker>`, 'toolautosubmit');
  await toolSchema(page, 'when');

  // A call that hangs fails on the test timeout.
  const result = await page.evaluate(() => window.__tools.get('when').execute({ date: '2025-06-01' }));

  expect(result.ok).toBe(false);
  expect(result.errors[0].field).toBe('date');
  await expect(page.locator('#f-when')).not.toHaveAttribute('data-focsd-tool-active', '');
});

test('native inputs are set through the prototype setter, so React-controlled inputs update', async ({ page }) => {
  await addForm(page, 'react-like', `<input name="city">`, 'toolautosubmit');
  await toolSchema(page, 'react-like');
  // React tracks values with an own "value" property on the node; writing through it hides the change.
  await page.locator('#f-react-like input[name=city]').evaluate((input) => {
    Object.defineProperty(input, 'value', {
      configurable: true,
      get() {
        return Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get.call(this);
      },
      set() {
        throw new Error('wrote through the tracked property');
      },
    });
  });
  const result = await page.evaluate(() => window.__tools.get('react-like').execute({ city: 'Lisbon' }));
  expect(result.data.city).toBe('Lisbon');
});

test('inherited object keys are not accepted as fields', async ({ page }) => {
  const result = await page.evaluate(() => window.__tools.get('contact-us').execute({ subject: 'Hi', constructor: 'x' }));
  expect(result.ok).toBe(false);
  expect(result.errors.map((e) => e.field)).toEqual(['constructor']);
});

test('dispose before components finish loading leaves nothing registered', async ({ page }) => {
  const count = await page.evaluate(async () => {
    window.__webmcp.dispose();
    const { enableWebMCP } = await import('/@id/@focsd/webmcp');

    for (const name of window.__tools.keys()) window.__tools.delete(name);
    const handle = enableWebMCP();
    handle.dispose();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    return window.__tools.size;
  });

  expect(count).toBe(0);
});

test('a group of native checkboxes sharing a name is one list of choices', async ({ page }) => {
  await addForm(
    page,
    'topics',
    `<fieldset><legend>Topics</legend>
       <label><input type="checkbox" name="topic" value="news"> News</label>
       <label><input type="checkbox" name="topic" value="sport" checked> Sport</label>
       <label><input type="checkbox" name="topic" value="art" disabled> Art</label>
     </fieldset>`,
    'toolautosubmit',
  );
  const s = await toolSchema(page, 'topics');
  expect(s.properties.topic).toMatchObject({ type: 'array', uniqueItems: true, items: { type: 'string', enum: ['news', 'sport'] } });
  const result = await page.evaluate(() => window.__tools.get('topics').execute({ topic: ['news'] }));
  expect(result.ok).toBe(true);
  const checked = await page.locator('#f-topics input:checked').evaluateAll((els) => els.map((e) => e.value));
  expect(checked).toEqual(['news']);
});

test('a group of Focsd checkboxes sharing a name is one list of choices', async ({ page }) => {
  await addForm(
    page,
    'extras',
    `<focsd-checkbox name="extra" value="bread">Bread</focsd-checkbox>
     <focsd-checkbox name="extra" value="wine">Wine</focsd-checkbox>`,
    'toolautosubmit',
  );
  await page.waitForFunction(() => customElements.get('focsd-checkbox'));

  const s = await page
    .waitForFunction(
      () => window.__tools.get('extras')?.inputSchema?.properties?.extra?.type === 'array' && window.__tools.get('extras').inputSchema,
    )
    .then((h) => h.jsonValue());

  expect(s.properties.extra.items.enum).toEqual(['bread', 'wine']);
  const result = await page.evaluate(() => window.__tools.get('extras').execute({ extra: ['wine', 'bread'] }));
  expect(result.ok).toBe(true);
  const data = await page.locator('#f-extras').evaluate((f) => new FormData(f).getAll('extra'));
  expect(data.toSorted()).toEqual(['bread', 'wine']);
});

test('options whose value contains a comma are not offered by multi-value controls', async ({ page }) => {
  await addForm(
    page,
    'places',
    `<focsd-combobox label="Cities" name="city" multiple>
       <focsd-option value="paris">Paris</focsd-option>
       <focsd-option value="austin, tx">Austin</focsd-option>
     </focsd-combobox>`,
  );
  await page.waitForFunction(() => customElements.get('focsd-combobox'));

  const s = await page
    .waitForFunction(() => window.__tools.get('places')?.inputSchema?.properties?.city?.items && window.__tools.get('places').inputSchema)
    .then((h) => h.jsonValue());

  expect(s.properties.city.items.enum).toEqual(['paris']);
});

test('wave 13 form controls have precise schemas and can be filled', async ({ page }) => {
  await addForm(
    page,
    'profile',
    `<focsd-color-picker label="Color" name="color"></focsd-color-picker>
     <focsd-tag-input label="Skills" name="skills" max="3"></focsd-tag-input>
     <focsd-phone-field label="Phone" name="phone" default-country="GB"></focsd-phone-field>
     <focsd-currency-field label="Budget" name="budget" currency="JPY"></focsd-currency-field>
     <focsd-currency-field label="Price" name="price" currency="EUR"></focsd-currency-field>`,
    'toolautosubmit',
  );
  await page.waitForFunction(() =>
    ['focsd-color-picker', 'focsd-tag-input', 'focsd-phone-field', 'focsd-currency-field'].every((t) => customElements.get(t)),
  );

  const s = await page
    .waitForFunction(
      () => window.__tools.get('profile')?.inputSchema?.properties?.budget?.pattern && window.__tools.get('profile').inputSchema,
    )
    .then((h) => h.jsonValue());

  expect(s.properties.color).toMatchObject({ type: 'string', format: 'color' });
  expect(s.properties.color.description).toContain('CSS color');
  expect(s.properties.skills).toMatchObject({
    type: 'array',
    maxItems: 3,
    uniqueItems: true,
    items: { type: 'string', pattern: '^[^,]*$' },
  });
  expect(s.properties.phone.pattern).toBe('^\\+[1-9]\\d{6,14}$');
  expect(s.properties.budget.pattern).toBe('^\\d+$');
  expect(s.properties.price.pattern).toBe('^\\d+(\\.\\d{1,2})?$');
  expect(s.properties.price.description).toContain('EUR');
  const bad = await page.evaluate(() => window.__tools.get('profile').execute({ skills: ['a,b'], phone: '0207' }));
  expect(bad.errors.map((e) => e.field).toSorted()).toEqual(['phone', 'skills']);

  const result = await page.evaluate(() =>
    window.__tools.get('profile').execute({ color: '#ff0000', skills: ['a', 'b'], phone: '+442071838750', budget: '500', price: '9.5' }),
  );

  expect(result.ok).toBe(true);
  expect(result.data).toMatchObject({ color: '#ff0000', phone: '+442071838750', budget: '500', price: '9.50' });
  expect(await page.locator('#f-profile focsd-tag-input').evaluate((el) => el.values)).toEqual(['a', 'b']);
});

test('wave 14a form controls have schemas and can be filled', async ({ page }) => {
  await addForm(
    page,
    'booking',
    `<focsd-date-field label="Arrival" name="arrival"></focsd-date-field>
     <focsd-listbox label="Extras" name="extras" multiple><focsd-option value="wifi">Wi-Fi</focsd-option><focsd-option value="parking">Parking</focsd-option></focsd-listbox>
     <focsd-date-time-picker label="Pickup" name="pickup"></focsd-date-time-picker>
     <focsd-swatch-picker label="Tag color" name="tag" swatches="#ff6347,#2e8b57"></focsd-swatch-picker>
     <focsd-editable label="Booking name" name="title" value="Spring trip"></focsd-editable>`,
    'toolautosubmit',
  );
  await page.waitForFunction(() =>
    ['focsd-date-field', 'focsd-listbox', 'focsd-date-time-picker', 'focsd-swatch-picker', 'focsd-editable'].every((t) =>
      customElements.get(t),
    ),
  );

  const s = await page
    .waitForFunction(() => window.__tools.get('booking')?.inputSchema?.properties?.pickup && window.__tools.get('booking').inputSchema)
    .then((h) => h.jsonValue());

  expect(s.properties.arrival.pattern).toBe('^\\d{4}-\\d{2}-\\d{2}$');
  expect(s.properties.extras).toMatchObject({ type: 'array', items: { enum: ['wifi', 'parking'] } });
  expect(new RegExp(s.properties.pickup.pattern, 'v').test('2026-05-01T08:15')).toBe(true);
  expect(s.properties.tag.enum).toEqual(['#ff6347', '#2e8b57']);
  expect(s.properties.title.type).toBe('string');

  const result = await page.evaluate(() =>
    window.__tools
      .get('booking')
      .execute({ arrival: '2026-05-01', extras: ['parking'], pickup: '2026-05-01T08:15', tag: '#2e8b57', title: 'May trip' }),
  );

  expect(result.ok).toBe(true);
  expect(result.data).toMatchObject({
    arrival: '2026-05-01',
    pickup: '2026-05-01T08:15',
    tag: '#2e8b57',
    title: 'May trip',
    extras: 'parking',
  });
});

test('wave 14a: swatch picker with allow-custom takes any color; read-only editable is not offered', async ({ page }) => {
  await addForm(
    page,
    'tagging',
    `<focsd-swatch-picker label="Color" name="tag" swatches="#ff6347" allow-custom></focsd-swatch-picker>
     <focsd-editable label="Locked" name="locked" value="x" readonly></focsd-editable>
     <focsd-text-field label="Anchor" name="anchor"></focsd-text-field>`,
    'toolautosubmit',
  );
  await page.waitForFunction(() => customElements.get('focsd-swatch-picker') && customElements.get('focsd-editable'));

  const s = await page
    .waitForFunction(() => window.__tools.get('tagging')?.inputSchema?.properties?.anchor && window.__tools.get('tagging').inputSchema)
    .then((h) => h.jsonValue());

  expect(s.properties.tag.enum).toBeUndefined();
  expect(s.properties.tag.description).toContain('#ff6347');
  expect(s.properties.locked).toBeUndefined();
});

test('wave 14a: swatch schema follows swatches changes and rejects non-colors', async ({ page }) => {
  await addForm(
    page,
    'swatchy',
    '<focsd-swatch-picker id="sw" label="Color" name="tag" swatches="#ff6347"></focsd-swatch-picker>',
    'toolautosubmit',
  );
  await page.waitForFunction(() => window.__tools.get('swatchy')?.inputSchema?.properties?.tag?.enum?.length === 1);
  await page.evaluate(() => document.getElementById('sw').setAttribute('swatches', '#ff6347,#2e8b57'));
  await page.waitForFunction(() => window.__tools.get('swatchy').inputSchema.properties.tag.enum.length === 2);
  await page.evaluate(() => document.getElementById('sw').setAttribute('allow-custom', ''));
  await page.waitForFunction(() => window.__tools.get('swatchy').inputSchema.properties.tag.format === 'color');

  const result = await page.evaluate(() =>
    window.__tools
      .get('swatchy')
      .execute({ tag: 'not a color!' })
      .catch((e) => ({ thrown: String(e) })),
  );

  // Refused by the schema check, before any fill or submit: one error, on the tag field, naming the format.
  expect(result).toEqual({ ok: false, errors: [{ field: 'tag', message: expect.stringMatching(/^Expected the format /) }] });
});
