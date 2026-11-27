/**
 * One Markdown contract per element (`/components/<tag>.md`): what an agent needs to use it
 * correctly, generated from the MCP catalogue data (manifest + docs examples + accessibility notes).
 */
import { contractPath, eventsOf, schemaPath } from './schemas.mjs';

const NATIVE_EVENTS = new Set(['input', 'change', 'toggle', 'close', 'cancel']);

/** @param {unknown} s */
const cell = (s) =>
  String(s ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\n', ' ');

/** @param {string} s */
const code = (s) => (s ? `\`${cell(s)}\`` : '');

/**
 * @param {string[]} cols
 * @param {unknown[][]} rows
 * @param {string} [empty]
 */
function table(cols, rows, empty = '_None._') {
  if (!rows.length) return empty;

  return [`| ${cols.join(' | ')} |`, `| ${cols.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}

/** @param {any} c */
function header(c) {
  const lines = [
    `- Package: \`${c.package}\``,
    `- Import: \`${c.import}\``,
    `- Category: ${c.category}${c.pattern ? `; pattern: ${c.pattern}` : ''}`,
    `- JSON Schema: [${schemaPath(c.tag)}](${schemaPath(c.tag)})`,
  ];

  if (c.partOf) lines.splice(2, 0, `- Part of: \`<${c.partOf}>\``);

  return [`# ${c.name} (\`<${c.tag}>\`)`, c.summary, c.description && c.description !== c.summary ? c.description : '', lines.join('\n')];
}

/** @param {any} c */
function api(c) {
  const attributes = table(
    ['Attribute', 'Property', 'Type', 'Default', 'Description'],
    c.attributes.map((/** @type {any} */ a) => [
      code(a.name),
      code(a.property ?? ''),
      code(a.type),
      code(a.default ?? ''),
      cell(a.description),
    ]),
  );

  const properties = c.properties.length
    ? table(
        ['Property (JS only)', 'Type', 'Read-only', 'Description'],
        c.properties.map((/** @type {any} */ p) => [code(p.name), code(p.type), p.readonly ? 'yes' : 'no', cell(p.description)]),
      )
    : '';

  const methods = c.methods.length
    ? `## Methods\n\n${table(
        ['Method', 'Description'],
        c.methods.map((/** @type {any} */ m) => [code(`${m.name}()`), cell(m.description)]),
      )}`
    : '';

  return [`## Attributes and properties\n\n${attributes}`, properties, methods];
}

/**
 * @param {ReturnType<typeof eventsOf>} events
 */
function eventsSection(events) {
  const rows = events.map((e) => {
    let detail = 'none';

    if (e.detailType) detail = `${code(e.detailType)}${e.detailText ? ` = ${code(e.detailText)}` : ''}`;
    else if (NATIVE_EVENTS.has(e.name)) detail = 'none (native event)';

    return [code(e.name), code(e.type), detail, cell(e.description)];
  });

  return `## Events\n\n${table(['Event', 'Type', 'Detail', 'Description'], rows)}`;
}

/** @param {any} c */
function surfaces(c) {
  const named = (/** @type {{ name: string, description: string }[]} */ list) => list.map((x) => [code(x.name), cell(x.description)]);

  return [
    `## Slots\n\n${table(['Slot', 'Description'], named(c.slots))}`,
    `## CSS parts\n\n${table(['Part', 'Description'], named(c.cssParts))}`,
    `## CSS custom properties\n\n${table(['Property', 'Description'], named(c.cssProperties ?? []))}`,
  ];
}

/** @param {any} c */
function accessibility(c) {
  const notes = c.a11y.length ? c.a11y.map((/** @type {string} */ n) => `- ${n}`).join('\n') : '_No component-specific notes._';

  const keys = c.keyboard.length
    ? `\n\n${table(
        ['Key', 'Action'],
        c.keyboard.map((/** @type {[string, string]} */ [k, v]) => [cell(k), cell(v)]),
      )}`
    : '';

  return `## Accessibility\n\n${notes}${keys}`;
}

/**
 * Do and don't lines derived from the element's API, so they hold for every element.
 * @param {any} c
 * @param {ReturnType<typeof eventsOf>} events
 */
export function usageRules(c, events) {
  const has = (/** @type {string} */ name) => c.attributes.some((/** @type {any} */ a) => a.name === name);

  const enums = c.attributes
    .filter((/** @type {any} */ a) => /^'[^']*'( \| '[^']*')+$/.test(a.type))
    .map((/** @type {any} */ a) => code(a.name));

  const custom = events.filter((e) => e.detailType).map((e) => code(e.name));
  const lines = [`- Do: load it once with \`${c.import}\` before using \`<${c.tag}>\`.`];

  if (c.partOf) lines.push(`- Do: place \`<${c.tag}>\` inside \`<${c.partOf}>\`; it is not meant to stand alone.`);

  if (has('label')) lines.push('- Do: give it a visible `label`, or `aria-label` when there is no visible label.');

  if (has('name'))
    lines.push('- Do: set `name` so the value submits with its form, and listen for `input` and `change` as on a native control.');

  if (custom.length) lines.push(`- Do: read \`event.detail\` on ${custom.join(', ')}; its shape is in the Events table.`);

  if (c.cssProperties?.length || c.cssParts.length)
    lines.push(`- Do: restyle with the \`--focsd-*\` custom properties and \`::part()\` listed above.`);

  lines.push("- Don't: use attributes, slots or events that are not listed in this contract.");

  if (enums.length) lines.push(`- Don't: set ${enums.join(', ')} to values outside the listed options.`);

  lines.push(
    "- Don't: expect a `detail` on the native `input`, `change`, `toggle`, `close` or `cancel` events; they carry none.",
    "- Don't: style shadow DOM internals or hard-code colors; use the `--focsd-*` tokens.",
  );

  return `## Do and don't\n\n${lines.join('\n')}`;
}

/**
 * @param {any} component MCP catalogue component.
 * @param {{ decl: any, typedefs: Map<string, string> }} context
 * @returns {string}
 */
export function componentContract(component, { decl, typedefs }) {
  const events = eventsOf(component.events, decl, typedefs);

  const usage = component.example
    ? `\`\`\`html\n${component.example}\n\`\`\``
    : `\`\`\`html\n<${component.tag}></${component.tag}>\n\`\`\``;

  return `${[
    `<!-- Generated from the custom elements manifest by scripts/agent. Contract: ${contractPath(component.tag)} -->`,
    ...header(component),
    `## Usage\n\n${usage}`,
    ...api(component),
    eventsSection(events),
    ...surfaces(component),
    accessibility(component),
    usageRules(component, events),
  ]
    .filter(Boolean)
    .join('\n\n')}\n`;
}
