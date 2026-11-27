/**
 * API documentation gates for the custom elements manifests (quality B10, findings Q8, Q9, Q11).
 * Each check lists what is missing today; the tests compare that list with a legacy allowlist that
 * only shrinks (B14 backfills it), so a new member, attribute or CSS knob must be documented.
 */

/**
 * @typedef {{ name: string, description?: string, type?: { text?: string }, default?: string,
 *   kind?: string, privacy?: string, static?: boolean, attribute?: string,
 *   inheritedFrom?: { name: string } }} Member
 * @typedef {{ name: string, tagName?: string, customElement?: boolean, description?: string,
 *   attributes?: Member[], members?: Member[], cssProperties?: { name: string }[] }} Declaration
 * @typedef {{ modules?: { declarations?: Declaration[] }[] }} Manifest
 */

/** Lifecycle and platform callbacks: documented by Lit and the HTML spec, not by Focsd. */
const PLATFORM = new Set([
  'attributeChangedCallback',
  'connectedCallback',
  'createRenderRoot',
  'disconnectedCallback',
  'firstUpdated',
  'formAssociatedCallback',
  'formDisabledCallback',
  'formResetCallback',
  'formStateRestoreCallback',
  'render',
  'shouldUpdate',
  'update',
  'updated',
  'willUpdate',
]);

/** @param {Manifest} manifest @returns {Declaration[]} */
export const customElements = (manifest) =>
  (manifest.modules ?? []).flatMap((m) => m.declarations ?? []).filter((d) => d.customElement && d.tagName);

/** The class that declares a member: the base it was inherited from, or the element itself. */
const origin = (/** @type {Declaration} */ decl, /** @type {Member} */ member) => member.inheritedFrom?.name ?? decl.name;

/** A member app code can use: public, per instance, not `_state` or `#private`. */
const isPublic = (/** @type {Member} */ m) =>
  !m.static && (m.privacy ?? 'public') === 'public' && !/^[_#]/.test(m.name) && !PLATFORM.has(m.name);

/** @param {string[]} keys */
const unique = (keys) => [...new Set(keys)].toSorted();

/**
 * Undocumented API (Q8): `<tag>` for an element with no description, `Class[attr]` for an
 * attribute, `Class.member` for a public property or method without an attribute.
 * @param {Manifest} manifest
 * @returns {string[]}
 */
export function apiDocGaps(manifest) {
  return unique(
    customElements(manifest).flatMap((decl) => [
      ...(decl.description ? [] : [`<${decl.tagName}>`]),
      ...(decl.attributes ?? []).filter((a) => !a.description).map((a) => `${origin(decl, a)}[${a.name}]`),
      ...(decl.members ?? []).filter((m) => isPublic(m) && !m.attribute && !m.description).map((m) => `${origin(decl, m)}.${m.name}`),
    ]),
  );
}

/** A default that reads as one value of a closed set: `'neutral'`, `'bottom-start'`. */
const KEYWORD_DEFAULT = /^(['"])[a-z][a-z0-9]*(?:-[a-z0-9]+)*\1$/;

/**
 * Enum-like properties typed as plain `string` (Q9): a keyword default with no union type, as
 * `Class.member`. Type them as a union (`@type {'neutral' | 'info'}`).
 * @param {Manifest} manifest
 * @returns {string[]}
 */
export function enumLikeStrings(manifest) {
  return unique(
    customElements(manifest).flatMap((decl) =>
      (decl.members ?? [])
        .filter((m) => m.kind === 'field' && isPublic(m) && m.type?.text === 'string' && KEYWORD_DEFAULT.test(m.default ?? ''))
        .map((m) => `${origin(decl, m)}.${m.name}`),
    ),
  );
}

/**
 * A literal `var(--focsd-…)` read, or a `--focsd-…:` declaration in the styles (a default the
 * element sets, such as `--focsd-chart-1`, even when it is read through a name built at runtime).
 * A runtime-built name itself (`--focsd-chart-${i}`) is not checked.
 */
const KNOB_USE = /(?:var\(\s*(--focsd-[a-z0-9]+(?:-[a-z0-9]+)*)(?![a-z0-9-]|\$)|(--focsd-[a-z0-9]+(?:-[a-z0-9]+)*)\s*:)/g;

/**
 * Component knobs used in the sources but not documented with `@cssprop` (Q11): every
 * `var(--focsd-<tag>-…)` read and `--focsd-<tag>-…:` declaration, where `<tag>` is an element of
 * this manifest.
 * @param {Manifest} manifest
 * @param {string[]} sources The text of every source file of the package.
 * @returns {string[]}
 */
export function undocumentedCssProperties(manifest, sources) {
  const elements = customElements(manifest);
  const tags = elements.map((d) => String(d.tagName).replace(/^focsd-/, ''));
  const documented = new Set(elements.flatMap((d) => (d.cssProperties ?? []).map((p) => p.name)));
  const isKnob = (/** @type {string} */ name) => tags.some((tag) => name.startsWith(`--focsd-${tag}-`));

  return unique(
    sources.flatMap((text) => [...text.matchAll(KNOB_USE)].map((m) => m[1] ?? m[2])).filter((n) => isKnob(n) && !documented.has(n)),
  );
}

/**
 * Compare found gaps with the legacy allowlist: what is new, and what is listed but already fixed.
 * @param {string[]} found
 * @param {string[]} legacy
 * @returns {{ added: string[], fixed: string[] }}
 */
export function againstLegacy(found, legacy) {
  const known = new Set(legacy);
  const now = new Set(found);

  return { added: found.filter((k) => !known.has(k)), fixed: legacy.filter((k) => !now.has(k)) };
}
