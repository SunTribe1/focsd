// Marginal size budgets (gzip) of the input elements, measured as in packages/components:
// gzip(all three) − gzip(all three with this module emptied). Lit, the primitives, the terms and
// the `ai-input` icon paths (input-icons.js, used by the composer and the tile) are shared, so no
// marginal counts them; the package total is 17d's (spec wave 17, ≤ 34 KB).
import { expect, it } from 'vitest';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const src = fileURLToPath(new URL('../src/', import.meta.url));

/** Budgets from the spec's Components table (bytes, gzip, marginal). */
const BUDGETS = {
  'composer.js': 3.5 * KB, // 17c: measured 1919 B
  'attachment-tile.js': KB, // 17c: measured 595 B (with its use in the composer)
  'prompt-suggestions.js': KB, // 17c: measured 226 B
};

const entry = Object.keys(BUDGETS)
  .map((f) => `import './${f}';`)
  .join('\n');

/** Replaces one source module with an empty one, so any module that imports it drops it too. */
const withoutModule = (/** @type {string} */ file) => ({
  name: 'without-module',
  setup(/** @type {import('esbuild').PluginBuild} */ b) {
    b.onResolve({ filter: /\.js$/ }, (args) =>
      path.resolve(args.resolveDir, args.path) === path.join(src, file) ? { path: args.path, namespace: 'empty' } : null,
    );
    b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '', loader: 'js' }));
  },
});

async function gzipOf(/** @type {string | undefined} */ excluded) {
  const result = await build({
    stdin: { contents: entry, resolveDir: src, loader: 'js' },
    bundle: true,
    minify: true,
    write: false,
    format: 'esm',
    logLevel: 'silent',
    // package.json lists only the entry under sideEffects until 17d wires the elements; without
    // this, the element modules (which define themselves) would be tree-shaken away.
    ignoreAnnotations: true,
    plugins: excluded ? [withoutModule(excluded)] : [],
  });

  return gzipSync(result.outputFiles[0].contents).length;
}

it.each(Object.entries(BUDGETS))('%s adds at most %d B gzip', async (file, budget) => {
  const marginal = (await gzipOf(undefined)) - (await gzipOf(file));

  expect(marginal).toBeGreaterThan(0);
  expect(marginal).toBeLessThanOrEqual(budget);
});
