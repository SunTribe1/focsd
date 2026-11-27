/**
 * JSON Schema for each form control, from its element type and attributes. Focsd controls are
 * form-associated custom elements, which the browser's own declarative WebMCP does not describe;
 * this module knows what each one accepts.
 */

/**
 * JSON Schema, limited to the keywords this package writes and checks.
 * @typedef {object} JsonSchema
 * @property {string} [type]
 * @property {string} [description]
 * @property {string} [format]
 * @property {string} [pattern]
 * @property {unknown[]} [enum]
 * @property {unknown[]} [examples]
 * @property {JsonSchema} [items]
 * @property {Record<string, JsonSchema>} [properties]
 * @property {string[]} [required]
 * @property {boolean} [uniqueItems]
 * @property {number} [minItems]
 * @property {number} [maxItems]
 * @property {number} [minimum]
 * @property {number} [maximum]
 * @property {number} [multipleOf]
 * @property {number} [minLength]
 * @property {number} [maxLength]
 */

/**
 * An option of a native select or a Focsd select-like control.
 * @typedef {Element & { value: string, label?: string, text?: string, disabled?: boolean, selected?: boolean }} OptionLike
 */

/**
 * A form control, native or Focsd, as this package reads it.
 * @typedef {HTMLElement & {
 *   name: string,
 *   type?: string,
 *   value?: string,
 *   disabled?: boolean,
 *   readOnly?: boolean,
 *   required?: boolean,
 *   multiple?: boolean,
 *   labels?: NodeListOf<HTMLLabelElement> | null,
 *   options?: Iterable<OptionLike>,
 * }} Control
 */

/** @typedef {{ value: string | null | undefined, label?: string | null }} Choice */

/**
 * One problem with agent input or a field.
 * @typedef {{ field: string, message: string }} FieldError
 */

/**
 * Controls never offered to agents: secrets, files, buttons, and the signature pad (an agent must not sign for a
 * person). Letting agents type a name into the pad later means removing it here and adding a schema and a fill branch.
 */
const NEVER = new Set(['focsd-password-field', 'focsd-file-upload', 'focsd-button', 'focsd-icon-button', 'focsd-signature-pad']);
const NATIVE_NEVER = new Set(['hidden', 'password', 'file', 'submit', 'button', 'reset', 'image']);

/**
 * Mirrors `finiteOrUndefined` in packages/primitives/src/internal/number.js (this copy only refuses
 * NaN, not Infinity). This package has no dependencies by design, so it keeps its own copy: keep
 * the two in sync.
 * @param {unknown} v
 */
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

/** @param {Node} el */
const text = (el) => (el.textContent ?? '').replaceAll(/\s+/g, ' ').trim();

