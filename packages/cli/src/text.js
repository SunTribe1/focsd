/** Line endings: compare and hash files as LF, write them back in the line endings they had. */
/** @param {string} text */
export const toLf = (text) => text.replaceAll('\r\n', '\n');

/** @param {string | null} text */
export const eolOf = (text) => (text?.includes('\r\n') ? '\r\n' : '\n');

/**
 * @param {string} text
 * @param {string} eol
 */
export const withEol = (text, eol) => (eol === '\r\n' ? toLf(text).replaceAll('\n', '\r\n') : toLf(text));

/**
 * -1, 0 or 1 comparing two x.y.z versions (pre-release tags ignored).
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
export function compareVersions(a, b) {
  /** @param {string} v */
  const parts = (v) =>
    String(v ?? '0.0.0')
      .replace(/-.*$/s, '')
      .split('.')
      .map((n) => Number.parseInt(n, 10) || 0);

  const [x, y] = [parts(a), parts(b)];

  // A missing part counts as 0 (`1.2` is `1.2.0`).
  for (let i = 0; i < 3; i += 1) {
    const [p, q] = [x[i] ?? 0, y[i] ?? 0];

    if (p !== q) return p < q ? -1 : 1;
  }

  return 0;
}
