/**
 * `diff` and `update`: compare copied files with the delivered (pristine) copies and with this
 * CLI's version, and bring new versions in without losing local edits (three-way merges with
 * `git merge-file`; when that is not possible, the new version is written next to the file).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { closure, tagsIn } from './resolve.js';
import {
  CliError,
  addedModules,
  checkPaths,
  copyPath,
  entryOf,
  loadTemplates,
  newestVersion,
  pristinePath,
  requireState,
  settledVersion,
  sha256,
  sharedFiles,
  untrack,
  writeState,
  writeText,
} from './project.js';
import { compareVersions, eolOf, toLf, withEol } from './text.js';
import { unifiedDiff } from './unified-diff.js';

export { unifiedDiff } from './unified-diff.js';

/**
 * A file's text, or null when it does not exist.
 * @param {string} path
 */
const readText = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/** @typedef {import('./project.js').State} State */
/**
 * @typedef {'added' | 'restored' | 'unchanged' | 'replaced' | 'merged' | 'conflict' | 'kept-new' | 'no-longer-shipped'
 *   | 'removed' | 'kept-unused'} Outcome
 * @typedef {{ module: string, file: string, outcome: Outcome }} UpdateResult
 */

/**
 * Modules to work on: the named ones (they must be added), or every added one with `all`.
 * Naming none without `all` is refused, so a bare command never touches everything.
 * @param {State} state
 * @param {string[]} names
 * @param {boolean} all
 * @param {'diff' | 'update'} verb
 */
function modulesFor(state, names, all, verb) {
  if (all) return Object.keys(state.components);

  if (!names.length) throw new CliError(`Name the components to ${verb}, or pass --all: npx focsd ${verb} button`);

  return addedModules(state, names, verb);
}

/**
 * Your edits (delivered → yours) and this version's changes (delivered → new), per file.
 * @param {string} root
 * @param {string[]} names
 * @param {{ templates: string, all?: boolean }} options
 */
export function diff(root, names, { templates, all = false }) {
  const state = requireState(root);
  const { read, version } = loadTemplates(templates);
  const newer = compareVersions(version, state.version) >= 0;

  return modulesFor(state, names, all, 'diff').flatMap((module) =>
    closure(module, read).map((rel) => {
      const pristine = readText(pristinePath(root, rel)) ?? '';
      const current = readText(copyPath(root, state, rel)) ?? '';
      const upstream = read(rel);
      const shown = posix.join(state.dir, rel);

      return {
        file: rel,
        local: unifiedDiff(toLf(pristine), toLf(current), `${shown} (delivered)`, `${shown} (yours)`),
        upstream: unifiedDiff(
          toLf(pristine),
          toLf(upstream),
          `${shown} (delivered)`,
          `${shown} (${newer ? 'new' : "this CLI's"} version ${version})`,
        ),
      };
    }),
  );
}

/**
 * Runs git with the given arguments and returns its exit status and output.
 * @typedef {(args: string[]) => { status: number | null, stdout: string, error?: Error }} GitRunner
 */

/** @type {GitRunner} */
const runGit = (args) => spawnSync('git', args, { encoding: 'utf8' });

/**
 * git merge-file. Exit status 0 is a clean merge and 1 to 127 the number of conflicts; anything
 * else (128 and above for git errors, a signal, git missing) is a failure, whose output is never
 * written into a file.
 * @param {string} current
 * @param {string} base
 * @param {string} upstream
 * @param {GitRunner} [git]
 * @returns {{ status: 'clean' | 'conflict' | 'failed', text: string }}
 */
