/**
 * A project's copied components: focsd.json (where they live, the version they came from, and a
 * hash of every copied file as delivered) and `.focsd/pristine/`, the delivered copies that
 * `diff` and `update` merge against. Commit both, so teammates can update too.
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { isRecord, isText } from './decode.js';
import { CliError } from './errors.js';
import { containedPath, inside, toPosix } from './paths.js';
import { closure, elements, moduleOf, normalizeName, tagsIn } from './resolve.js';
import { compareVersions, eolOf, toLf, withEol } from './text.js';

export { CliError } from './errors.js';

/**
 * @typedef {import('./resolve.js').Manifest} Manifest
 * @typedef {{ tags: string[], files: Record<string, string>, version?: string }} ComponentEntry
 *   The tags a copied module brings, the hash of each file as delivered, and the version every one
 *   of its files is at (older entries without it are at the State's version).
 * @typedef {{ dir: string, version: string, components: Record<string, ComponentEntry> }} State
 *   focsd.json. `version` is the version every copied component is at; it moves only once they
 *   all are.
 * @typedef {{ manifest: Manifest, version: string, read: (rel: string) => string, has: (rel: string) => boolean }} Templates
 * @typedef {(cmd: string, args: string[], root: string) => { status: number | null } | undefined} Runner
 */

export const STATE = 'focsd.json';
const PRISTINE = '.focsd/pristine';

/**
 * Delivered copies end in this instead of `.js`, so linters, type checkers and bundlers that look
 * for .js files never pick them up. `git merge-file` reads their text, so the name does not matter to it.
 */
const PRISTINE_EXT = '.pristine';

const README = `# .focsd

The copies of each component file exactly as Focsd delivered them, so \`npx focsd diff\` can
show your edits and \`npx focsd update\` can merge new versions into them. Commit this folder with
focsd.json, so teammates can update too. Do not edit it.

The copies end in \`${PRISTINE_EXT}\`, so most tools skip them. If one still picks them up, ignore
\`.focsd/\`:

- ESLint: \`{ ignores: ['.focsd/'] }\` in eslint.config.js
- TypeScript: \`"exclude": [".focsd"]\` in tsconfig.json
- Tailwind CSS 4: \`@source not "../.focsd";\` (relative to your CSS file)
- Prettier: \`.focsd/\` in .prettierignore
`;

/**
 * Hash of a file's content, independent of its line endings (CRLF checkouts hash the same).
 * @param {string} text
 */
export const sha256 = (text) => createHash('sha256').update(toLf(text)).digest('hex');

/** @param {string} path */
const readText = (path) => readFileSync(path, 'utf8');

/**
 * Write a file, creating its folder.
 * @param {string} path
 * @param {string} text
 */
export function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/**
 * The templates shipped with this CLI: version, manifest and file reader.
 * @param {string} templates
 * @returns {Templates}
 */
export function loadTemplates(templates) {
  const manifest = JSON.parse(readText(join(templates, 'custom-elements.json')));
  const version = JSON.parse(readText(join(templates, 'components.package.json'))).version;

  return { manifest, version, read: (rel) => readText(join(templates, rel)), has: (rel) => existsSync(join(templates, rel)) };
}

/** @param {string} why */
const invalidState = (why) => new CliError(`${STATE} is not valid: ${why}. Fix it, or restore it from version control.`);

/**
 * One component entry of focsd.json, checked: every file path stays inside the copy folder.
 * @param {string} module
 * @param {unknown} entry
 * @returns {[string, ComponentEntry]}
 */
function parseEntry(module, entry) {
  containedPath(module);

  if (!isRecord(entry) || !Array.isArray(entry.tags) || !isRecord(entry.files)) throw invalidState(`"${module}" needs "tags" and "files"`);

  if (entry.version !== undefined && !isText(entry.version)) throw invalidState(`the version of "${module}" is not text`);

  const files = Object.entries(entry.files).map(([rel, hash]) => {
    if (!isText(hash)) throw invalidState(`the hash of "${rel}" is not text`);

    return /** @type {[string, string]} */ ([containedPath(rel), hash]);
  });

  const parsed = { tags: entry.tags.map(String), files: Object.fromEntries(files) };

  return [module, entry.version === undefined ? parsed : { ...parsed, version: entry.version }];
}