/** @param {Record<string, unknown>} o */
const clean = (o) => /** @type {JsonSchema} */ (Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')));

/**
 * What the control is for: toolparamdescription, else its label.
 * @param {Control} el
 * @returns {string}
 */
function describe(el) {
  return (
    el.getAttribute('toolparamdescription') ||
    el.getAttribute('label') ||
    el.getAttribute('aria-label') ||
    el.labels?.[0]?.textContent?.trim() ||
    ''
  );
}

/**
 * Choosable options of a select-like Focsd control: [{ value, label }] in order, including grouped ones.
 * @param {Control} el
 * @returns {Choice[]}
 */
function options(el) {
  const list = el.options ?? [.../** @type {NodeListOf<OptionLike>} */ (el.querySelectorAll('focsd-option'))];

  return [...list].flatMap((o) => {
    if (o.disabled || o.hasAttribute?.('disabled') || o.closest?.('focsd-option-group[disabled]')) return [];
    const value = o.value || o.label || text(o);

    return value ? [{ value, label: o.label || text(o) }] : [];
  });
}

/** @param {Choice} o */
const noComma = (o) => !String(o.value).includes(',');

/**
 * Checkbox-like controls: several sharing a name form one list of choices.
 * @param {Control} el
 */
const isCheckbox = (el) =>
  (el.localName === 'input' && el.type === 'checkbox') || el.localName === 'focsd-checkbox' || el.localName === 'focsd-switch';

/**
 * Exposed checkboxes grouped by name, only for names shared by two or more: Map<name, element[]>.
 * @param {HTMLFormElement} form
 * @returns {Map<string, Control[]>}
 */
export function checkboxGroups(form) {
  /** @type {Map<string, Control[]>} */
  const groups = new Map();

  for (const el of /** @type {Iterable<Control>} */ (form.elements))
    if (isCheckbox(el) && !isHidden(el)) groups.set(el.name, [...(groups.get(el.name) ?? []), el]);

  for (const [name, group] of groups) if (group.length < 2) groups.delete(name);

  return groups;
}

/**
 * A checkbox's own label: its slotted text, else its <label>.
 * @param {Control} el
 */
const checkboxLabel = (el) => (el.localName === 'input' ? el.labels?.[0]?.textContent?.trim() : text(el)) || el.value;

/**
 * Enum with the human labels in the description, so agents can map "the terrace" to "terrace".
 * @param {Choice[]} opts
 * @param {string} description
 */
function enumOf(opts, description) {
  const labeled = opts.some((o) => o.label && o.label !== o.value);
  const hint = labeled ? `Options: ${opts.map((o) => `${o.value} (${o.label})`).join(', ')}.` : '';

  return { values: opts.map((o) => o.value), description: [description, hint].filter(Boolean).join(' ') };
}

/**
 * Decimal places of a currency (2 for EUR, 0 for JPY), from Intl.
 * Mirrors `minorUnits` in packages/primitives/src/internal/currency.js. This package has no
 * dependencies by design, so it keeps its own copy: keep the two in sync.
 * @param {string} currency
 */
function minorUnits(currency) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits;
  } catch {
    return 2;
  }
}

/** Text-like Focsd controls whose `type` can make them secret. */
const TYPED = new Set(['focsd-text-field', 'focsd-search-field', 'focsd-textarea']);

/**
 * True when the control should not be exposed: secrets, files, buttons, hidden, disabled or read-only fields.
 * @param {Control} el
 * @returns {boolean}
 */
export function isHidden(el) {
  const tag = el.localName;

  if (NEVER.has(tag) || el.disabled || el.hasAttribute('disabled') || el.hasAttribute('data-tool-skip')) return true;

  if (el.readOnly || el.hasAttribute('readonly')) return true;

  if (tag === 'input' && NATIVE_NEVER.has(/** @type {string} */ (el.type))) return true;

  if (TYPED.has(tag) && NATIVE_NEVER.has((el.getAttribute('type') || '').toLowerCase())) return true;

  if (tag === 'button' || tag === 'fieldset' || tag === 'output' || tag === 'object') return true;

  return !el.name;
}

/**
 * The description followed by any hints that apply.
 * @param {...(string | null | false | undefined)} parts
 */
const join = (...parts) => parts.filter(Boolean).join(' ');

/**
 * @param {Control} el
 * @param {string} n
 */
const numAttr = (el, n) => num(el.getAttribute(n));

/**
 * Builds the schema of one kind of control from the control and its description.
 * @typedef {(el: Control, description: string) => JsonSchema | null} Builder
 */

/** @type {Builder} */
function selectLikeSchema(el, description) {
  const tag = el.localName;
  const many = el.multiple || tag === 'focsd-multi-select';
  // A multiple combobox keeps its values comma-separated, so a value with a comma cannot be chosen.
  // focsd-select and focsd-listbox take their list through `values`, so commas are safe there.
  const joined = tag !== 'focsd-select' && tag !== 'focsd-listbox' && many;
  const { values, description: d } = enumOf(joined ? options(el).filter(noComma) : options(el), description);

  const item = el.hasAttribute('allow-custom')
    ? clean({ type: 'string', examples: values, pattern: joined ? '^[^,]*$' : undefined })
    : { type: 'string', enum: values };

  if (many) return clean({ type: 'array', items: item, uniqueItems: true, maxItems: numAttr(el, 'max') || undefined, description: d });

  return clean({ ...item, description: d });
}

