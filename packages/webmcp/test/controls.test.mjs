// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { controlSchema, formSchema, isHidden } from '../src/schema.js';
import { check, fill } from '../src/fill.js';

/**
 * A Focsd control as the page would hold it: attributes plus a name.
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {string} [inner]
 */
function control(tag, attrs = {}, inner = '') {
  const el = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.name = 'x';
  el.innerHTML = inner;

  return el;
}

/** Give each <focsd-option> child its value property, as the real element does. */
const withValues = (el) => {
  for (const o of el.querySelectorAll('focsd-option, focsd-radio, focsd-toggle')) o.value = o.getAttribute('value');

  return el;
};

const OPTIONS = '<focsd-option value="a">Alpha</focsd-option><focsd-option value="b">Beta</focsd-option>';

describe('controlSchema: Focsd controls', () => {
  it('select: an enum with the labels in the description', () => {
    const schema = controlSchema(withValues(control('focsd-select', { label: 'Pick' }, OPTIONS)));
    expect(schema).toMatchObject({ type: 'string', enum: ['a', 'b'] });
    expect(schema.description).toContain('a (Alpha)');
  });

  it('multi-select: a unique list, limited by max', () => {
    const schema = controlSchema(withValues(control('focsd-multi-select', { max: '2' }, OPTIONS)));
    expect(schema).toMatchObject({ type: 'array', uniqueItems: true, maxItems: 2, items: { enum: ['a', 'b'] } });
  });

  it('combobox with allow-custom takes free text and refuses commas when multiple', () => {
    const schema = controlSchema(withValues(control('focsd-combobox', { 'allow-custom': '', multiple: '' }, OPTIONS)));
    expect(schema.type).toBe('string');
    expect(schema.examples).toEqual(['a', 'b']);
  });

  it('radio group and toggle group list their choices', () => {
    const radios = controlSchema(
      withValues(control('focsd-radio-group', {}, '<focsd-radio value="s">Small</focsd-radio><focsd-radio value="l">Large</focsd-radio>')),
    );

    expect(radios).toMatchObject({ type: 'string', enum: ['s', 'l'] });
    const single = controlSchema(withValues(control('focsd-toggle-group', {}, '<focsd-toggle value="b">Bold</focsd-toggle>')));
    expect(single).toMatchObject({ type: 'string', enum: ['b'] });

    const multiple = controlSchema(
      withValues(
        control(
          'focsd-toggle-group',
          { type: 'multiple' },
          '<focsd-toggle value="b">Bold</focsd-toggle><focsd-toggle value="i,t">It</focsd-toggle>',
        ),
      ),
    );

    expect(multiple).toMatchObject({ type: 'array', items: { enum: ['b'] } });
  });

  it('tag input escapes its separator and honours allow-duplicates and max', () => {
    const schema = controlSchema(control('focsd-tag-input', { separator: ']', max: '3', 'allow-duplicates': '' }));
    expect(schema).toMatchObject({ type: 'array', maxItems: 3 });
    expect(schema.uniqueItems).toBeUndefined();
    expect(new RegExp(schema.items.pattern, 'v').test('a]b')).toBe(false);
  });

  it('phone, time, otp and color have patterns', () => {
    expect(controlSchema(control('focsd-phone-field')).pattern).toContain('\\+');
    expect(controlSchema(control('focsd-time-field')).description).toContain('HH:MM');
    expect(controlSchema(control('focsd-otp-field', { length: '4' })).pattern).toBe('^\\d{4}$');
    expect(controlSchema(control('focsd-otp-field')).pattern).toBe('^\\d{6}$');
    expect(controlSchema(control('focsd-color-picker')).format).toBe('color');
  });

  it('currency states its decimals, bounds and sign', () => {
    const eur = controlSchema(control('focsd-currency-field', { currency: 'eur', min: '1', max: '50' }));
    expect(eur.pattern).toBe('^\\d+(\\.\\d{1,2})?$');
    expect(eur.description).toContain('At least 1.');
    expect(eur.description).toContain('At most 50.');
    expect(controlSchema(control('focsd-currency-field', { currency: 'JPY' })).pattern).toBe('^\\d+$');
    expect(controlSchema(control('focsd-currency-field', { 'allow-negative': '' })).pattern).toContain('-?');
    expect(controlSchema(control('focsd-currency-field', { currency: 'not-a-code' })).pattern).toContain('{1,2}');
  });

  it('number, slider, rating and date controls state their bounds', () => {
    expect(controlSchema(control('focsd-number-field', { min: '1', max: '9', step: '2' }))).toMatchObject({
      type: 'number',
      minimum: 1,
      maximum: 9,
      multipleOf: 2,
    });
    expect(controlSchema(control('focsd-slider'))).toMatchObject({ type: 'number', minimum: 0, maximum: 100 });
    expect(controlSchema(control('focsd-slider', { range: '', min: '5', max: '10' }))).toMatchObject({
      type: 'array',
      minItems: 2,
      maxItems: 2,
    });
    expect(controlSchema(control('focsd-rating', { max: '10' }))).toMatchObject({ type: 'integer', maximum: 10 });
    expect(controlSchema(control('focsd-rating')).maximum).toBe(5);
    expect(controlSchema(control('focsd-date-picker', { min: '2026-01-01', max: '2026-12-31' })).description).toContain('2026-01-01');
    expect(controlSchema(control('focsd-date-range-picker')).required).toEqual(['start', 'end']);
  });

  it('switches, checkboxes and toggles are booleans; a rich text field says it takes HTML', () => {
    for (const tag of ['focsd-checkbox', 'focsd-switch', 'focsd-toggle'])
      expect(controlSchema(control(tag, {}, 'Agree')).type).toBe('boolean');
    expect(controlSchema(control('focsd-rich-text')).description).toBe('HTML.');
  });

  it('never offers secrets, files, buttons, disabled, read-only or unnamed controls', () => {
    expect(controlSchema(control('focsd-password-field'))).toBeNull();
    expect(controlSchema(control('focsd-file-upload'))).toBeNull();
    expect(controlSchema(control('focsd-text-field', { type: 'password' }))).toBeNull();
    expect(controlSchema(control('focsd-text-field', { disabled: '' }))).toBeNull();
    expect(controlSchema(control('focsd-text-field', { readonly: '' }))).toBeNull();
    expect(controlSchema(control('focsd-text-field', { 'data-tool-skip': '' }))).toBeNull();
    const unnamed = document.createElement('focsd-text-field');
    expect(isHidden(unnamed)).toBe(true);
    expect(controlSchema(control('focsd-unknown-thing', { label: 'Free' }))).toMatchObject({ type: 'string', description: 'Free' });
  });
});

