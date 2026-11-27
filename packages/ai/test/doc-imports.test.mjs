// Every `@focsd-dev/...` import path written in the chat guide, the docs examples and the README must
// resolve against the named package's `exports` (as Node and bundlers resolve it), to a file that
// exists. A path such as `@focsd-dev/ai/src/composer.js` fails with ERR_PACKAGE_PATH_NOT_EXPORTED.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const DOCS = [
  'packages/ai/README.md',
  'apps/docs/src/content/docs/guides/chat-ui.mdx',
  'apps/docs/src/data/guides/chat-ui.js',
  'apps/docs/src/data/examples/ai.js',
];

/** Workspace packages by name: their folder and package.json. */
const PACKAGES = new Map(
  readdirSync(join(ROOT, 'packages')).flatMap((dir) => {
    const file = join(ROOT, 'packages', dir, 'package.json');

    if (!existsSync(file)) return [];

    const pkg = JSON.parse(readFileSync(file, 'utf8'));

    return [[pkg.name, { dir: join(ROOT, 'packages', dir), exports: pkg.exports }]];
  }),
);

/** The target of an export entry for the first condition it has (a string entry is its own target). */
function target(/** @type {any} */ entry) {
  const isPath = (/** @type {unknown} */ v) => v === `${v}`;

  if (isPath(entry)) return entry;

  const condition = ['development', 'default', 'import', 'types'].find((c) => isPath(entry?.[c]));

  return condition ? entry[condition] : null;
}

/**
 * The target of the first one-`*` pattern in `exports` that matches `key`, or null.
 * @param {Record<string, unknown>} exports
 * @param {string} key
 */
function patternTarget(exports, key) {
  for (const [pattern, entry] of Object.entries(exports)) {
    const [head = '', tail, extra] = pattern.split('*');

    const fits =
      tail !== undefined && extra === undefined && key.startsWith(head) && key.endsWith(tail) && key.length >= head.length + tail.length;

    if (fits) return target(entry)?.replace('*', key.slice(head.length, key.length - tail.length)) ?? null;
  }

  return null;
}

/**
 * The file an `@focsd-dev/...` specifier resolves to through `exports` (exact keys, then one-`*`
 * patterns, as Node matches them), or null.
 * @param {string} specifier
 */
export function resolveExport(specifier) {
  const [, name = '', rest = ''] = /^(@focsd-dev\/[^/]+)(\/.*)?$/.exec(specifier) ?? [];
  const pkg = PACKAGES.get(name);

  if (!pkg?.exports) return null;

  const key = `.${rest}`;
  const file = target(pkg.exports[key]) ?? patternTarget(pkg.exports, key);

  return file && existsSync(join(pkg.dir, file)) ? join(pkg.dir, file) : null;
}

/** Each `@focsd-dev/...` path a document names (in code or prose), without trailing punctuation. */
function specifiersIn(/** @type {string} */ text) {
  return [...new Set([...text.matchAll(/@focsd-dev\/[a-z-]+(?:\/[\w./-]*)?/g)].map(([s]) => s.replace(/[./]+$/, '')))];
}

const CASES = DOCS.flatMap((doc) => specifiersIn(readFileSync(join(ROOT, doc), 'utf8')).map((s) => /** @type {const} */ ([doc, s])));

it('finds the per-element path the guide documents', () => {
  expect(CASES.map(([, s]) => s)).toContain('@focsd-dev/ai/composer.js');
});

it.each(CASES)('%s: %s resolves through exports', (_doc, specifier) => {
  expect(resolveExport(specifier)).not.toBeNull();
});

it.each([
  ['@focsd-dev/ai/src/composer.js', false],
  ['@focsd-dev/ai/nope.js', false],
  ['@focsd-dev/ai/chat-thread.js', true],
  ['@focsd-dev/ai', true],
])('the resolver itself: %s resolves is %s', (specifier, ok) => {
  expect(resolveExport(specifier) !== null).toBe(ok);
});
