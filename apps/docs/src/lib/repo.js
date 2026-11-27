/**
 * Reads files from the monorepo the docs are built in. The root is found from this module's own
 * location (not the working directory), and still works after Astro bundles the module because the
 * build output stays inside the repo.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readText } from '../../../../scripts/lib/read.mjs';

/**
 * The nearest folder above `start` that holds pnpm-workspace.yaml.
 * @param {string} start
 * @returns {string}
 */
function findRoot(start) {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;

    if (dirname(dir) === dir) throw new Error(`No pnpm-workspace.yaml above ${start}`);
  }
}

const repoRoot = findRoot(dirname(fileURLToPath(import.meta.url)));

/** @param {string} path relative to the repo root */
export const repoPath = (path) => join(repoRoot, path);

/** @param {string} path relative to the repo root */
export const readRepoText = (path) => readText(repoPath(path));

/**
 * @param {string} path relative to the repo root
 * @returns {any}
 */
export const readRepoJson = (path) => readJson(repoPath(path));
