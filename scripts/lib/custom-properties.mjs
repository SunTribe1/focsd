/**
 * The custom property naming rule (docs/custom-properties.md, owner decision OD3):
 * - a design token from @focsd-dev/tokens: `--focsd-<token>` (`--focsd-ink`, `--focsd-space-3`);
 * - a public component knob: `--focsd-<tag>-<name>`, where `focsd-<tag>` is the element
 *   (`--focsd-button-background`, `--focsd-data-grid-max-block-size`);
 * - anything private (runtime geometry, values passed between rules): `--_<name>`.
 */

/** A Focsd-namespaced name in source text. A trailing `-` before `${` is a name built at runtime. */
const FOCSD_NAME = /--focsd-[a-z0-9]+(?:-[a-z0-9]+)*(?:-(?=\$\{))?/g;

/**
 * The element a knob is named after: the longest tag `t` with the name starting `--focsd-<t>-`
 * (`--focsd-tabs-gap` belongs to focsd-tabs, not focsd-tab).
 * @param {string} body the name without `--focsd-`
 * @param {string[]} tags
 * @returns {string | undefined}
 */
const ownerTag = (body, tags) =>
  tags
    .filter((tag) => body.startsWith(`${tag}-`))
    .reduce((/** @type {string | undefined} */ a, t) => (a && a.length >= t.length ? a : t), undefined);

/**
 * @param {string} name e.g. `--focsd-chart-1`, or `--focsd-chart-` for a runtime-built name
 * @param {{ tags: string[], tokens: string[], documented?: Record<string, string[]> }} known tags without
 *   `focsd-`; token names without `--focsd-`; with `documented` (each tag's `@cssprop` names), a fixed knob
 *   must be documented by the element it is named after, so a shorter tag's prefix no longer covers it
 */
export function isAllowedCustomProperty(name, { tags, tokens, documented }) {
  const body = name.replace(/^--focsd-/, '');

  if (body.endsWith('-')) {
    return tokens.some((t) => t.startsWith(body)) || tags.some((tag) => body.startsWith(`${tag}-`));
  }

  if (tokens.includes(body)) return true;

  const owner = ownerTag(body, tags);

  if (!owner) return false;

  return !documented || (documented[owner] ?? []).includes(name);
}

/**
 * Every `--focsd-*` name in the sources that is neither a token nor `--focsd-<tag>-*`.
 * @param {string[]} sources
 * @param {{ tags: string[], tokens: string[], documented?: Record<string, string[]> }} known
 * @returns {string[]}
 */
export function customPropertyViolations(sources, known) {
  const names = new Set(sources.flatMap((text) => text.match(FOCSD_NAME) ?? []));

  return [...names].filter((name) => !isAllowedCustomProperty(name, known)).toSorted();
}