describe('formSchema and fill on a native form', () => {
  const html = `<form>
    <label>Name <input name="name" required maxlength="20" minlength="2" pattern="[A-Z].*"></label>
    <input name="email" type="email">
    <input name="age" type="number" min="1" max="99">
    <input name="agree" type="checkbox">
    <input name="size" type="radio" value="s" required><input name="size" type="radio" value="l">
    <fieldset><legend>Toppings</legend>
      <label><input name="top" type="checkbox" value="ham" required> Ham</label>
      <label><input name="top" type="checkbox" value="egg"> Egg</label>
    </fieldset>
    <select name="where"><option value="">Choose</option><option value="in">Inside</option><option value="out" disabled>Out</option></select>
    <select name="many" multiple><option value="x">X</option><option value="y">Y</option></select>
    <textarea name="note"></textarea>
    <input name="secret" type="password"><input name="dup"><input name="dup">
  </form>`;

  const make = () => {
    document.body.innerHTML = html;

    return document.querySelector('form');
  };

  it('describes every exposed control once', () => {
    const schema = formSchema(make());
    expect(Object.keys(schema.properties).toSorted()).toEqual(
      ['age', 'agree', 'dup', 'email', 'many', 'name', 'note', 'size', 'top', 'where'].toSorted(),
    );
    expect(schema.required.toSorted()).toEqual(['name', 'size', 'top']);
    expect(schema.properties.name).toMatchObject({ type: 'string', minLength: 2, maxLength: 20, pattern: '^(?:[A-Z].*)$' });
    expect(schema.properties.email.format).toBe('email');
    expect(schema.properties.size.enum).toEqual(['s', 'l']);
    expect(schema.properties.top).toMatchObject({ type: 'array', items: { enum: ['ham', 'egg'] } });
    expect(schema.properties.top.description).toContain('Toppings');
    expect(schema.properties.where.enum).toEqual(['in']);
    expect(schema.properties.many).toMatchObject({ type: 'array' });
  });

  it('drops a pattern the schema language cannot compile', () => {
    document.body.innerHTML = '<form><input name="p" pattern="(["></form>';
    expect(formSchema(document.querySelector('form')).properties.p.pattern).toBeUndefined();
  });

  it('fills what the agent gave, the way a person would', async () => {
    const form = make();
    const seen = [];
    form.addEventListener('change', (event) => seen.push(event.target.name));
    await fill(form, {
      name: 'Ada',
      age: 36,
      agree: true,
      size: 'l',
      top: ['egg'],
      where: 'in',
      many: ['y'],
      note: 'hi',
      ghost: 'ignored',
    });
    const data = new FormData(form);
    expect(data.get('name')).toBe('Ada');
    expect(data.get('age')).toBe('36');
    expect(data.get('agree')).toBe('on');
    expect(data.get('size')).toBe('l');
    expect(data.getAll('top')).toEqual(['egg']);
    expect(data.get('where')).toBe('in');
    expect(data.getAll('many')).toEqual(['y']);
    expect(data.get('note')).toBe('hi');
    expect(seen).toEqual(expect.arrayContaining(['name', 'agree', 'size', 'where']));
  });

  it('writes Focsd controls through their own properties', async () => {
    const form = document.createElement('form');
    document.body.append(form);

    const add = (tag, name) => {
      const el = document.createElement(tag);
      el.name = name;

      return el;
    };
    // happy-dom does not list unknown elements in form.elements, so drive the lookup directly.

    const nodes = [
      'focsd-slider',
      'focsd-rating',
      'focsd-switch',
      'focsd-toggle',
      'focsd-tag-input',
      'focsd-combobox',
      'focsd-date-range-picker',
      'focsd-text-field',
    ].map((tag) => add(tag, tag));

    Object.defineProperty(form, 'elements', { value: nodes });
    await fill(form, {
      'focsd-slider': [2, 8],
      'focsd-rating': 4,
      'focsd-switch': true,
      'focsd-toggle': true,
      'focsd-tag-input': ['a', 'b'],
      'focsd-combobox': ['x', 'y'],
      'focsd-date-range-picker': { start: '2026-01-01', end: '2026-01-02' },
      'focsd-text-field': 'plain',
    });
    const by = Object.fromEntries(nodes.map((n) => [n.localName, n]));
    expect([by['focsd-slider'].valueLow, by['focsd-slider'].valueHigh]).toEqual([2, 8]);
    expect(by['focsd-rating'].value).toBe(4);
    expect(by['focsd-switch'].checked).toBe(true);
    expect(by['focsd-toggle'].pressed).toBe(true);
    expect(by['focsd-tag-input'].values).toEqual(['a', 'b']);
    expect(by['focsd-combobox'].value).toBe('x,y');
    expect([by['focsd-date-range-picker'].valueStart, by['focsd-date-range-picker'].valueEnd]).toEqual(['2026-01-01', '2026-01-02']);
    expect(by['focsd-text-field'].value).toBe('plain');
  });
});

