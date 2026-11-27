import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { typeSchema, parseTypedefs } from '../../../scripts/agent/types.mjs';
import { agentOutputs, fingerprints, staleEntries, FOCSD_KEYWORDS } from '../../../scripts/agent/index.mjs';
import { loadInputs } from '../../../scripts/agent/inputs.mjs';

/** The DTCG 2025.10 token types. */
const DTCG_TYPES = new Set([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography',
]);

const inputs = loadInputs();
const outputs = agentOutputs(inputs);

/** Every tag the custom elements manifests define. */
const cemTags = [...inputs.cem.keys()].toSorted();

const ajv = () => {
  const validator = new Ajv2020({ allErrors: true });

  for (const keyword of FOCSD_KEYWORDS) validator.addKeyword(keyword);

  return validator;
};

test('type strings: string-literal unions become enums', () => {
  assert.deepEqual(typeSchema("'s' | 'm' | 'l'"), { enum: ['s', 'm', 'l'], 'x-focsd-type': "'s' | 'm' | 'l'" });
  assert.deepEqual(typeSchema("'top' | 'start' | 'end' | undefined").enum, ['top', 'start', 'end']);
  assert.deepEqual(typeSchema("'' | 'critical'").enum, ['', 'critical']);
});

test('type strings: primitives, null, arrays, records and open unions', () => {
  assert.equal(typeSchema('boolean').type, 'boolean');
  assert.equal(typeSchema('number | undefined').type, 'number');
  assert.deepEqual(typeSchema('string | null').type, ['string', 'null']);
  assert.deepEqual(typeSchema('string | number | undefined').type, ['string', 'number']);
  assert.deepEqual(typeSchema('number | null | undefined').type, ['number', 'null']);
  assert.equal(typeSchema('Record<string, string>').type, 'object');
  assert.deepEqual(typeSchema('Record<string, string>').additionalProperties, { type: 'string' });
  assert.deepEqual(typeSchema('string[]'), { type: 'array', items: { type: 'string' }, 'x-focsd-type': 'string[]' });
  const open = typeSchema("'auto' | (string & {})");
  assert.equal(open.type, 'string');
  assert.deepEqual(open.examples, ['auto']);
});

test('type strings: object literals and named typedefs resolve; unknown names stay unconstrained', () => {
  const typedefs = parseTypedefs(`
    /** @typedef {'ascending' | 'descending'} SortDirection */
    /** @typedef {{ key: string, direction: SortDirection, extra?: number }} TableSortDetail */
    /** @typedef {import('./x.js').Other} Other */
  `);

  assert.deepEqual(typeSchema('SortDirection', typedefs).enum, ['ascending', 'descending']);
  const detail = typeSchema('TableSortDetail', typedefs);
  assert.equal(detail.type, 'object');
  assert.deepEqual(detail.required, ['key', 'direction']);
  assert.deepEqual(detail.properties.direction.enum, ['ascending', 'descending']);
  assert.equal(detail.properties.extra.type, 'number');
  assert.deepEqual(typeSchema('ElementInternals', typedefs), { 'x-focsd-type': 'ElementInternals' });
  assert.deepEqual(typeSchema('', typedefs), {});
  assert.equal(typedefs.has('Other'), false);
});

test('every custom element in the manifests has a contract and a schema', () => {
  assert.ok(cemTags.length > 100, `${cemTags.length} tags`);
  assert.deepEqual([...outputs.contracts.keys()].toSorted(), cemTags);
  assert.deepEqual([...outputs.schemas.keys()].toSorted(), cemTags);
});

