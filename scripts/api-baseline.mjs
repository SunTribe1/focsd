/**
 * Writes the API baseline that `scripts/checks/api-compat.mjs` compares against:
 * `api/<package dir>.cem.json` holds `{ name, version, manifest, exports, aliases }`: the package's
 * `custom-elements.json` as published, the names each typed entry point exports and its type aliases. It runs right after `changeset publish` (see the root
 * `release:publish` script) and writes only the packages whose `name@version` git tag exists,
 * because `changeset publish` tags exactly what it published; when nothing was published it writes
 * nothing. Commit the `api/` folder afterwards.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { typedApi } from './lib/dts-api.mjs';
import { readJson } from './lib/read.mjs';

/**
 * Whether `name@version` is tagged in the repository at `root`.
 * @param {string} root
 * @returns {(name: string, version: string) => boolean}
 */
export const gitTagged = (root) => (name, version) =>
  execFileSync('git', ['tag', '--list', `${name}@${version}`], { cwd: root, encoding: 'utf8' }).trim() !== '';

/**
 * @param {string} root Repository root.
 * @param {(name: string, version: string) => boolean} isPublished
 * @returns {string[]} The files written, relative to `root`.
 */
export function writeBaseline(root, isPublished) {
  const out = join(root, 'api');

  return readdirSync(join(root, 'packages')).flatMap((dir) => {
    const manifest = join(root, 'packages', dir, 'custom-elements.json');

    if (!existsSync(manifest)) return [];
    const pkg = readJson(join(root, 'packages', dir, 'package.json'));
    const { name, version } = pkg;

    if (!isPublished(name, version)) return [];
    mkdirSync(out, { recursive: true });
    const record = { name, version, manifest: readJson(manifest), ...typedApi(join(root, 'packages', dir), pkg) };

    writeFileSync(join(out, `${dir}.cem.json`), `${JSON.stringify(record, null, 2)}\n`);

    return [`api/${dir}.cem.json`];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const written = writeBaseline(root, gitTagged(root));

  console.log(
    written.length
      ? `api-baseline: wrote ${written.join(', ')}. Commit the api/ folder.`
      : 'api-baseline: nothing was published, so the baseline is unchanged.',
  );
}