describe('wave 14a controls', () => {
  const swatch = (attrs, items) => Object.assign(control('focsd-swatch-picker', attrs), { items });

  it('swatch picker: an enum of enabled swatches, or a validated color with allow-custom', () => {
    const items = [{ key: '#ff6347' }, { key: '#2e8b5780' }, { key: '#000000', disabled: true }];
    expect(controlSchema(swatch({}, items))).toMatchObject({ type: 'string', enum: ['#ff6347', '#2e8b5780'] });
    const custom = controlSchema(swatch({ 'allow-custom': '' }, items));
    expect(custom.enum).toBeUndefined();
    expect(custom.description).toContain('#ff6347');
    expect(check({ type: 'object', properties: { x: custom } }, { x: 'not a color!' })).toHaveLength(1);
    expect(check({ type: 'object', properties: { x: custom } }, { x: 'rebeccapurple' })).toEqual([]);
  });

  it('swatch picker: the description maps each color to its name', () => {
    const items = [
      { key: '#e11d48', name: 'Brand red' },
      { key: '#2e8b57', name: 'Sea green' },
    ];

    expect(controlSchema(swatch({}, items)).description).toContain('#e11d48 (Brand red)');
    expect(controlSchema(swatch({ 'allow-custom': '' }, items)).description).toContain('#2e8b57 (Sea green)');
  });

  it('listbox multiple keeps a value with a comma (its list is written through values)', () => {
    const inner = '<focsd-option value="a,b">A and B</focsd-option><focsd-option value="c">C</focsd-option>';
    const many = controlSchema(Object.assign(withValues(control('focsd-listbox', { multiple: '' }, inner)), { multiple: true }));
    expect(many.items.enum).toEqual(['a,b', 'c']);
  });

  it('listbox: multiple is a list, single is a string', () => {
    const many = controlSchema(Object.assign(withValues(control('focsd-listbox', { multiple: '' }, OPTIONS)), { multiple: true }));
    expect(many).toMatchObject({ type: 'array', items: { enum: ['a', 'b'] } });
    expect(controlSchema(withValues(control('focsd-listbox', {}, OPTIONS)))).toMatchObject({ type: 'string', enum: ['a', 'b'] });
  });

  it('date-time picker and date field', () => {
    const dt = controlSchema(control('focsd-date-time-picker', { min: '2026-01-01T08:00', max: '2026-12-31T20:00' }));
    const re = new RegExp(dt.pattern, 'v');
    expect(re.test('2026-03-16T09:30')).toBe(true);
    expect(re.test('2026-13-16T09:30')).toBe(false);
    expect(re.test('2026-03-16T24:30')).toBe(false);
    // Days past the month's end are refused; 29 February is left to the control's own validity.
    expect(re.test('2026-01-31T09:30')).toBe(true);
    expect(re.test('2026-04-31T09:30')).toBe(false);
    expect(re.test('2026-11-30T09:30')).toBe(true);
    expect(re.test('2026-02-30T09:30')).toBe(false);
    expect(re.test('2028-02-29T09:30')).toBe(true);
    expect(dt.description).toContain('On or after 2026-01-01T08:00.');
    expect(dt.description).toContain('On or before 2026-12-31T20:00.');
    expect(controlSchema(control('focsd-date-field', { min: '2026-01-01' }))).toMatchObject({
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    });
  });

  it('fill writes a listbox as values and the others as value', async () => {
    const form = document.createElement('form');
    const nodes = ['focsd-listbox', 'focsd-date-time-picker', 'focsd-editable'].map((t, i) => Object.assign(control(t), { name: `n${i}` }));
    Object.defineProperty(form, 'elements', { value: nodes });
    await fill(form, { n0: ['a', 'b'], n1: '2026-05-01T08:15', n2: 'hi' });
    expect(nodes[0].values).toEqual(['a', 'b']);
    expect(nodes[1].value).toBe('2026-05-01T08:15');
    expect(nodes[2].value).toBe('hi');
  });
});

