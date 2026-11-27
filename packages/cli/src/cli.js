#!/usr/bin/env node
/**
 * focsd: copy Focsd components into your project, see what changed, and update them.
 *   npx focsd init | add <name…> | list | diff <name…> | update <name…>|--all | remove <name…>
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { relative } from 'node:path';
import { parseArgs } from 'node:util';
import { CliError, STATE, add, init, agentInit, installCommand, list, loadTemplates, readState, remove } from './project.js';
import { diff, unusedNotice, update } from './merge.js';
import { findUp } from './paths.js';
import { addBlock, listBlocks } from './blocks.js';

const templates = fileURLToPath(new URL('../templates/', import.meta.url));

// FOCSD_BLOCKS_DIR points the CLI at another blocks folder (used by the tests to run against fixtures).
const blocksDir = process.env.FOCSD_BLOCKS_DIR ?? fileURLToPath(new URL('../blocks/', import.meta.url));
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const HELP = `focsd ${version}: own the look of Focsd components, keep getting their fixes.

Usage: npx focsd <command> [options]

Commands
  init [--dir src/focsd]       Create focsd.json here; copied components go in --dir (kept on re-run)
       [--install]             Also install lit, @focsd/primitives and @focsd/tokens
  init --agent                 Write AGENTS.md and .claude/skills/focsd/SKILL.md for AI coding agents
                               and print the MCP connect commands. Works with or without focsd.json
                               (never read or changed); a file that exists is skipped, never overwritten.
                               Cannot be combined with --dir or --install.
  add <name…> [--overwrite]    Copy components (button, date-picker, focsd-select…)
  add block <name> [--out dir] Copy a page block (dashboard, settings…) into blocks/<name>/. Uses the
                               packages, so focsd.json is not needed. Never overwrites: if any file
                               exists nothing is written. --overwrite is refused.
  list [--blocks]              Show every component; ✓ marks added ones (and ones they brought).
                               --blocks lists the blocks instead.
  diff <name…> | --all         Your edits and the new version's changes
  update <name…> | --all       Bring components to this version, merging your edits
         [--merge]             On a conflict, write conflict markers instead of <file>.focsd-new
         [--force]             Allow going back to an older version
  remove <name…>               Delete copied files you have not edited

Options
  --help, -h                   This help
  --version, -v                The version

Other commands work from any subfolder: they use the nearest focsd.json above, up to the
repository root. Behavior, keyboard, ARIA and forms stay in @focsd/primitives (npm), so fixes
keep arriving. Commit focsd.json and .focsd/ so teammates can update too.`;

/** @param {string} text */
const out = (text) => process.stdout.write(`${text}\n`);

/**
 * @param {string} root
 * @param {Flags} values
 */
function initAgentCommand(root, values) {
  for (const line of agentInit(root, { templates, dir: values.dir, install: values.install })) out(line);
}

/**
 * @param {string} root
 * @param {string[]} names
 * @param {Flags} values
 */
function addBlockCommand(root, names, values) {
  if (values.overwrite) throw new CliError('--overwrite is not allowed with blocks: they never overwrite files.');

  const [name] = names;

  if (names.length !== 1 || !name) throw new CliError('Name one block: npx focsd add block dashboard');
  const { block, outDir, files } = addBlock(root, name, { out: values.out, blocksDir });
  out(`✓ Added block ${block.name} in ${outDir}/ (${files.length} files)`);

  if (block.packages.length) out(`Needs: npm install ${block.packages.join(' ')}`);
  out(`Open ${outDir}/index.html with a bundler or dev server that resolves bare imports (Vite, Parcel, webpack, or an import map).`);
}

/**
 * @typedef {{ dir?: string, install?: boolean, agent?: boolean, out?: string, blocks?: boolean, overwrite?: boolean, merge?: boolean, force?: boolean, all?: boolean }} Flags
 * @typedef {(root: string, names: string[], values: Flags) => void} Command
 */

