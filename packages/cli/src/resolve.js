/**
 * Names, modules and files: which component module defines a tag, which tags a module brings,
 * and which local files (relative imports) a module needs. Pure functions; reading files is the
 * caller's job.
 */
import { posix } from 'node:path';

/**
 * The parts of a custom-elements manifest the CLI reads.
 * @typedef {{ modules: { path: string, declarations?: { name?: string, tagName?: string }[] }[] }} Manifest
 * @typedef {{ tag: string, className: string, module: string }} ElementEntry
 */

/**
 * "Button", "focsd-button", "FocsdDatePicker" or "date-picker" → "focsd-date-picker".
 * @param {unknown} name
 */
export function normalizeName(name) {
  let n = String(name ?? '').trim();

  if (/^[A-Z]/.test(n) && /[a-z]/.test(n)) {
    n = n.replace(/^Focsd/, '').replaceAll(/[A-Z]/g, (c, i) => `${i ? '-' : ''}${c.toLowerCase()}`);
  }

  n = n.toLowerCase();

  return n.startsWith('focsd-') ? n : `focsd-${n}`;
}

/**
 * Every element declared in the manifest.
 * @param {Manifest} manifest
 * @returns {ElementEntry[]}
 */
export function elements(manifest) {
  return manifest.modules.flatMap((m) =>
    (m.declarations ?? [])
      .filter((d) => d.tagName && d.name)
      .map((d) => ({ tag: String(d.tagName), className: String(d.name), module: posix.basename(m.path) })),
  );
}

/**
 * The styled module file that defines `tag` (for example "focsd-select.js" for "focsd-option"), or null.
 * @param {string} tag
 * @param {Manifest} manifest
 */
export function moduleOf(tag, manifest) {
  return elements(manifest).find((e) => e.tag === tag)?.module ?? null;
}

/**
 * Tags defined by a module file.
 * @param {string} file
 * @param {Manifest} manifest
 */
export function tagsIn(file, manifest) {
  return elements(manifest)
    .filter((e) => e.module === file)
    .map((e) => e.tag);
}

const IMPORT = /(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?['"](\.{1,2}\/[^'"]+)['"]/g;

/**
 * Relative specifiers imported or re-exported by a source file.
 * @param {unknown} source
 */
const relativeImports = (source) => [...String(source ?? '').matchAll(IMPORT)].flatMap(([, spec]) => (spec ? [spec] : []));

/**
 * The file and every local file it imports, transitively: paths relative to the templates root,
 * starting file first, each once. Package imports (lit, @focsd-dev/primitives) stay dependencies.
 * @param {string} file
 * @param {(path: string) => string} readSource
 */
export function closure(file, readSource) {
  /** @type {string[]} */
  const seen = [];

  /** @param {string} path */
  const visit = (path) => {
    if (seen.includes(path)) return;
    seen.push(path);

    for (const spec of relativeImports(readSource(path))) visit(posix.normalize(posix.join(posix.dirname(path), spec)));
  };

  visit(posix.normalize(file));

  return seen;
}