export function mergeFile(current, base, upstream, git = runGit) {
  const dir = mkdtempSync(join(tmpdir(), 'focsd-merge-'));

  try {
    const sides = /** @type {const} */ ([
      ['yours', current],
      ['delivered', base],
      ['new version', upstream],
    ]);

    const paths = sides.map(([name, text]) => {
      const path = join(dir, name);

      writeFileSync(path, text);

      return path;
    });

    const { error, status, stdout } = git(['merge-file', '-p', '-L', 'yours', '-L', 'delivered', '-L', 'new version', ...paths]);

    if (error || status === null || status < 0 || status >= 128) return { status: 'failed', text: '' };

    return { status: status === 0 ? 'clean' : 'conflict', text: stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * @typedef {{ root: string, state: State, read: (rel: string) => string, merge: boolean, git?: GitRunner }} UpdateContext
 * @typedef {{ outcome: Outcome, hash: string }} FileUpdate
 *   What happened to one file, and the hash to record for it.
 */

/**
 * Bring one copied file to the new version (see `update`).
 * @param {UpdateContext} context
 * @param {string} rel
 * @param {string | undefined} recorded
 * @returns {FileUpdate}
 */
function updateFile({ root, state, read, merge, git }, rel, recorded) {
  const dest = copyPath(root, state, rel);
  const delivered = pristinePath(root, rel);
  const upstream = read(rel);
  const current = readText(dest);
  const pristine = readText(delivered);
  const eol = eolOf(current);

  /**
   * The delivered copy moves to the new version unless the old base is kept for a later merge.
   * @param {Outcome} outcome
   * @returns {FileUpdate}
   */
  const done = (outcome, { advance = true } = {}) => {
    if (advance) writeText(delivered, upstream);

    return { outcome, hash: advance ? sha256(upstream) : (recorded ?? sha256(upstream)) };
  };

  /** @returns {FileUpdate} */
  const keepBeside = () => {
    writeText(copyPath(root, state, `${rel}.focsd-new`), withEol(upstream, eol));

    return done('kept-new', { advance: false });
  };

  if (current === null) {
    writeText(dest, upstream);

    return done(pristine === null ? 'added' : 'restored');
  }

  if (toLf(current) === toLf(upstream)) return done('unchanged');

  if (recorded === undefined) return keepBeside(); // not delivered by Focsd: it is yours

  if (sha256(current) === recorded) {
    writeText(dest, withEol(upstream, eol));

    return done('replaced');
  }

  if (pristine === null) return keepBeside(); // edited, and no delivered copy to merge against

  if (toLf(pristine) === toLf(upstream)) return done('unchanged', { advance: false }); // only you changed it
  const merged = mergeFile(toLf(current), toLf(pristine), toLf(upstream), git);

  if (merged.status === 'clean' || (merged.status === 'conflict' && merge)) {
    writeText(dest, withEol(merged.text, eol));

    return done(merged.status === 'clean' ? 'merged' : 'conflict');
  }

  return keepBeside();
}

/**
 * Bring one added module to the new version: its files, then the files it no longer uses.
 * @param {UpdateContext} context
 * @param {string} module
 * @returns {{ entry: import('./project.js').ComponentEntry, results: UpdateResult[], landed: boolean }}
 */
function updateModule(context, module) {
  const { root, state, read } = context;
  const entry = entryOf(state, module);
  const updates = closure(module, read).map((rel) => /** @type {const} */ ([rel, updateFile(context, rel, entry.files[rel])]));
  const kept = new Set(updates.map(([rel]) => rel));
  const stillUsed = sharedFiles(state, [module]);

  const dropped = Object.entries(entry.files)
    .filter(([rel]) => !kept.has(rel) && !stillUsed.has(rel))
    .map(
      ([rel, hash]) =>
        /** @type {UpdateResult} */ ({
          module,
          file: rel,
          outcome: untrack(root, state, rel, hash) === 'removed' ? 'removed' : 'kept-unused',
        }),
    );

  const results = [...updates.map(([rel, u]) => ({ module, file: rel, outcome: u.outcome })), ...dropped];

  return {
    entry: { ...entry, files: Object.fromEntries(updates.map(([rel, u]) => [rel, u.hash])) },
    results,
    landed: !results.some((r) => r.outcome === 'kept-new' || r.outcome === 'conflict'),
  };
}

/**
 * Bring components to this CLI's version. Per file (compared without regard to line endings):
 * - missing → restored; same as the new version → unchanged;
 * - delivered by Focsd and not edited (its recorded hash) → replaced;
 * - edited → three-way merged against the delivered copy; when that copy is missing, or the merge
 *   conflicts, the file is kept and the new version written beside it as `<file>.focsd-new`
 *   (or, with `merge`, conflict markers are written into the file);
 * - not delivered by Focsd (a file you already had) → kept, new version beside it;
 * - no longer used by the new version (and by no other added component) → deleted with its
 *   delivered copy when unedited ('removed'), otherwise kept and no longer tracked ('kept-unused').
 * A component moves to the new version only when every one of its files landed; focsd.json's
 * version moves once every component has. Refuses to go back to an older version unless `force`.
 * Modules the new version no longer ships are reported and left alone.
 * @param {string} root
 * @param {string[]} names
 * @param {{ templates: string, all?: boolean, merge?: boolean, force?: boolean, git?: GitRunner }} options
 * @returns {UpdateResult[]}
 */
export function update(root, names, { templates, all = false, merge = false, force = false, git }) {
  const state = requireState(root);
  const modules = modulesFor(state, names, all, 'update');
  const { read, has, manifest, version } = loadTemplates(templates);
  const newest = newestVersion(state);

  if (compareVersions(version, newest) < 0 && !force)
    throw new CliError(
      `This CLI (${version}) is older than the version your components came from (${newest}). Run \`npx focsd@latest update\`, or pass --force to go back.`,
    );
  const shipped = new Set(manifest.modules.map((m) => posix.basename(m.path)));
  /** @param {string} module */
  const ships = (module) => shipped.has(module) && has(module);
  const touched = modules.filter(ships).flatMap((m) => [...closure(m, read), ...Object.keys(entryOf(state, m).files)]);
  checkPaths(root, state, new Set(touched), ['', '.focsd-new']);
  /** @type {UpdateResult[]} */
  const results = [];

  // A private copy that settles module by module: each one sees what the ones before it left
  // (a file an earlier module dropped is no longer shared). The loaded state is never changed.
  const settled = { ...state.components };

  for (const module of modules) {
    if (!ships(module)) {
      results.push({ module, file: module, outcome: 'no-longer-shipped' });
      continue;
    }

    const updated = updateModule({ root, state: { ...state, components: settled }, read, merge, git }, module);
    results.push(...updated.results);
    settled[module] = {
      ...updated.entry,
      tags: tagsIn(module, manifest),
      version: updated.landed ? version : (updated.entry.version ?? state.version),
    };
  }

  const next = { ...state, components: settled };
  writeState(root, { ...next, version: settledVersion(next) });

  return results;
}

/**
 * What to tell the user about edited files a new version stopped importing ('kept-unused'): they
 * stay on disk but no longer style anything (shared styles now come from `@focsd-dev/primitives/styles`),
 * and how to own them again. Empty when there are none.
 * @param {{ file: string, module?: string, outcome: string }[]} results
 */
export function unusedNotice(results) {
  const unused = results.filter((r) => r.outcome === 'kept-unused');

  if (!unused.length) return '';
  const files = unused.map((r) => (r.module ? `${r.file} (was used by ${r.module})` : r.file));

  return [
    `${unused.length} edited file(s) this version no longer imports were kept, but they no longer apply: ${files.join(', ')}.`,
    "Shared styles now come from @focsd-dev/primitives/styles. To keep your edits, point the component's import",
    'at your local file (for example `./styles/combo.js` instead of `@focsd-dev/primitives/styles/combo.js`),',
    'or copy the edits into the component module.',
  ].join('\n');
}
