/** The Combining Diacritical Marks block: the accents NFD splits off Latin, Greek and Cyrillic letters. */
const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Text with nothing for NFD to split off: the fast path skips normalizing it. */
const ASCII = /^\p{ASCII}*$/u;

/**
 * Lower-case, accent-free text for matching: "Café" and "CAFE" both fold to "cafe". Only the
 * combining accents are removed, so ASCII `^` and `` ` `` and the marks other scripts need stay.
 * @param {unknown} text
 * @returns {string}
 */
export function fold(text) {
  const s = String(text ?? '');

  return (ASCII.test(s) ? s : s.normalize('NFD').replaceAll(COMBINING_MARKS, '')).toLocaleLowerCase();
}

/**
 * A test for one query, folded once: `(text) => true` when `text` contains the query, ignoring
 * case, accents and the query's surrounding white space ("e" finds "é"). An empty query matches
 * everything. Use it when filtering a list.
 * @param {unknown} query
 * @returns {(text: unknown) => boolean}
 */
export function queryMatcher(query) {
  const q = fold(query).trim();

  return (text) => !q || fold(text).includes(q);
}

/**
 * True when `text` contains `query`, ignoring case, accents and the query's surrounding white
 * space. For a whole list, prefer `queryMatcher`, which folds the query once.
 * @param {unknown} text
 * @param {unknown} query
 * @returns {boolean}
 */
export const matchesQuery = (text, query) => queryMatcher(query)(text);

/**
 * A host's label text: its own text, without anything slotted elsewhere (an icon in `slot="icon"`,
 * whose icon-font ligature such as "home" is text too). Whitespace is collapsed. Safe in server
 * rendering, where there are no child nodes.
 * @param {Node} host
 */
export const labelText = (host) =>
  [...(host.childNodes ?? [])]
    .flatMap((node) => (node instanceof Element && node.slot ? [] : [node.textContent ?? '']))
    .join('')
    .replaceAll(/\s+/g, ' ')
    .trim();
