/**
 * One JSON Schema 2020-12 per element. The schema describes an element's attribute set (keys are
 * attribute names, values typed from the manifest); everything else an agent needs (JS-only
 * properties, methods, events with their detail schema, slots, parts and CSS custom properties)
 * sits under `x-focsd-*` keywords, which validators ignore once registered.
 */
import { typeSchema } from './types.mjs';

/** The annotation keywords the schemas use; register them with a strict validator. */
export const FOCSD_KEYWORDS = Object.freeze([
  'x-focsd-type',
  'x-focsd-property',
  'x-focsd-default',
  'x-focsd-tag',
  'x-focsd-import',
  'x-focsd-contract',
  'x-focsd-part-of',
  'x-focsd-properties',
  'x-focsd-methods',
  'x-focsd-events',
  'x-focsd-slots',
  'x-focsd-parts',
  'x-focsd-css-properties',
]);

const DRAFT = 'https://json-schema.org/draft/2020-12/schema';
const CUSTOM_EVENT = /^CustomEvent<(.+)>$/;

/** @param {string} tag */
export const schemaPath = (tag) => `/schema/components/${tag}.json`;

/** @param {string} tag */
export const contractPath = (tag) => `/components/${tag}.md`;

/**
 * A manifest default (JS source text such as `'plain'`, `false`, `null`) as JSON, when it is one.
 * @param {string | undefined} text
 * @returns {{ value: unknown } | null}
 */
export function parseDefault(text) {
  if (text === undefined || text === 'undefined') return null;
  const quoted = /^'([^'\\]*)'$/.exec(text);

  if (quoted) return { value: quoted[1] };

  try {
    return { value: JSON.parse(text) };
  } catch {
    return null;
  }
}

/**
 * @param {{ name: string, type: string, default?: string, description: string, property?: string }} attribute
 * @param {Map<string, string>} typedefs
 */
function attributeSchema(attribute, typedefs) {
  const parsed = parseDefault(attribute.default);
  /** @type {Record<string, unknown>} */
  const out = { ...typeSchema(attribute.type, typedefs), description: attribute.description };

  if (parsed) out.default = parsed.value;
  else if (attribute.default !== undefined && attribute.default !== 'undefined') out['x-focsd-default'] = attribute.default;

  if (attribute.property) out['x-focsd-property'] = attribute.property;

  return out;
}

/**
 * @typedef {{ name: string, description: string, type: string, detailType?: string, detailText?: string, detail?: Record<string, unknown> }} EventInfo
 */

/**
 * The event as the schema lists it: the detail's typedef text stays in the Markdown contract.
 * @param {EventInfo} event
 */
function schemaEvent({ name, description, type, detailType, detail }) {
  return detailType ? { name, description, type, detailType, detail } : { name, description, type };
}

/**
 * The element's events with the manifest's type and, for `CustomEvent<T>`, the detail schema.
 * @param {{ name: string, description: string }[]} events
 * @param {any} decl Manifest declaration.
 * @param {Map<string, string>} typedefs
 */
export function eventsOf(events, decl, typedefs) {
  const types = new Map((decl?.events ?? []).filter((e) => e.name).map((e) => [e.name, e.type?.text ?? 'Event']));

  return events.map(({ name, description }) => {
    const type = types.get(name) ?? 'Event';
    const detailType = CUSTOM_EVENT.exec(type)?.[1];
    /** @type {EventInfo} */
    const event = { name, description, type };

    if (detailType) {
      event.detailType = detailType;
      event.detailText = typedefs.get(detailType) ?? '';
      event.detail = typeSchema(detailType, typedefs);
    }

    return event;
  });
}

/**
 * @param {any} component MCP catalogue component.
 * @param {{ decl: any, typedefs: Map<string, string>, site: string }} context
 */
export function componentSchema(component, { decl, typedefs, site }) {
  const { tag } = component;
  /** @type {Record<string, unknown>} */
  const properties = {};

  for (const attribute of component.attributes) properties[attribute.name] = attributeSchema(attribute, typedefs);

  /** @type {Record<string, unknown>} */
  const schema = {
    $schema: DRAFT,
    $id: `${site}${schemaPath(tag)}`,
    title: `<${tag}>`,
    description: component.summary,
    $comment: 'Keys are attribute names. Global HTML attributes (id, class, slot, aria-*, data-*) are allowed too.',
    type: 'object',
    properties,
    'x-focsd-tag': tag,
    'x-focsd-import': component.import,
    'x-focsd-contract': `${site}${contractPath(tag)}`,
    'x-focsd-properties': component.properties.map((/** @type {any} */ p) => ({
      name: p.name,
      readonly: Boolean(p.readonly),
      description: p.description,
      schema: typeSchema(p.type, typedefs),
    })),
    'x-focsd-methods': component.methods,
    'x-focsd-events': eventsOf(component.events, decl, typedefs).map((event) => schemaEvent(event)),
    'x-focsd-slots': component.slots,
    'x-focsd-parts': component.cssParts,
    'x-focsd-css-properties': component.cssProperties ?? [],
  };

  if (component.partOf) schema['x-focsd-part-of'] = component.partOf;

  return schema;
}
