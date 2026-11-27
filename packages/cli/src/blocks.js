/**
 * `focsd add block <name>`: copy a block (plain HTML plus one JS module) into the project.
 * Blocks use the published packages, so no focsd.json is needed. Nothing is ever overwritten:
 * every target is planned first, and one clash aborts the whole block before a byte is written.
 */
import {
  accessSync,
  constants,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  rmdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { CliError } from './errors.js';
import { containedPath, inside, toPosix } from './paths.js';

const NAME = /^[a-z][a-z0-9-]*$/;

/**
 * @typedef {{ name: string, title: string, description: string, files: string[], packages: string[], elements: string[] }} Block
 * @typedef {{ rel: string, target: string, source: string }} Write
 */

/** @param {string} path */
const lstatOrNull = (path) => {
  try {
    return lstatSync(path);
  } catch {
    return null;
  }
};

/** @param {string} path */
const statOrNull = (path) => {
  try {
    return statSync(path);
  } catch {
    return null;
  }
};

/**
 * Refuse, before anything is written, a target folder that cannot take the files: a path segment
 * that is a file, or an existing folder the user cannot write to.
 * @param {string} root
 * @param {string} outDir
 */
function checkWritable(root, outDir) {
  let dir = resolve(root);
  let shown = '';

  for (const segment of outDir.split('/').filter((s) => s && s !== '.')) {
    const next = join(dir, segment);
    const stat = statOrNull(next);
    shown = shown ? `${shown}/${segment}` : segment;

    if (!stat) break;

    if (!stat.isDirectory()) throw new CliError(`Nothing written: "${shown}" is a file, not a folder.`);
    dir = next;
  }

  try {
    accessSync(dir, constants.W_OK | constants.X_OK);
  } catch {
    throw new CliError(`Nothing written: "${dir === resolve(root) ? '.' : shown}" is not writable.`);
  }
}

/**
 * @param {string} a
 * @param {string} b
 */
function distance(a, b) {
  /** @type {number[]} */
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const prev = row;
    /** @type {number[]} */
    const next = [i];

    for (let j = 1; j <= b.length; j++)
      next.push(Math.min((prev[j] ?? 0) + 1, (next[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)));
    row = next;
  }

  return row.at(-1) ?? 0;
}

/**
 * @param {string} dir
 * @param {string} name
 * @returns {Block}
 */
function readBlock(dir, name) {
  const meta = JSON.parse(readFileSync(join(dir, name, 'block.json'), 'utf8'));

  if (meta.name !== name) throw new CliError(`Block "${name}": block.json names "${meta.name}", not "${name}".`);

  return {
    name,
    title: String(meta.title ?? meta.name),
    description: String(meta.description ?? ''),
    files: Array.isArray(meta.files) ? meta.files.map(String) : [],
    packages: Array.isArray(meta.packages) ? meta.packages.map(String) : [],
    elements: Array.isArray(meta.elements) ? meta.elements.map(String) : [],
  };
}

/**
 * Every block in `dir` (a folder with a block.json), sorted by name.
 * @param {string} dir
 * @returns {Block[]}
 */
export function listBlocks(dir) {
  const entries = lstatOrNull(dir) ? readdirSync(dir, { withFileTypes: true }) : [];

  return entries
    .filter((e) => e.isDirectory() && NAME.test(e.name) && lstatOrNull(join(dir, e.name, 'block.json'))?.isFile())
    .map((e) => readBlock(dir, e.name))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * Where a block will be written, and which of those files already exist.
 * @param {string} root
 * @param {string} name
 * @param {{ out?: string, blocksDir: string }} options
 * @returns {{ block: Block, outDir: string, writes: Write[], clashes: string[] }}
 */
export function planBlock(root, name, { out, blocksDir }) {
  if (!NAME.test(name)) throw new CliError(`"${name}" is not a block name (lowercase letters, digits and hyphens).`);
  const blocks = listBlocks(blocksDir);
  const block = blocks.find((b) => b.name === name);

  if (!block) {
    const ranked = blocks.map((b) => /** @type {[string, number]} */ ([b.name, distance(name, b.name)])).toSorted((a, b) => a[1] - b[1]);
    const near = ranked.at(0);
    const hint = near && near[1] <= Math.max(2, Math.floor(name.length / 2)) ? ` Did you mean "${near[0]}"?` : '';
    throw new CliError(`No block named "${name}".${hint} Run \`npx focsd list --blocks\`.`);
  }

  if (out !== undefined && out.trim() === '') throw new CliError('--out needs a folder: --out src/pages/dashboard');
  const outDir = toPosix(out ?? `blocks/${name}`);
  inside(root, containedPath(outDir)); // refuses absolute paths, "..", and symlinks that lead out
  const place = outDir.split('/').find((segment) => segment === '.git' || segment === 'node_modules');

  if (place) throw new CliError(`"${outDir}" is inside ${place}. Pick a source folder with --out, for example --out src/pages/${name}.`);
  checkWritable(root, outDir);

  const seen = new Set();

  /** @type {Write[]} */
  const writes = block.files.map((file) => {
    const rel = containedPath(toPosix(file));

    if (seen.has(rel)) throw new CliError(`Block "${name}" lists ${rel} twice.`);
    seen.add(rel);
    const source = join(blocksDir, name, rel);

    if (!lstatOrNull(source)?.isFile()) throw new CliError(`Block "${name}" lists ${file}, which is not a regular file.`);

    return { rel: posix.join(outDir, rel), target: inside(root, outDir, rel), source };
  });

  // lstat, not exists: a dangling symlink is a clash too, never written through.
  const clashes = writes.filter((w) => lstatOrNull(w.target)).map((w) => w.rel);

  return { block, outDir, writes, clashes };
}

/**
 * The folders from `dir` upwards that do not exist yet, deepest first.
 * @param {string} dir
 */
function missingDirs(dir) {
  /** @type {string[]} */
  const missing = [];

  for (let d = dir; !lstatOrNull(d); d = dirname(d)) missing.push(d);

  return missing;
}

/**
 * Remove what a failed run created: its files, then its folders if they are empty again.
 * @param {{ files: string[], dirs: string[] }} created
 */
function rollback({ files, dirs }) {
  for (const file of files) rmSync(file, { force: true });

  for (const dir of [...new Set(dirs)].toSorted((a, b) => b.length - a.length)) {
    try {
      rmdirSync(dir); // fails on a folder that is not empty: then it is not ours to remove
    } catch {
      /* already gone, or in use */
    }
  }
}

/**
 * Write a block. All or nothing: any existing target file aborts before anything is written.
 * @param {string} root
 * @param {string} name
 * @param {{ out?: string, blocksDir: string, writeFile?: typeof writeFileSync }} options `writeFile` is the writer, injectable so a failing disk can be tested
 * @returns {{ block: Block, outDir: string, files: string[] }}
 */
export function addBlock(root, name, options) {
  const writeFile = options.writeFile ?? writeFileSync;
  const { block, outDir, writes, clashes } = planBlock(root, name, options);

  if (clashes.length)
    throw new CliError(
      `Nothing written: ${clashes.length} file(s) already exist. Blocks never overwrite.\n${clashes.map((c) => `  ${c}`).join('\n')}\nMove them, or pick another folder with --out.`,
    );

  const created = { files: /** @type {string[]} */ ([]), dirs: /** @type {string[]} */ ([]) };

  try {
    for (const { target, source } of writes) {
      created.dirs.push(...missingDirs(dirname(target)));
      mkdirSync(dirname(target), { recursive: true });
      writeFile(target, readFileSync(source), { flag: 'wx' }); // wx: fails if a file appeared meanwhile
      created.files.push(target);
    }
  } catch (error) {
    rollback(created);
    const code = /** @type {NodeJS.ErrnoException} */ (error).code ?? 'error';
    throw new CliError(`Nothing written: ${code} while writing the block, and what this run created was removed.`);
  }

  return { block, outDir, files: writes.map((w) => w.rel) };
}
