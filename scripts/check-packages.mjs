/**
 * Packaging check before a release (`pnpm check:packages`): packs every publishable package the way
 * npm will see it, then runs publint (package.json and files) and Are the Types Wrong? (types resolve
 * for each JavaScript entry point under Node's ESM and bundler resolution). Run it after `pnpm build`.
 *
 * Focsd is ESM only, so attw uses its `esm-only` profile. CSS, JSON and wildcard exports are not
 * JavaScript modules, so attw is given the JavaScript entry points only.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { readJson } from './lib/read.mjs';

const root = new URL('../', import.meta.url);

/** @returns {{ dir: string, pkg: any }[]} */
function publishable() {
  return readdirSync(new URL('packages/', root))
    .map((name) => ({ dir: `packages/${name}`, file: new URL(`packages/${name}/package.json`, root) }))
    .filter(({ file }) => existsSync(file))
    .map(({ dir, file }) => ({ dir, pkg: readJson(file) }))
    .filter(({ pkg }) => !pkg.private);
}

/**
 * The export subpaths that load JavaScript, as attw names them (`.` and `./x`).
 * @param {any} pkg
 * @returns {string[]}
 */
export function javascriptEntrypoints(pkg) {
  const target = (/** @type {any} */ value) => (value?.constructor === String ? value : (value?.default ?? value?.import ?? ''));

  return Object.entries(pkg.exports ?? {})
    .filter(([subpath, value]) => !subpath.includes('*') && /\.m?js$/.test(target(value)))
    .map(([subpath]) => subpath);
}

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {string | null} The output when the command fails, otherwise null.
 */
function failure(command, args) {
  try {
    execFileSync(command, args, { cwd: root, stdio: 'pipe', encoding: 'utf8' });

    return null;
  } catch (error) {
    const { stdout = '', stderr = '' } = /** @type {{ stdout?: string, stderr?: string }} */ (error);

    return `${stdout}${stderr}`.trim();
  }
}

/** @param {{ dir: string, pkg: any }} entry */
function problems({ dir, pkg }) {
  const lint = failure('pnpm', ['exec', 'publint', '--strict', dir]);
  const entrypoints = javascriptEntrypoints(pkg);

  const types =
    pkg.types && entrypoints.length
      ? failure('pnpm', ['exec', 'attw', '--pack', dir, '--profile', 'esm-only', '--format', 'ascii', '--entrypoints', ...entrypoints])
      : null;

  return [lint && `publint ${pkg.name}:\n${lint}`, types && `attw ${pkg.name}:\n${types}`].filter(Boolean);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const packages = publishable();
  const found = packages.flatMap(problems);

  if (found.length) {
    console.error(found.join('\n\n'));
    process.exitCode = 1;
  } else {
    console.log(`✓ publint and attw pass for ${packages.length} packages`);
  }
}
