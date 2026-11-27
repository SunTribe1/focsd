/** Control characters, whitespace and invisible format characters: a browser drops or ignores them inside a URL scheme. */
// eslint-disable-next-line no-control-regex -- control characters are the point
const NOISE = /[\u0000-\u0020\u007F-\u009F\u00AD\u200B-\u200F\u2028\u2029\u2060\uFEFF]/g;

/** Schemes an app-provided link may use. */
const SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/**
 * The URL when it is safe to put in an `<a href>` that comes from data: `http:`, `https:`, `mailto:`,
 * and relative or fragment URLs. Everything else (`javascript:`, `data:`, `vbscript:`, any other
 * scheme, protocol-relative `//host`, backslash tricks, character references in the scheme) gives null.
 * Whitespace, control characters and case do not hide a scheme. Character references are never decoded.
 * @param {unknown} url
 * @returns {string | null} The URL as text, or null.
 */
export function safeHref(url) {
  const text = String(url ?? '');
  const flat = text.replaceAll(NOISE, '');

  if (!flat || flat.startsWith('//') || flat.startsWith('/\\') || flat.startsWith('\\')) return null;
  const head = flat.split(/[/?#]/, 1)[0] ?? '';

  if (head.includes('&')) return null;
  const colon = head.indexOf(':');

  if (colon === -1) return text;

  return SCHEMES.has(head.slice(0, colon + 1).toLowerCase()) ? text : null;
}