/** @type {Record<string, Command>} */
const COMMANDS = {
  init(root, names, values) {
    if (values.agent) {
      initAgentCommand(root, values);

      return;
    }

    const state = init(root, { dir: values.dir, templates, install: values.install });
    out(`✓ focsd.json created: components go in ${state.dir}/`);
    out(
      values.install
        ? '✓ Runtime installed'
        : `Install the runtime once: ${installCommand(root, loadTemplates(templates).version)} (or run init --install)`,
    );
  },
  add(root, names, values) {
    if (names[0] === 'block') {
      addBlockCommand(root, names.slice(1), values);

      return;
    }

    if (values.out !== undefined) throw new CliError('--out only works with `add block <name>`.');

    if (!names.length) throw new CliError('Name at least one component: npx focsd add button');
    const result = add(root, names, { templates, overwrite: values.overwrite });
    out(`✓ Added ${result.tags.join(', ')}`);

    for (const warning of result.warnings) out(`! ${warning}`);
    out('Import them where you register components:');

    for (const line of result.importLines) out(`  ${line}`);
    out('Import your copies before @focsd/components (or instead of it): the first registration of a tag wins.');
    out(`Needs: ${installCommand(root, loadTemplates(templates).version)} (once)`);
  },
  list(root, names, values) {
    if (values.blocks) {
      for (const b of listBlocks(blocksDir)) out(`${b.name.padEnd(12)} ${b.title}: ${b.description}`);

      return;
    }

    for (const row of list(root, { templates }))
      out(`${row.added ? '✓' : ' '} ${row.tag.padEnd(28)} ${row.module}${row.via ? ` (with ${row.via})` : ''}`);
  },
  diff(root, names, values) {
    const entries = diff(root, names, { templates, all: values.all });
    const shown = entries.filter((e) => e.local || e.upstream);

    if (!shown.length) out('No differences: your copies match what was delivered and this version.');

    for (const e of shown) {
      if (e.local) out(e.local);

      if (e.upstream) out(e.upstream);
    }
  },
  update(root, names, values) {
    const results = update(root, names, { templates, all: values.all, merge: values.merge, force: values.force });

    for (const r of results) out(`${r.file}: ${r.outcome}`);
    const held = results.filter((r) => r.outcome === 'kept-new' || r.outcome === 'conflict');

    if (held.length) out(`\n${held.length} file(s) need your attention: see <file>.focsd-new or the conflict markers.`);
    const notice = unusedNotice(results);

    if (notice) out(notice);
    const now = readState(root)?.version;
    const target = loadTemplates(templates).version;
    out(
      now === target
        ? `✓ Now at ${target}`
        : `focsd.json stays at ${now} until every component is at ${target}: resolve the files above, then run update again.`,
    );
  },
  remove(root, names) {
    const { removed, kept } = remove(root, names);
    out(`✓ Removed ${removed.length} file(s)`);

    if (kept.length) out(`Kept your edited files: ${kept.join(', ')}`);
  },
};

/**
 * The options each command reads. Any other option is refused, so a flag that would be ignored
 * (`focsd list --dir y`) fails instead of looking like it worked.
 * @type {Record<string, string[]>}
 */
const FLAGS = {
  init: ['dir', 'install', 'agent'],
  add: ['overwrite', 'out'],
  list: ['blocks'],
  diff: ['all'],
  update: ['all', 'merge', 'force'],
  remove: [],
};

/**
 * @param {string} command
 * @param {Flags} values
 */
function rejectStrayFlags(command, values) {
  const known = FLAGS[command] ?? [];
  const stray = Object.keys(values).find((flag) => !known.includes(flag));

  if (stray) throw new CliError(`--${stray} is not an option of "${command}". Run \`npx focsd --help\`.`);
}

/** @param {string[]} argv */
function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      dir: { type: 'string' },
      install: { type: 'boolean' },
      agent: { type: 'boolean' },
      out: { type: 'string' },
      blocks: { type: 'boolean' },
      overwrite: { type: 'boolean' },
      merge: { type: 'boolean' },
      force: { type: 'boolean' },
      all: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  const [command, ...names] = positionals;

  if (values.version) return out(version);

  if (values.help || !command) return out(HELP);

  const run = Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined;

  if (!run) throw new CliError(`Unknown command "${command}". Run \`npx focsd --help\`.`);

  rejectStrayFlags(command, values);

  return run(projectRoot(command), names, values);
}

/**
 * The project folder: the nearest one with focsd.json, from here up to the repository root (never
 * the home folder or above it; see findUp), so commands work from any subfolder. `init` always
 * works in the current folder.
 * @param {string} command
 */
function projectRoot(command) {
  const cwd = process.cwd();
  const found = command === 'init' ? null : findUp(cwd, STATE);

  if (found && found !== cwd) out(`Using ${relative(cwd, found) || '.'}/${STATE}; paths below are relative to it.`);

  return found ?? cwd;
}

// A reader that stops early (`focsd list | head`) is not an error: stop quietly.
process.stdout.on('error', (error) => {
  if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EPIPE') throw error;
  process.exit(process.exitCode ?? 0);
});

try {
  main(process.argv.slice(2));
} catch (error) {
  const known = error instanceof CliError || String(/** @type {{ code?: unknown }} */ (error)?.code ?? '').startsWith('ERR_PARSE_ARGS');
  process.stderr.write(
    `focsd: ${known && error instanceof Error ? error.message : error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
}
