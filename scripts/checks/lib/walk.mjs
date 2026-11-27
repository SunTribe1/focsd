/** File discovery shared by the static guards. */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every file under `dir` whose name ends with one of `extensions`, skipping dependency and build folders.
 * @param {string} dir
 * @param {string[]} extensions For example `['.js']`.
 * @returns {string[]}
 */
export function walk(dir, extensions) {
  return readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === 'dist' || name === 'test') return [];
    const path = join(dir, name);

    if (statSync(path).isDirectory()) return walk(path, extensions);

    return extensions.some((extension) => name.endsWith(extension)) ? [path] : [];
  });
}