test('contracts carry every section an agent needs', () => {
  const md = outputs.contracts.get('focsd-select');

  for (const heading of [
    '# Select (`<focsd-select>`)',
    '## Usage',
    '## Attributes and properties',
    '## Events',
    '## Slots',
    '## CSS parts',
    '## CSS custom properties',
    '## Accessibility',
    "## Do and don't",
  ]) {
    assert.ok(md.includes(heading), `focsd-select contract has ${heading}`);
  }

  assert.match(md, /## Usage\n\n```html\n[^`]*<focsd-select /);
  assert.match(outputs.contracts.get('focsd-copy-button'), /`focsd-copy`[^\n]*`CopyDetail`[^\n]*text: string/);
});

test('every schema compiles under JSON Schema 2020-12', () => {
  const validator = ajv();

  for (const [tag, schema] of outputs.schemas) {
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', tag);
    assert.doesNotThrow(() => validator.compile(schema), tag);
  }
});

test('a schema validates a good attribute set and rejects a bad enum value', () => {
  const validate = ajv().compile(outputs.schemas.get('focsd-button'));

  assert.equal(validate({ variant: 'action', type: 'submit', disabled: true }), true, JSON.stringify(validate.errors));
  assert.equal(validate({ variant: 'loud' }), false);
  assert.equal(validate.errors?.[0]?.keyword, 'enum');
  assert.equal(validate({ disabled: 'yes' }), false);
});

test('schemas list events, slots, parts and CSS properties under x-focsd keywords', () => {
  const schema = outputs.schemas.get('focsd-copy-button');
  const copy = schema['x-focsd-events'].find((e) => e.name === 'focsd-copy');

  assert.equal(copy.type, 'CustomEvent<CopyDetail>');
  assert.deepEqual(copy.detail.properties.text, { type: 'string' });
  assert.ok(Array.isArray(schema['x-focsd-slots']));
  assert.ok(Array.isArray(schema['x-focsd-parts']));
  assert.ok(outputs.schemas.get('focsd-button')['x-focsd-css-properties'].some((p) => p.name.startsWith('--focsd-button-')));
});

test('DTCG token files: every leaf has $value and $type, one file per theme plus an index', () => {
  const { themes, index } = outputs.tokens;

  assert.deepEqual(Object.keys(themes), ['light', 'dark', 'contrast']);

  for (const [theme, file] of Object.entries(themes)) {
    const leaves = Object.entries(file).filter(([key]) => !key.startsWith('$'));
    assert.ok(leaves.length > 50, theme);

    for (const [name, leaf] of leaves) {
      assert.ok('$value' in leaf && DTCG_TYPES.has(leaf.$type), `${theme} ${name}`);
    }
  }

  assert.equal(themes.light['space-4'].$type, 'dimension');
  assert.deepEqual(themes.light['space-4'].$value, { value: 16, unit: 'px' });
  assert.equal(themes.light.ink.$type, 'color');
  assert.equal(themes.light.ink.$value.colorSpace, 'oklch');
  assert.deepEqual(themes.light['ease-enter'].$value, [0.2, 0.7, 0.2, 1]);
  assert.deepEqual(
    index.themes.map((t) => t.url),
    ['/schema/tokens/light.json', '/schema/tokens/dark.json', '/schema/tokens/contrast.json'],
  );
});

test('drift: the committed fingerprints match the generated files', () => {
  const lock = JSON.parse(readFileSync(new URL('../../../scripts/agent/contracts.lock.json', import.meta.url), 'utf8'));

  assert.deepEqual(staleEntries(lock, fingerprints(outputs)), [], 'Agent contracts are stale: run `node scripts/agent/build.mjs --write`.');
});

test('drift: a manifest change without regenerating is caught', () => {
  const changed = structuredClone(inputs);
  const button = changed.components.find((c) => c.tag === 'focsd-button');
  button.attributes = [...button.attributes, { name: 'size', type: "'s' | 'l'", description: 'New.' }];
  const stale = staleEntries(fingerprints(outputs), fingerprints(agentOutputs(changed)));

  assert.deepEqual(stale, ['components/focsd-button.md', 'schema/components/focsd-button.json']);
});

test('production serves contracts as Markdown and schemas as JSON', () => {
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');

  assert.match(headers, /\/AGENTS\.md\n {2}Content-Type: text\/markdown; charset=utf-8/);
  assert.match(headers, /\/components\/\*\.md\n {2}Content-Type: text\/markdown; charset=utf-8/);
  assert.match(headers, /\/schema\/components\/\*\n {2}Content-Type: application\/schema\+json/);
  assert.match(headers, /\/schema\/tokens\/\*\n {2}Content-Type: application\/json/);
});
