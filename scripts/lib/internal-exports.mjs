/**
 * Package exports must not open `./internal/*`: internals stay private, and apps get curated
 * entries instead.
 */

/**
 * Named exceptions, by package. Each needs a reason and an owner. None today: quality B10 folded
 * `@focsd-dev/primitives` `./internal/style.js` and `./internal/warn.js` into the curated
 * `@focsd-dev/primitives/internal` entry (a single subpath, not `./internal/*`).
 * @type {Record<string, string[]>}
 */
const ALLOWED = {};

/**
 * @param {{ name: string, exports?: Record<string, unknown> | string }} pkg
 * @returns {string[]}
 */
export function internalExportProblems(pkg) {
  // A string `exports` (one entry, no subpaths) has no keys that start with ./internal/.
  const subpaths = Object.keys(pkg.exports ?? {});

  return subpaths
    .filter((path) => path.startsWith('./internal/') && !(ALLOWED[pkg.name] ?? []).includes(path))
    .map((path) => `${pkg.name} exports "${path}": internals stay private (curate a public entry instead)`);
}
