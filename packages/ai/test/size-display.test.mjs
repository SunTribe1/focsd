// Marginal size budgets (gzip) of the display elements, measured as in packages/components:
// gzip(all seven) − gzip(all seven with this module emptied). Lit, the primitives, the terms and
// focsd-copy-button (used by the streaming text and the message actions) are shared, so no marginal
// counts them. The streaming text's budget includes the markdown renderer (spec: "4 KB incl.
// markdown"), so its row empties src/markdown/ as well. The package total is 17d's (≤ 34 KB).
import { expect, it } from 'vitest';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const src = fileURLToPath(new URL('../src/', import.meta.url));

/** Budgets from the spec's Components table (bytes, gzip, marginal), and the modules each row empties. */
const BUDGETS = {
  'chat-thread.js': { budget: 2.5 * KB, empties: ['chat-thread.js'] }, // 17b: measured 1056 B
  'chat-message.js': { budget: 2 * KB, empties: ['chat-message.js'] }, // 17b: measured 1190 B
  'streaming-text.js': { budget: 4 * KB, empties: ['streaming-text.js', 'markdown/'] }, // 17b: measured 3506 B
  'tool-call.js': { budget: 1.5 * KB, empties: ['tool-call.js'] }, // 17b: measured 682 B
  'reasoning.js': { budget: KB, empties: ['reasoning.js'] }, // 17b: measured 166 B
  'message-actions.js': { budget: 1.5 * KB, empties: ['message-actions.js'] }, // 17b: measured 1081 B
  'source-chip.js': { budget: 0.5 * KB, empties: ['source-chip.js'] }, // 17b: measured 296 B
};

const entry = Object.keys(BUDGETS)
  .map((f) => `import './${f}';`)
  .join('\n');

/**
 * Replaces source modules (a file, or every file under a folder ending in `/`) with empty ones,
 * so any module that imports them drops them too.
 * @param {string[]} files
 */
const without = (files) => ({
  name: 'without-modules',
  setup(/** @type {import('esbuild').PluginBuild} */ b) {
    const hit = (/** @type {string} */ p) =>
      files.some((f) => (f.endsWith('/') ? p.startsWith(path.join(src, f)) : p === path.join(src, f)));

    b.onResolve({ filter: /\.js$/ }, (args) =>
      hit(path.resolve(args.resolveDir, args.path)) ? { path: args.path, namespace: 'empty' } : null,
    );
    b.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '', loader: 'js' }));
  },
});

async function gzipOf(/** @type {string[]} */ excluded) {
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
    plugins: excluded.length ? [without(excluded)] : [],
  });

  return gzipSync(result.outputFiles[0].contents).length;
}

it.each(Object.entries(BUDGETS))('%s stays within its marginal budget', async (_file, { budget, empties }) => {
  const marginal = (await gzipOf([])) - (await gzipOf(empties));

  expect(marginal).toBeGreaterThan(0);
  expect(marginal).toBeLessThanOrEqual(budget);
});
