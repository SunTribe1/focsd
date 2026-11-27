// The size budgets measure what a page downloads up front: an entry bundled with esbuild (code
// splitting on), minified and gzipped, counting the entry chunk and the chunks it imports
// statically. Modules only reached through `import()` (the icon sanitizer, quality B11) load when
// first needed, so they stay out of the number.
import { resolve } from 'node:path';
import process from 'node:process';
import { gzipSync } from 'node:zlib';

/**
 * Gzip bytes loaded up front (`initial`) and loaded later through `import()` (`lazy`, all lazy chunks
 * together), so a test can cap both.
 * @param {typeof import('esbuild').build} build esbuild's `build` (each package brings its own esbuild)
 * @param {string} entry absolute path of the entry module
 * @param {import('esbuild').Plugin[]} [plugins]
 * @returns {Promise<{ initial: number, lazy: number }>}
 */
export async function gzipSizes(build, entry, plugins = []) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    splitting: true,
    format: 'esm',
    outdir: '/focsd-size',
    write: false,
    metafile: true,
    logLevel: 'silent',
    plugins,
  });

  const outputs = /** @type {import('esbuild').Metafile} */ (result.metafile).outputs;
  const byPath = new Map(result.outputFiles.map((f) => [f.path, f.contents]));
  const entryOut = Object.keys(outputs).find((p) => outputs[p].entryPoint);

  if (!entryOut) throw new Error(`no entry chunk for ${entry}`);

  /** @type {string[]} */
  const initial = [];

  const visit = (/** @type {string} */ out) => {
    if (initial.includes(out)) return;
    initial.push(out);

    for (const imported of outputs[out].imports) if (imported.kind === 'import-statement' && !imported.external) visit(imported.path);
  };

  visit(entryOut);

  // Metafile paths are relative to the working directory; output files carry absolute paths.
  const contentsOf = (/** @type {string} */ out) => {
    const contents = byPath.get(resolve(process.cwd(), out));

    if (!contents) throw new Error(`no output for ${out}`);

    return contents;
  };

  const lazy = Object.keys(outputs).filter((out) => out.endsWith('.js') && !initial.includes(out));
  const gzip = (/** @type {string[]} */ outs) => (outs.length ? gzipSync(Buffer.concat(outs.map(contentsOf))).length : 0);

  return { initial: gzip(initial), lazy: gzip(lazy) };
}

/**
 * Gzip bytes a page loads up front for `entry`.
 * @param {typeof import('esbuild').build} build
 * @param {string} entry
 * @param {import('esbuild').Plugin[]} [plugins]
 */
export const initialGzipSize = async (build, entry, plugins = []) => (await gzipSizes(build, entry, plugins)).initial;