/**
 * focsd.json, checked: it may have been edited by hand or tampered with, and its paths decide what
 * the CLI writes and deletes.
 * @param {string} text
 * @returns {State}
 */
function parseState(text) {
  /** @type {unknown} */
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw invalidState('it is not JSON');
  }

  if (!isRecord(data) || !isText(data.dir) || !isText(data.version) || !isRecord(data.components))
    throw invalidState('it needs "dir", "version" and "components"');
  const components = Object.entries(data.components).map(([module, entry]) => parseEntry(module, entry));

  return { dir: containedPath(toPosix(data.dir)), version: data.version, components: Object.fromEntries(components) };
}

/**
 * Where focsd.json is, checked like every other path: a focsd.json symlinked out of the project
 * (even to a file that does not exist yet) would make the CLI read or overwrite a file elsewhere.
 * @param {string} root
 */
const statePath = (root) => inside(root, STATE);

/**
 * @param {string} root
 * @returns {State | null}
 */
export function readState(root) {
  const path = statePath(root);

  return existsSync(path) ? parseState(readText(path)) : null;
}

/**
 * The version each copied component is at.
 * @param {State} state
 */
const componentVersions = (state) => Object.values(state.components).map((e) => e.version ?? state.version);

/**
 * The recorded entry of an added module (one `addedModules` or the caller found in `state`).
 * @param {State} state
 * @param {string} module
 * @returns {ComponentEntry}
 */
export function entryOf(state, module) {
  const entry = state.components[module];

  if (!entry) throw new CliError(`${STATE} has no entry for ${module}.`);

  return entry;
}

/**
 * The version every copied component is at, or the recorded one while they differ.
 * @param {State} state
 */
export function settledVersion(state) {
  const [only, ...others] = new Set(componentVersions(state));

  return only !== undefined && others.length === 0 ? only : state.version;
}

/**
 * The newest version any copied component is at (for refusing downgrades).
 * @param {State} state
 */
export const newestVersion = (state) => componentVersions(state).reduce((a, b) => (compareVersions(a, b) >= 0 ? a : b), state.version);

/**
 * Where a copied file lives in the project.
 * @param {string} root
 * @param {State} state
 * @param {string} rel
 */
export const copyPath = (root, state, rel) => inside(root, state.dir, rel);

/**
 * Where the delivered copy of a file is kept.
 * @param {string} root
 * @param {string} rel
 */
export const pristinePath = (root, rel) => inside(root, PRISTINE, `${rel}${PRISTINE_EXT}`);

/**
 * Check every path a command will write or delete for `files` (each copy, with `suffixes`, and its
 * delivered copy) before the first write: a check failing halfway would leave some files changed
 * and focsd.json not.
 * @param {string} root
 * @param {State} state
 * @param {Iterable<string>} files
 * @param {string[]} [suffixes]
 */
export function checkPaths(root, state, files, suffixes = ['']) {
  for (const rel of files) {
    for (const suffix of suffixes) copyPath(root, state, `${rel}${suffix}`);
    pristinePath(root, rel);
  }
}

/**
 * Explain `.focsd/` to whoever finds it, once; a README you changed is left alone.
 * @param {string} root
 */
function writeReadme(root) {
  const path = inside(root, dirname(PRISTINE), 'README.md');

  if (!existsSync(path)) writeText(path, README);
}

/**
 * @param {string} root
 * @param {State} state
 */