/** @type {Builder} */
function radioGroupSchema(el, description) {
  const { values, description: d } = enumOf(
    [.../** @type {NodeListOf<Control>} */ (el.querySelectorAll('focsd-radio'))].flatMap((r) =>
      r.disabled ? [] : [{ value: r.value, label: text(r) }],
    ),
    description,
  );

  return clean({ type: 'string', enum: values, description: d });
}

/** @type {Builder} */
function toggleGroupSchema(el, description) {
  const multiple = el.getAttribute('type') === 'multiple';

  const { values, description: d } = enumOf(
    [.../** @type {NodeListOf<Control>} */ (el.querySelectorAll('focsd-toggle'))].flatMap((t) => {
      const choice = { value: t.value || t.getAttribute('value'), label: text(t) || t.getAttribute('label') };

      return !multiple || noComma(choice) ? [choice] : [];
    }),
    description,
  );

  if (multiple) return clean({ type: 'array', items: { type: 'string', enum: values }, uniqueItems: true, description: d });

  return clean({ type: 'string', enum: values, description: d });
}

/** @type {Builder} */
function tagInputSchema(el, description) {
  const separator = el.getAttribute('separator') || ',';

  return clean({
    type: 'array',
    items: { type: 'string', pattern: `^[^${separator.replaceAll(/[\\\]^-]/g, '\\$&')}]*$` },
    uniqueItems: el.hasAttribute('allow-duplicates') ? undefined : true,
    maxItems: numAttr(el, 'max') || undefined,
    description,
  });
}

/** @type {Builder} */
function currencySchema(el, description) {
  const currency = (el.getAttribute('currency') || 'USD').toUpperCase();
  const digits = minorUnits(currency);
  const min = numAttr(el, 'min');
  const max = numAttr(el, 'max');
  // As the field: a min decides on its own; without one, negatives need allow-negative.
  const sign = (min === undefined ? el.hasAttribute('allow-negative') : min < 0) ? '-?' : '';

  // The value is a string, so JSON Schema's minimum and maximum cannot apply: the bounds are stated.
  return clean({
    type: 'string',
    pattern: digits ? `^${sign}\\d+(\\.\\d{1,${digits}})?$` : `^${sign}\\d+$`,
    description: join(
      description,
      `Amount in ${currency}, with a dot for decimals.`,
      min !== undefined && `At least ${min}.`,
      max !== undefined && `At most ${max}.`,
    ),
  });
}

/**
 * A color the picker reads: hex (3, 4, 6 or 8 digits), a named color, or a color function.
 * Parentheses inside classes are escaped for the `v` flag the checker uses.
 */
const COLOR = '^(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|[a-zA-Z]+|[a-zA-Z]+\\([^\\(\\)]*\\))$';

/** @type {Builder} */
function sliderSchema(el, description) {
  const item = clean({ type: 'number', minimum: numAttr(el, 'min') ?? 0, maximum: numAttr(el, 'max') ?? 100 });

  if (el.hasAttribute('range'))
    return clean({ type: 'array', items: item, minItems: 2, maxItems: 2, description: join(description, 'Two numbers: [low, high].') });

  return clean({ ...item, description });
}

/** @type {Builder} */
function datePickerSchema(el, description) {
  const min = el.getAttribute('min');
  const max = el.getAttribute('max');

  return clean({
    type: 'string',
    format: 'date',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
    description: join(description, min && `On or after ${min}.`, max && `On or before ${max}.`),
  });
}

/** A month and a day that month can have (`MM-DD`), as a regular expression. */
const MONTH_DAYS = '(0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|02-(0[1-9]|[12]\\d)';

/** @type {Builder} */
function dateTimeSchema(el, description) {
  const min = el.getAttribute('min');
  const max = el.getAttribute('max');

  return clean({
    type: 'string',
    // No day past the month's end; 29 February in a common year is left to the control's validity.
    pattern: `^\\d{4}-(${MONTH_DAYS})T([01]\\d|2[0-3]):[0-5]\\d$`,
    description: join(
      description,
      'Local date and time, no time zone, e.g. 2026-03-16T09:30.',
      min && `On or after ${min}.`,
      max && `On or before ${max}.`,
    ),
  });
}

