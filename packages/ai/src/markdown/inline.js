// cspell:words avascript -- the tail of an entity-encoded "javascript:" in the examples
// Inline markdown: emphasis, strong, code spans, links and hard breaks. Every search for a closing
// delimiter goes through a per-call cache, so pathological input (thousands of unclosed `*`, `[`
// or backticks) stays linear instead of quadratic, and nesting is capped so it cannot overflow
// the stack.

/**
 * @typedef {{ type: 'text', text: string }
 *   | { type: 'em' | 'strong', children: Inline[] }
 *   | { type: 'inlineCode', text: string }
 *   | { type: 'link', href: string, children: Inline[] }
 *   | { type: 'br' }} Inline
 */

/** Deeper inline nesting than this is kept as text. */
const MAX_DEPTH = 6;

/** Characters that may start inline syntax; everything else is copied as text in one slice. */
const SPECIAL = /[\\`*_[]|!\[| {2}\n/g;

const PUNCTUATION = /[!-/:-@[-`{-~]/;
const WORD = /[\p{L}\p{N}]/u;
const SPACE = /\s/;

/**
 * Finds the next position of a key at or after `from`, remembering the last answer per key: the
 * set of valid positions does not depend on where the search starts, so a later search that
 * starts inside an earlier searched range has the same answer.
 * @param {string} src
 */
function finder(src) {
  /** @type {Map<string, { from: number, at: number }>} */
  const cache = new Map();

  /**
   * @param {string} key
   * @param {number} from
   * @param {(at: number) => boolean} [valid]
   */
  return (key, from, valid) => {
    const hit = cache.get(key + (valid ? '\0' : ''));

    if (hit && from >= hit.from && (hit.at < 0 || from <= hit.at)) return hit.at;

    let at = src.indexOf(key, from);

    while (at >= 0 && valid && !valid(at)) at = src.indexOf(key, at + 1);
    cache.set(key + (valid ? '\0' : ''), { from, at });

    return at;
  };
}

/** The run of `ch` starting at `at`. */
function runLength(/** @type {string} */ src, /** @type {number} */ at, /** @type {string} */ ch) {
  let end = at;

  while (src[end] === ch) end++;

  return end - at;
}

/**
 * Scan state. Text is never copied piece by piece: `pos` marks where pending literal text starts,
 * and it is sliced from the source once, when a node or the end follows (a run of unclosed
 * delimiters stays one slice instead of thousands of small strings).
 * @param {string} src
 * @param {number} depth
 * @param {boolean} inLink
 */
function scanner(src, depth, inLink) {
  /** @type {Inline[]} */
  const out = [];

  return {
    src,
    depth,
    inLink,
    find: finder(src),
    out,
    pos: 0,
    /**
     * Ends pending text at `at` (dropping its trailing spaces when `trim`), adds `node`, and
     * starts pending text again at `next`, which is returned.
     * @param {number} at
     * @param {Inline | null} node
     * @param {number} next
     */
    emit(at, node, next, trim = false) {
      const text = src.slice(this.pos, at);
      const value = trim ? text.trimEnd() : text;

      if (value) out.push({ type: 'text', text: value });

      if (node) out.push(node);
      this.pos = next;

      return next;
    },
  };
}

/** @typedef {ReturnType<typeof scanner>} Scan */

/**
 * Parses inline markdown into nodes.
 * @param {string} src
 * @param {number} [depth]
 * @param {boolean} [inLink]
 * @returns {Inline[]}
 */
export function parseInline(src, depth = 0, inLink = false) {
  const s = scanner(src, depth, inLink);
  const re = new RegExp(SPECIAL.source, 'g');

  // Deeper nesting than the cap stays text.
  if (depth >= MAX_DEPTH) re.lastIndex = src.length;

  for (let m = re.exec(src); m; m = re.exec(src)) re.lastIndex = step(s, m.index);

  s.emit(src.length, null, src.length);

  return s.out;
}

/**
 * Handles the syntax at `at` and returns where scanning resumes. Syntax that does not apply is
 * left in the pending text.
 * @param {Scan} s
 * @param {number} at
 */
function step(s, at) {
  const ch = s.src[at];

  if (ch === '\\') return escape(s, at);

  if (ch === '`') return code(s, at);

  if (ch === '*' || ch === '_') return emphasis(s, at, ch);

  if (ch === '[') return link(s, at);

  if (ch === '!') return at + 2;

  // Two or more spaces before a newline: a hard break (the spaces before it are dropped).
  return s.emit(at, { type: 'br' }, at + 3, true);
}

/** @param {Scan} s @param {number} at */
function escape(s, at) {
  const next = s.src[at + 1] ?? '';

  if (next === '\n') return s.emit(at, { type: 'br' }, at + 2);

  if (!PUNCTUATION.test(next)) return at + 1;

  // The escaped character starts the next pending text.
  return s.emit(at, null, at + 1) + 1;
}

/** @param {Scan} s @param {number} at */
function code(s, at) {
  const n = runLength(s.src, at, '`');
  const end = s.find('`'.repeat(n), at + n, (i) => s.src[i - 1] !== '`' && s.src[i + n] !== '`');

  if (end < 0) return at + n;

  const inner = s.src.slice(at + n, end).replaceAll('\n', ' ');
  // One leading and trailing space is padding when both are present (`` ` a ` ``).
  const text = inner.length > 2 && inner.startsWith(' ') && inner.endsWith(' ') ? inner.slice(1, -1) : inner;

  return s.emit(at, { type: 'inlineCode', text }, end + n);
}

/**
 * A closing delimiter: not after whitespace, not inside a longer run, and for `_` not inside a word.
 * @param {string} src
 * @param {string} delim
 */
const closes = (src, delim) => (/** @type {number} */ i) => {
  const ch = delim[0];

  return (
    !SPACE.test(src[i - 1] ?? ' ') &&
    src[i - 1] !== ch &&
    src[i + delim.length] !== ch &&
    !(ch === '_' && WORD.test(src[i + delim.length] ?? ''))
  );
};

/** @param {Scan} s @param {number} at @param {string} ch */
function emphasis(s, at, ch) {
  const run = runLength(s.src, at, ch);
  const n = Math.min(run, 2);
  const delim = ch.repeat(n);
  const after = s.src[at + n] ?? ' ';
  const opens = run <= 2 && !SPACE.test(after) && !(ch === '_' && WORD.test(s.src[at - 1] ?? ''));
  const end = opens ? s.find(delim, at + n + 1, closes(s.src, delim)) : -1;

  if (end < 0) return at + run;

  const children = parseInline(s.src.slice(at + n, end), s.depth + 1, s.inLink);

  return s.emit(at, { type: n === 2 ? 'strong' : 'em', children }, end + n);
}

/** @param {Scan} s @param {number} at */
function link(s, at) {
  const mid = s.inLink ? -1 : s.find('](', at + 1);
  const end = mid < 0 ? -1 : s.find(')', mid + 2);

  if (end < 0) return at + 1;

  const target =
    s.src
      .slice(mid + 2, end)
      .trim()
      .split(/\s+/)[0] ?? '';

  const href = safeHref(target);

  // An unsafe or empty target: the whole source stays visible as text (R2).
  if (href === null) return end + 1;

  return s.emit(at, { type: 'link', href, children: parseInline(s.src.slice(at + 1, mid), s.depth + 1, true) }, end + 1);
}

/** Tab and newlines, which browsers drop anywhere inside a URL. */
const INSIDE = /[\t\n\r]/g;
const SAFE = /^(?:https?:|mailto:|\/(?![/\\])|#)/i;

/**
 * Drops the C0 controls and spaces that browsers strip around a URL.
 * @param {string} url
 */
function trimControls(url) {
  let start = 0;
  let end = url.length;

  while (start < end && (url.codePointAt(start) ?? 0) <= 0x20) start++;

  while (end > start && (url.codePointAt(end - 1) ?? 0) <= 0x20) end--;

  return url.slice(start, end);
}

/**
 * The URL a link may point to, or null when it is not safe (R2): only `https:`, `http:`,
 * `mailto:`, root-relative `/…` and fragment `#…` URLs pass. `javascript:`, `data:`, `vbscript:`,
 * protocol-relative `//…` (and `/\…`) and anything else are refused. Entities are never decoded,
 * so `&#106;avascript:` is refused too (it is not one of the allowed shapes).
 * @param {string} url
 * @returns {string | null}
 */
export function safeHref(url) {
  const clean = trimControls(String(url)).replaceAll(INSIDE, '');

  return SAFE.test(clean) ? clean : null;
}