export function writeState(root, state) {
  writeText(statePath(root), `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * @param {string} root
 * @returns {State}
 */
export function requireState(root) {
  const state = readState(root);

  if (!state) throw new CliError('No focsd.json here. Run `npx focsd init` first.');

  return state;
}

/**
 * The package manager this project uses, from its lockfile.
 * @param {string} root
 * @returns {{ cmd: string, add: string[] }}
 */
function packageManager(root) {
  if (existsSync(join(root, 'pnpm-lock.yaml'))) return { cmd: 'pnpm', add: ['add'] };

  if (existsSync(join(root, 'yarn.lock'))) return { cmd: 'yarn', add: ['add'] };

  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return { cmd: 'bun', add: ['add'] };

  return { cmd: 'npm', add: ['install'] };
}

/**
 * Runtime packages copied components need, pinned to the version they came from.
 * @param {string} version
 */
const runtimePackages = (version) => ['lit', `@focsd-dev/primitives@${version}`, `@focsd-dev/tokens@${version}`];

/**
 * The install command for the runtime packages, as text.
 * @param {string} root
 * @param {string} version
 */
export function installCommand(root, version) {
  const { cmd, add: verb } = packageManager(root);

  return [cmd, ...verb, ...runtimePackages(version)].join(' ');
}

/** @type {Runner} */
const defaultRun = (cmd, args, root) => spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });

/**
 * Create focsd.json, or update it when it exists: `dir` (where copied components go) changes only
 * when given, and copied components keep the version they came from. `install` installs the
 * runtime packages of this CLI's version.
 * @param {string} root
 * @param {{ dir?: string, templates: string, install?: boolean, run?: Runner }} options
 * @returns {State}
 */
export function init(root, { dir, templates, install = false, run = defaultRun }) {
  const { version } = loadTemplates(templates);
  const existing = readState(root);
  const copied = Object.keys(existing?.components ?? {}).length > 0;

  const state = {
    dir: containedPath(toPosix(dir ?? existing?.dir ?? 'src/focsd')),
    version: copied && existing ? existing.version : version,
    components: existing?.components ?? {},
  };

  inside(root, state.dir);
  writeState(root, state);

  if (install) {
    const { cmd, add: verb } = packageManager(root);
    const result = run(cmd, [...verb, ...runtimePackages(version)], root);

    if (result?.status !== 0) throw new CliError(`The install failed. Run it yourself: ${installCommand(root, version)}`);
  }

  return state;
}

/** Agent files `init --agent` writes: project-relative path, and its file in the templates. */
const AGENT_FILES = [
  { path: 'AGENTS.md', template: 'AGENTS.md' },
  { path: '.claude/skills/focsd/SKILL.md', template: 'SKILL.md' },
];

/**
 * True when anything sits at `target`, a dangling symlink included (`existsSync` follows links
 * and would call that missing, so a write would go through to its target).
 * @param {string} target
 */
function pathTaken(target) {
  try {
    lstatSync(target);

    return true;
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;

    throw error;
  }
}

/**
 * Write AGENTS.md and the Claude skill under `root`. A file that exists is never touched, so a
 * second run changes nothing. focsd.json is not read or written.
 * @param {string} root
 * @param {{ templates: string }} options
 * @returns {{ path: string, written: boolean }[]}
 */
export function initAgent(root, { templates }) {
  return AGENT_FILES.map(({ path, template }) => {
    // Check the link itself first: a dangling symlink must be skipped, not resolved and written through.
    if (pathTaken(join(root, path))) return { path, written: false };
    const target = inside(root, path);

    writeText(target, readText(join(templates, template)));

    return { path, written: true };
  });
}

/**
 * `init --agent`: write the agent files and return the lines to print (what was written or
 * skipped, then the MCP connect commands).
 * @param {string} root
 * @param {{ templates: string, dir?: string, install?: boolean }} options
 * @returns {string[]}
 */
export function agentInit(root, { templates, dir, install }) {
  if (dir !== undefined || install) throw new CliError('--agent cannot be combined with --dir or --install.');

  return [
    ...initAgent(root, { templates }).map(({ path, written }) => (written ? `✓ wrote ${path}` : `skipped ${path} (exists)`)),
    'Connect the Focsd MCP server (optional):',
    '  stdio: npx -y @focsd-dev/mcp',
    '  HTTP:  npx -y @focsd-dev/mcp --http --port 3333',
    '         claude mcp add --transport http focsd http://127.0.0.1:3333/mcp',
  ];
}

/**
 * The module files for the given names; throws on unknown names.
 * @param {string[]} names
 * @param {Manifest} manifest
 */
function modulesFor(names, manifest) {
  /** @type {string[]} */
  const modules = [];

  for (const name of names) {
    const module = moduleOf(normalizeName(name), manifest);

    if (!module) throw new CliError(`Unknown component "${name}". Run \`npx focsd list\` to see them all.`);

    if (!modules.includes(module)) modules.push(module);
  }

  return modules;
}