/** @type {Builder} */
function swatchPickerSchema(el, description) {
  const items = /** @type {{ key: string, name?: string, disabled?: boolean }[]} */ (/** @type {{ items?: unknown }} */ (el).items ?? []);
  // Each color with its name ("#e11d48 (Brand red)"), as the other option lists describe their labels.

  const { values, description: d } = enumOf(
    items.flatMap((i) => (i.disabled ? [] : [{ value: i.key, label: i.name ?? '' }])),
    description,
  );

  if (el.hasAttribute('allow-custom'))
    return clean({
      type: 'string',
      format: 'color',
      pattern: COLOR,
      // The named list already gives the swatches; without names, list them here.
      description: join(
        d,
        values.length > 0 && (d === description ? `One of ${values.join(', ')}, or any CSS color.` : 'Or any CSS color.'),
      ),
    });

  return clean({ type: 'string', enum: values, description: d });
}

/** @type {Builder} */
function nativeSelectSchema(el, description) {
  // Placeholder options (value="") and disabled ones are not choices.
  const opts = [.../** @type {Iterable<OptionLike>} */ (el.options)].flatMap((o) =>
    o.disabled || o.value === '' ? [] : [{ value: o.value, label: o.text }],
  );

  const { values, description: d } = enumOf(opts, description);

  if (el.multiple) return clean({ type: 'array', items: { type: 'string', enum: values }, uniqueItems: true, description: d });

  return clean({ type: 'string', enum: values, description: d });
}

/** @type {Builder} */
const booleanSchema = (el, description) => clean({ type: 'boolean', description: description || text(el) });

/** Schema builders by tag; other controls take free text. */
/** @type {Record<string, Builder>} */
const BUILDERS = {
  'focsd-select': selectLikeSchema,
  'focsd-listbox': selectLikeSchema,
  'focsd-combobox': selectLikeSchema,
  'focsd-multi-select': selectLikeSchema,
  'focsd-radio-group': radioGroupSchema,
  'focsd-toggle-group': toggleGroupSchema,
  'focsd-color-picker': (el, description) =>
    clean({ type: 'string', format: 'color', pattern: COLOR, description: join(description, 'Any CSS color, e.g. #3366ff.') }),
  'focsd-tag-input': tagInputSchema,
  'focsd-phone-field': (el, description) =>
    clean({
      type: 'string',
      pattern: '^\\+[1-9]\\d{6,14}$',
      description: join(description, 'International format (E.164), e.g. +442071838750.'),
    }),
  'focsd-currency-field': currencySchema,
  'focsd-checkbox': booleanSchema,
  'focsd-switch': booleanSchema,
  'focsd-toggle': booleanSchema,
  'focsd-number-field': (el, description) =>
    clean({
      type: 'number',
      minimum: numAttr(el, 'min'),
      maximum: numAttr(el, 'max'),
      multipleOf: numAttr(el, 'step'),
      description,
    }),
  'focsd-slider': sliderSchema,
  'focsd-rating': (el, description) => clean({ type: 'integer', minimum: 1, maximum: numAttr(el, 'max') ?? 5, description }),
  'focsd-date-picker': datePickerSchema,
  'focsd-date-field': datePickerSchema,
  'focsd-date-time-picker': dateTimeSchema,
  'focsd-swatch-picker': swatchPickerSchema,
  'focsd-editable': textSchema,
  'focsd-date-range-picker': (el, description) =>
    clean({
      type: 'object',
      properties: { start: { type: 'string', format: 'date' }, end: { type: 'string', format: 'date' } },
      required: ['start', 'end'],
      description,
    }),
  'focsd-time-field': (el, description) =>
    clean({ type: 'string', pattern: '^([01]\\d|2[0-3]):[0-5]\\d$', description: join(description, '24-hour time, HH:MM.') }),
  'focsd-otp-field': (el, description) => clean({ type: 'string', pattern: `^\\d{${numAttr(el, 'length') ?? 6}}$`, description }),
  'focsd-text-field': textSchema,
  'focsd-search-field': textSchema,
  'focsd-textarea': textSchema,
  'focsd-rich-text': textSchema,
  input: textSchema,
  textarea: textSchema,
  select: nativeSelectSchema,
};

