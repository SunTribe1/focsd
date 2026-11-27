/**
 * Every path the CLI writes or deletes stays inside the project. Paths come from focsd.json and
 * --dir, which a teammate (or an attacker) can edit, so they are checked before use: no absolute
 * paths, no `..` escapes, and no symlinks that lead out of the project.
 */
import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, posix, relative, resolve, sep, win32 } from 'node:path';
import { CliError } from './errors.js';

/**
 * A path in focsd.json or --dir, with forward slashes ("src\\ui" → "src/ui"), normalized.
 * @param {string} path
 */
export const toPosix = (path) => posix.normalize(path.replaceAll('\\', '/')).replace(/(.)\/$/, '$1');

/** @param {string} path */
const outside = (path) => new CliError(`"${path}" is outside the project; focsd only writes inside it.`);

/**
 * A relative path that cannot leave the folder it is joined to: not absolute (on any platform),
 * no `..` segment.
 * @param {string} path
 */
const isContainedPath = (path) =>
  path.length > 0 && !path.includes('\0') && !posix.isAbsolute(path) && !win32.isAbsolute(path) && !path.split(/[\\/]/).includes('..');

/**
 * `path`, or a CliError when it is not a contained relative path.
 * @param {string} path
 */
export function containedPath(path) {
  if (!isContainedPath(path)) throw outside(path);

  return path;
}

/**
 * @param {string} base
 * @param {string} path
 */
const within = (base, path) => {
  const rel = relative(base, path);

  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

/**
 * The real path of `path`'s deepest existing ancestor (itself included), or null when that is a
 * dangling symlink (writing through it could land anywhere).
 * @param {string} path
 * @returns {string | null}
 */
function realAncestor(path) {
  for (let probe = path; ; probe = dirname(probe)) {
    if (existsSync(probe)) return realpathSync(probe);

    try {
      lstatSync(probe);

      return null; // exists only as a link to nothing
    } catch {
      if (dirname(probe) === probe) return null;
    }
  }
}

/**
 * `root` joined with `parts`, guaranteed to stay inside `root`, symlinks included.
 * @param {string} root
 * @param {...string} parts
 */
export function inside(root, ...parts) {
  const base = resolve(root);
  const full = resolve(base, ...parts);
  const shown = posix.join(...parts.map((p) => p.replaceAll('\\', '/')));

  if (parts.some((p) => !isContainedPath(p)) || !within(base, full)) throw outside(shown);
  const real = realAncestor(full);

  if (real === null || !within(realpathSync(base), real)) throw outside(shown);

  return full;
}

/**
 * The repository root (the nearest folder with `.git`) from `start` upwards, or null.
 * @param {string} start
 * @returns {string | null}
 */
function repoRoot(start) {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;

    if (dirname(dir) === dir) return null;
  }
}

/**
 * The nearest folder, from `start` upwards, that holds `file`. `start` itself is always checked.
 * Above it, the search never reaches the home folder or anything above it (so `~/focsd.json` or a
 * planted `/tmp/focsd.json` is never picked up), and it stops at the repository root (a folder
 * with `.git`), so a parent repository's file is never used either. Outside a repository it only
 * climbs while inside the home folder. It does not stop at package.json, so it works from any
 * package of a monorepo.
 * @param {string} start
 * @param {string} file
 * @param {string} [home] the home folder (for tests)
 * @returns {string | null}
 */
export function findUp(start, file, home = homedir()) {
  const first = resolve(start);
  const top = resolve(home);
  const repo = repoRoot(first);
  /** @param {string} dir */
  const allowed = (dir) => !within(dir, top) && (repo !== null || within(top, dir));

  for (let dir = first; ; dir = dirname(dir)) {
    if (dir !== first && !allowed(dir)) return null;

    if (existsSync(join(dir, file))) return dir;

    if (dir === repo || dirname(dir) === dir) return null;
  }
}