describe('signature pad (21c): on the never-list by default', () => {
  it('is never offered to agents, because an agent must not sign for a person', () => {
    expect(controlSchema(control('focsd-signature-pad', { label: 'Signature', name: 'sig' }))).toBeNull();
    expect(isHidden(control('focsd-signature-pad', { label: 'Signature', name: 'sig' }))).toBe(true);
  });

  it('is left out of a form tool next to fields that are offered', () => {
    const form = document.createElement('form');

    const nodes = [
      Object.assign(control('focsd-text-field', { label: 'Name' }), { name: 'name' }),
      Object.assign(control('focsd-signature-pad', { label: 'Signature' }), { name: 'sig' }),
    ];

    Object.defineProperty(form, 'elements', { value: nodes });
    const { properties } = formSchema(form);

    expect(Object.keys(properties)).toEqual(['name']);
  });

  it('fill never writes to the pad, even when an agent sends a value for it', async () => {
    const form = document.createElement('form');
    const pad = Object.assign(control('focsd-signature-pad'), { name: 'sig', typed: false, typedName: '' });
    const events = /** @type {string[]} */ ([]);

    for (const type of ['input', 'change']) pad.addEventListener(type, () => events.push(type));
    Object.defineProperty(form, 'elements', { value: [pad] });
    await fill(form, { sig: 'Ada Lovelace' });

    // Without the never-list guard `fill` reaches its generic branch: it sets `value` and fires both events.
    expect([pad.typed, pad.typedName]).toEqual([false, '']);
    expect(pad.value).toBeUndefined();
    expect(events).toEqual([]);
  });
});

describe('check: format and bound messages', () => {
  const schema = (properties, required) => ({ type: 'object', properties, required });
  const message = (property, value) => check(schema({ x: property }), { x: value })[0]?.message;

  it('names what is wrong', () => {
    expect(message({ type: 'string', format: 'email' }, 'nope')).toMatch(/email/i);
    expect(message({ type: 'string', format: 'date' }, '01/02/2026')).toMatch(/date/i);
    expect(message({ type: 'string', minLength: 3 }, 'ab')).toBeTruthy();
    expect(message({ type: 'string', maxLength: 1 }, 'ab')).toBeTruthy();
    expect(message({ type: 'boolean' }, 'yes')).toBeTruthy();
    expect(message({ type: 'array', minItems: 2, items: { type: 'string' } }, ['a'])).toMatch(/at least 2/i);
    expect(message({ type: 'string', enum: ['a'] }, 'b')).toBeTruthy();
  });

  it('treats a pattern the engine cannot compile as matching (browsers ignore it)', () => {
    expect(message({ type: 'string', pattern: '([' }, 'anything')).toBeUndefined();
  });
});