/**
 * JSON Schema for one control, or null when it should not be exposed.
 * @param {Control} el
 * @returns {JsonSchema | null}
 */
export function controlSchema(el) {
  if (isHidden(el)) return null;
  const description = describe(el);
  const tag = el.localName;

  const build = Object.hasOwn(BUILDERS, tag) ? BUILDERS[tag] : undefined;

  if (build) return build(el, description);

  return clean({ type: 'string', description });
}

/**
 * HTML anchors `pattern` to the whole value; JSON Schema does not. Unusable patterns are dropped.
 * @param {string | null} pattern
 */
function anchored(pattern) {
  if (!pattern) return undefined;
  const full = `^(?:${pattern})$`;

  try {
    new RegExp(full, 'v');

    return full;
  } catch {
    return undefined;
  }
}

/** @type {Record<string, string | undefined>} */
const FORMATS = { email: 'email', url: 'uri', date: 'date', time: undefined, 'datetime-local': 'date-time' };

/**
 * @param {Control} el
 * @param {string} description
 * @returns {JsonSchema | null}
 */
function textSchema(el, description) {
  const type = (el.getAttribute('type') || el.type || 'text').toLowerCase();
  /** @param {string} n */
  const attr = (n) => el.getAttribute(n);

  if (el.localName === 'input') {
    if (type === 'checkbox') return clean({ type: 'boolean', description });

    if (type === 'number' || type === 'range')
      return clean({ type: 'number', minimum: num(attr('min')), maximum: num(attr('max')), description });

    if (type === 'radio') return null; // radios are described as a group by the caller
  }

  return clean({
    type: 'string',
    format: FORMATS[type],
    minLength: num(attr('minlength')),
    maxLength: num(attr('maxlength')),
    pattern: anchored(attr('pattern')),
    description: [description, el.localName === 'focsd-rich-text' ? 'HTML.' : ''].filter(Boolean).join(' '),
  });
}

/** @param {Control} el */
const isRequired = (el) => el.required || el.hasAttribute('required');

/**
 * A group of checkboxes sharing a name, as a list of choices.
 * @param {Control[]} group
 * @returns {JsonSchema}
 */
function checkboxGroupSchema(group) {
  const legend = group[0]?.closest('fieldset')?.querySelector('legend')?.textContent?.trim();

  const { values, description } = enumOf(
    group.map((el) => ({ value: el.value, label: checkboxLabel(el) })),
    join(legend, 'Choose any number.'),
  );

  return { type: 'array', items: { type: 'string', enum: values }, uniqueItems: true, description };
}

/**
 * A group of radios sharing a name, as one choice; the first radio describes the group.
 * @param {Control[]} group
 * @returns {JsonSchema}
 */
function nativeRadiosSchema(group) {
  const [first] = group;

  return clean({ type: 'string', enum: group.map((r) => r.value), description: first ? describe(first) : undefined });
}

/**
 * The tool's input schema for a whole form.
 * @param {HTMLFormElement} form
 * @returns {JsonSchema}
 */
export function formSchema(form) {
  /** @type {Record<string, JsonSchema>} */
  const properties = {};
  /** @type {string[]} */
  const required = [];
  /** @type {Map<string, Control[]>} */
  const radios = new Map();
  const groups = checkboxGroups(form);

  for (const el of /** @type {Iterable<Control>} */ (form.elements)) {
    if (groups.has(el.name) && /** @type {Control[]} */ (groups.get(el.name)).includes(el)) continue;

    if (el.localName === 'input' && el.type === 'radio' && el.name && !el.disabled) {
      radios.set(el.name, [...(radios.get(el.name) ?? []), el]);
      continue;
    }

    const schema = controlSchema(el);

    if (!schema || properties[el.name]) continue;
    properties[el.name] = schema;

    if (isRequired(el)) required.push(el.name);
  }

  for (const [name, group] of groups) {
    properties[name] = checkboxGroupSchema(group);

    if (group.some(isRequired)) required.push(name);
  }

  for (const [name, group] of radios) {
    properties[name] = nativeRadiosSchema(group);

    if (group.some((r) => r.required)) required.push(name);
  }

  return clean({ type: 'object', properties, required: required.length ? required : undefined });
}