/**
 * The recorded hash of `rel` in any added module, if Focsd delivered it.
 * @param {State} state
 * @param {string} rel
 * @returns {string | undefined}
 */
function recordedHash(state, rel) {
  for (const entry of Object.values(state.components)) if (entry.files[rel]) return entry.files[rel];

  return undefined;
}

/**
 * Sort the files `add` would write that already exist: identical or ours unedited (overwritten
 * silently), ours but edited (kept, with a warning, unless `overwrite`), or not ours (conflicts).
 * @param {string} root
 * @param {State} state
 * @param {{ files: { rel: string, text: string }[] }[]} plan
 * @param {boolean} overwrite
 * @returns {{ warnings: string[], keep: Set<string>, conflicts: string[] }}
 */
function existingFiles(root, state, plan, overwrite) {
  /** @type {string[]} */
  const warnings = [];
  /** @type {Set<string>} */
  const keep = new Set();
  /** @type {string[]} */
  const conflicts = [];

  for (const { rel, text } of plan.flatMap((p) => p.files)) {
    const dest = copyPath(root, state, rel);

    if (!existsSync(dest)) continue;
    const current = readText(dest);

    if (toLf(current) === toLf(text)) continue;
    const recorded = recordedHash(state, rel);

    if (recorded && sha256(current) === recorded) continue; // ours, unedited: update it

    if (recorded && !overwrite) {
      if (!keep.has(rel))
        warnings.push(`Kept your edited ${posix.join(state.dir, rel)}; run \`npx focsd update\` to merge this version's changes into it.`);
      keep.add(rel);
      continue;
    }

    conflicts.push(posix.join(state.dir, rel));
  }

  return { warnings, keep, conflicts };
}

/**
 * Copy components into the project. Checks every destination first:
 * - a file Focsd delivered and you have not edited (an older version) is brought up to date;
 * - a delivered file you edited (a shared style) is kept and recorded for the new component too;
 * - any other existing file that differs stops the whole command (nothing is written) unless
 *   `overwrite`.
 * @param {string} root
 * @param {string[]} names
 * @param {{ overwrite?: boolean, templates: string }} options
 */
export function add(root, names, { overwrite = false, templates }) {
  const state = requireState(root);
  const { manifest, read, version } = loadTemplates(templates);
  const modules = modulesFor(names, manifest);
  const plan = modules.map((module) => ({ module, files: closure(module, read).map((rel) => ({ rel, text: read(rel) })) }));
  const { warnings, keep, conflicts } = existingFiles(root, state, plan, overwrite);

  if (conflicts.length && !overwrite)
    throw new CliError(
      `These files exist and are not Focsd's:\n  ${[...new Set(conflicts)].join('\n  ')}\nUse --overwrite to replace them.`,
    );

  for (const { files } of plan) {
    for (const { rel, text } of files) {
      if (keep.has(rel)) continue;
      const dest = copyPath(root, state, rel);
      writeText(dest, withEol(text, existsSync(dest) ? eolOf(readText(dest)) : '\n'));
      writeText(pristinePath(root, rel), text);
    }
  }

  const components = {
    ...state.components,
    ...Object.fromEntries(
      plan.map(({ module, files }) => [
        module,
        {
          tags: tagsIn(module, manifest),
          files: Object.fromEntries(files.map(({ rel, text }) => [rel, (keep.has(rel) && recordedHash(state, rel)) || sha256(text)])),
          version,
        },
      ]),
    ),
  };

  const withComponents = { ...state, components };
  writeState(root, { ...withComponents, version: settledVersion(withComponents) });
  writeReadme(root);

  return {
    modules,
    warnings,
    importLines: modules.map((m) => `import './${posix.join(state.dir, m)}';`),
    tags: modules.flatMap((m) => tagsIn(m, manifest)),
  };
}

