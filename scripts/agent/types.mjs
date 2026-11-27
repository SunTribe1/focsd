/**
 * TypeScript-style type strings from the custom elements manifest (and JSDoc typedefs) as JSON
 * Schema 2020-12 fragments. Pure: no file access.
 *
 * - String-literal unions become `enum`; `undefined` drops out (it means "optional").
 * - `string`, `number`, `boolean`, `null`, arrays, `Record<K, V>` and `{ a: T }` map to JSON types.
 * - An open union like `'auto' | (string & {})` is a string with the literals as `examples`.
 * - A name found in the typedefs resolves; any other name (`ElementInternals`) stays unconstrained.
 * The top-level fragment keeps the original text under `x-focsd-type`.
 */

/** @typedef {Record<string, unknown>} Schema */

const PRIMITIVES = new Set(['string', 'number', 'boolean', 'null']);
const ANY = new Set(['unknown', 'any', 'object']);
const OPEN = { open: true };
const MAX_DEPTH = 6;
const LITERAL = /^'([^']*)'$|^"([^"]*)"$/;
const ARRAY = /^(.+)\[\]$/;
const GENERIC = /^(\w+)<(.+)>$/;
const OBJECT = /^\{(.*)\}$/s;
const TYPEDEF = /@typedef \{(.+?)\} (\w+)\s*(?:\*\/|$)/gm;

/**
 * Split at a separator outside brackets, quotes and parentheses.
 * @param {string} text
 * @param {string} separator
 */
export function splitTop(text, separator) {
  const parts = [];
  let depth = 0;
  let quote = '';
  let start = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (quote) {
      if (ch === quote) quote = '';
    } else if (ch === "'" || ch === '"') quote = ch;
    else if ('([{<'.includes(ch)) depth += 1;
    else if (')]}>'.includes(ch)) depth -= 1;
    else if (ch === separator && depth === 0) {
      parts.push(text.slice(start, i).trim());
      start = i + 1;
    }
  }

  parts.push(text.slice(start).trim());

  return parts.filter(Boolean);
}

/**
 * JSDoc typedefs in a source text: `@typedef {T} Name` on one line, imports left out.
 * @param {string} source
 * @returns {Map<string, string>}
 */
export function parseTypedefs(source) {
  const out = new Map();

  for (const [, text, name] of source.matchAll(TYPEDEF)) if (!text.includes('import(')) out.set(name, text.trim());

  return out;
}

/**
 * `{ a: string, b?: number, [key: string]: string }` as an object schema.
 * @param {string} body
 * @param {(text: string) => Schema} map
 * @returns {Schema}
 */
function objectSchema(body, map) {
  /** @type {Record<string, Schema>} */
  const properties = {};
  const required = [];
  /** @type {Schema} */
  const out = { type: 'object' };

  for (const member of splitTop(body, ',').flatMap((m) => splitTop(m, ';'))) {
    const colon = member.indexOf(':', member.startsWith('[') ? member.indexOf(']') : 0);
    const key = member.slice(0, colon).trim();
    const value = map(member.slice(colon + 1).trim());

    if (key.startsWith('[')) out.additionalProperties = value;
    else if (key.endsWith('?')) properties[key.slice(0, -1)] = value;
    else {
      properties[key] = value;
      required.push(key);
    }
  }

  if (Object.keys(properties).length) out.properties = properties;

  if (required.length) out.required = required;

  return out;
}

/**
 * A literal or keyword type (`'a'`, `undefined`, `string`, `unknown`, `(string & {})`), or
 * `undefined` when the text is something else.
 * @param {string} text
 * @returns {Schema | typeof OPEN | null | undefined}
 */
function keyword(text) {
  const literal = LITERAL.exec(text);

  if (literal) return { const: literal[1] ?? literal[2] };

  if (text === 'undefined') return null;

  if (text === '(string & {})') return OPEN;

  if (PRIMITIVES.has(text)) return { type: text };

  if (ANY.has(text)) return text === 'object' ? { type: 'object' } : {};

  return undefined;
}

/**
 * One member of a union (no top-level `|`).
 * @param {string} text
 * @param {Map<string, string>} typedefs
 * @param {number} depth
 * @returns {Schema | typeof OPEN | null}
 */
function single(text, typedefs, depth) {
  const map = (/** @type {string} */ t) => typeSchema(t, typedefs, depth + 1);
  const simple = keyword(text);

  if (simple !== undefined) return simple;

  if (/^\(.*\)$/.test(text)) return map(text.slice(1, -1));

  const array = ARRAY.exec(text);

  if (array) return { type: 'array', items: map(array[1]) };

  const generic = GENERIC.exec(text);

  if (generic?.[1] === 'Record') return { type: 'object', additionalProperties: map(splitTop(generic[2], ',')[1] ?? 'unknown') };

  if (generic?.[1] === 'Array') return { type: 'array', items: map(generic[2]) };

  const object = OBJECT.exec(text);

  if (object) return objectSchema(object[1], map);

  const named = typedefs.get(text);

  return named && depth < MAX_DEPTH ? map(named) : {};
}

/**
 * Merge union members: all constants → `enum`; constants plus an open string → string + examples;
 * plain primitive types → `type` (a list when several); anything richer → `anyOf`.
 * @param {(Schema | typeof OPEN)[]} members
 * @returns {Schema}
 */
function union(members) {
  const consts = members.filter((m) => 'const' in m).map((m) => m.const);
  const open = members.includes(OPEN);
  const rest = /** @type {Schema[]} */ (members.filter((m) => m !== OPEN && !('const' in m)));
  const types = rest.filter((m) => Object.keys(m).length === 1 && PRIMITIVES.has(String(m.type))).map((m) => m.type);

  if (open) return { type: 'string', examples: consts };

  if (rest.length === 0) return { enum: consts };

  if (types.length === rest.length && consts.length === 0) return { type: types.length === 1 ? types[0] : types };

  if (consts.length && rest.length === 1 && rest[0].type === 'null') return { enum: [...consts, null] };

  if (rest.some((m) => Object.keys(m).length === 0)) return {};

  return { anyOf: [...(consts.length ? [{ enum: consts }] : []), ...rest] };
}

/**
 * A type string as a JSON Schema fragment.
 * @param {string | undefined} text
 * @param {Map<string, string>} [typedefs]
 * @param {number} [depth]
 * @returns {Schema}
 */
export function typeSchema(text, typedefs = new Map(), depth = 0) {
  const source = (text ?? '').trim();

  if (!source) return {};

  const members = splitTop(source, '|')
    .map((m) => single(m, typedefs, depth))
    .filter((m) => m !== null);

  const schema = members.length === 1 && members[0] !== OPEN ? /** @type {Schema} */ (members[0]) : union(members);
  const out = 'const' in schema ? { enum: [schema.const] } : schema;

  return depth === 0 ? { ...out, 'x-focsd-type': source } : out;
}
