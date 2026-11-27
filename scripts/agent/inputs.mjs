/**
 * Reads what the agent files are generated from, all build outputs or sources in the repository:
 * - the MCP catalogue data (packages/mcp/data/focsd.json), which already joins the custom elements
 *   manifests with the docs catalogue, examples, accessibility notes and keyboard tables;
 * - the custom elements manifests, for event types (the MCP data keeps event names only);
 * - JSDoc typedefs in the element packages' sources, to resolve named types like `CopyDetail`;
 * - the resolved token table (packages/tokens/dist/tokens.resolved.json).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseTypedefs } from './types.mjs';

/**
 * The nearest folder above this module that holds pnpm-workspace.yaml; found by walking up, so it
 * still works after Astro bundles this module into the docs build output (inside the repo).
 * @param {string} start
 * @returns {string}
 */
function findRoot(start) {
  for (let dir = start; ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;

    if (dirname(dir) === dir) throw new Error(`No pnpm-workspace.yaml above ${start}`);
  }
}

const root = pathToFileURL(`${findRoot(dirname(fileURLToPath(import.meta.url)))}/`);

/** The repository root, as a URL ending in `/`. */
export const repoRoot = root;

/** @param {string} path */
const read = (path) => readFileSync(new URL(path, root), 'utf8');

/** @param {string} path */
const json = (path) => JSON.parse(read(path));

/** Package folders under packages/ that publish a custom elements manifest. */
const manifestDirs = () =>
  readdirSync(new URL('packages/', root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(new URL(`packages/${entry.name}/custom-elements.json`, root)))
    .map((entry) => entry.name)
    .toSorted();

/** Every tagged declaration in the manifests, by tag. */
function readManifests() {
  /** @type {Map<string, any>} */
  const declarations = new Map();

  for (const dir of manifestDirs()) {
    for (const mod of json(`packages/${dir}/custom-elements.json`).modules) {
      for (const decl of mod.declarations ?? []) if (decl.tagName && !declarations.has(decl.tagName)) declarations.set(decl.tagName, decl);
    }
  }

  return declarations;
}

/**
 * Source files (`.js`) under a folder, recursively.
 * @param {string} dir Repository path ending in a slash.
 * @returns {string[]}
 */
function sources(dir) {
  if (!existsSync(new URL(dir, root))) return [];

  return readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return sources(`${dir}${entry.name}/`);

    return entry.name.endsWith('.js') ? [`${dir}${entry.name}`] : [];
  });
}

/** Typedefs from every package's sources; the first definition of a name wins. */
function readTypedefs() {
  /** @type {Map<string, string>} */
  const typedefs = new Map();
  const dirs = readdirSync(new URL('packages/', root), { withFileTypes: true }).filter((e) => e.isDirectory());

  for (const { name } of dirs) {
    for (const file of sources(`packages/${name}/src/`)) {
      for (const [key, text] of parseTypedefs(read(file))) if (!typedefs.has(key)) typedefs.set(key, text);
    }
  }

  return typedefs;
}

/**
 * @typedef {object} AgentInputs
 * @property {string} version
 * @property {string} site The docs site, no trailing slash.
 * @property {any[]} components MCP catalogue components (see @focsd-dev/mcp core's Component).
 * @property {Map<string, any>} cem Manifest declarations by tag.
 * @property {Map<string, string>} typedefs
 * @property {{ theme: string, density: string, name: string, css: string, value: string }[]} tokenRows
 */

/** @returns {AgentInputs} */
export function loadInputs() {
  const data = json('packages/mcp/data/focsd.json');

  return {
    version: data.version,
    site: json('packages/components/package.json').homepage.replace(/\/$/, ''),
    components: data.components,
    cem: readManifests(),
    typedefs: readTypedefs(),
    tokenRows: json('packages/tokens/dist/tokens.resolved.json'),
  };
}