/**
 * Every component in this CLI version, marked when added: by name, or `via` another added module
 * whose files include it (the dialog module that combobox brings).
 * @param {string} root
 * @param {{ templates: string }} options
 */
export function list(root, { templates }) {
  const components = readState(root)?.components ?? {};
  const { manifest } = loadTemplates(templates);
  /** @param {string} module */
  const via = (module) => Object.entries(components).find(([, entry]) => Object.hasOwn(entry.files, module))?.[0];

  return elements(manifest).map((e) => {
    const direct = Object.hasOwn(components, e.module);
    const indirect = direct ? undefined : via(e.module);

    return { ...e, added: direct || indirect !== undefined, via: indirect };
  });
}

/**
 * The added modules the given names refer to: each name is a tag, a bare name (`button`) or a
 * module file (`focsd-button.js`). Throws on a name that was never added.
 * @param {State} state
 * @param {string[]} names
 * @param {'diff' | 'update' | 'remove'} [verb] decides the hint: diff and update point at `add`, remove at `list`
 * @returns {string[]}
 */
export function addedModules(state, names, verb = 'remove') {
  const known = Object.entries(state.components);

  return names.map((name) => {
    const tag = normalizeName(name.replace(/\.js$/, ''));
    const found = known.find(([m, entry]) => entry.tags.includes(tag) || m === `${tag}.js`)?.[0];

    if (!found) {
      throw new CliError(
        verb === 'remove'
          ? `"${name}" is not added. Run \`npx focsd list\` to see what is.`
          : `"${name}" is not added. Add it first: npx focsd add ${name}`,
      );
    }

    return found;
  });
}

/**
 * Files another added module still needs.
 * @param {State} state
 * @param {string[]} except
 */
export function sharedFiles(state, except) {
  return new Set(
    Object.entries(state.components)
      .filter(([module]) => !except.includes(module))
      .flatMap(([, entry]) => Object.keys(entry.files)),
  );
}

/**
 * Stop tracking a copied file: delete it when unedited (or already gone), keep it when edited. Its
 * delivered copy goes either way: nothing merges against it any more.
 * @param {string} root
 * @param {State} state
 * @param {string} rel
 * @param {string} hash
 * @returns {'removed' | 'kept'}
 */
export function untrack(root, state, rel, hash) {
  const dest = copyPath(root, state, rel);
  const edited = existsSync(dest) && sha256(readText(dest)) !== hash;

  if (!edited) rmSync(dest, { force: true });
  rmSync(pristinePath(root, rel), { force: true });

  return edited ? 'kept' : 'removed';
}

/**
 * Remove components: deletes their files unless edited (kept, reported) or still used by another
 * added component.
 * @param {string} root
 * @param {string[]} names
 */
export function remove(root, names) {
  const state = requireState(root);

  if (!names.length) throw new CliError('Name the components to remove: npx focsd remove button');

  const modules = addedModules(state, names);

  checkPaths(
    root,
    state,
    modules.flatMap((m) => Object.keys(entryOf(state, m).files)),
  );
  const stillUsed = sharedFiles(state, modules);
  /** @type {string[]} */
  const removed = [];
  /** @type {string[]} */
  const kept = [];

  for (const module of modules) {
    for (const [rel, hash] of Object.entries(entryOf(state, module).files)) {
      if (stillUsed.has(rel) || removed.includes(rel) || kept.includes(rel)) continue;

      (untrack(root, state, rel, hash) === 'removed' ? removed : kept).push(rel);
    }
  }

  writeState(root, {
    ...state,
    components: Object.fromEntries(Object.entries(state.components).filter(([module]) => !modules.includes(module))),
  });

  return { removed, kept };
}
