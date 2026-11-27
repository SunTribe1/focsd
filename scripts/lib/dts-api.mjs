/**
 * The public API that a package's built typings (`types/**.d.ts`) describe, for the API-compat
 * check: the names each public entry point exports, and the package's type aliases so a union
 * written as an alias (`Size`) can be compared member by member.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * The public entry points that have typings: `{ './utils': '<abs path>/types/utils.d.ts', … }`.
 * Wildcard subpaths (`./styles/*.js`) are left out.
 * @param {string} dir The package folder.
 * @param {any} pkg Its package.json.
 * @returns {Record<string, string>}
 */
export function typedEntries(dir, pkg) {
  return Object.fromEntries(
    Object.entries(pkg.exports ?? {})
      .filter(([subpath, value]) => !subpath.includes('*') && value?.types?.constructor === String)
      .map(([subpath, value]) => [subpath, resolve(dir, value.types)])
      .filter(([, file]) => existsSync(file)),
  );
}

/** @param {string} from @param {string} specifier */
const declarationFile = (from, specifier) => resolve(dirname(from), specifier.replace(/\.js$/, '.d.ts'));

/**
 * The names a declaration file exports, following `export * from` and re-exports. Type-only
 * exports count: removing one breaks a TypeScript user.
 * @param {string} file
 * @param {Set<string>} [seen]
 * @returns {string[]}
 */
export function exportedNames(file, seen = new Set()) {
  if (seen.has(file) || !existsSync(file)) return [];
  seen.add(file);
  const text = readFileSync(file, 'utf8');
  const names = new Set();

  for (const [, list] of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const item of list.split(',')) {
      const name = item
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)
        .at(-1)
        ?.trim();

      if (name) names.add(name);
    }
  }

  for (const [, name] of text.matchAll(
    /export\s+(?:declare\s+)?(?:abstract\s+)?(?:function|const|let|var|class|type|interface|enum)\s+([\w$]+)/g,
  ))
    names.add(name);

  if (/export\s+default\b/.test(text)) names.add('default');

  for (const [, specifier] of text.matchAll(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g)) {
    for (const name of exportedNames(declarationFile(file, specifier), seen)) names.add(name);
  }

  return [...names].toSorted();
}

/**
 * @param {string} dir
 * @returns {string[]} Every `.d.ts` file under `dir`.
 */
function declarationFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) return declarationFiles(path);

    return entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

const OPEN = '{[(';
const CLOSE = '}])';

/**
 * The text of an alias body that starts at `start`, up to the `;` that ends it: one outside every
 * bracket, so an object type's own `;` separators stay in.
 * @param {string} text
 * @param {number} start
 * @returns {string}
 */
export function aliasBody(text, start) {
  let depth = 0;
  let end = start;

  for (; end < text.length; end += 1) {
    const char = text.charAt(end);

    if (OPEN.includes(char)) depth += 1;
    else if (CLOSE.includes(char)) depth -= 1;
    else if (char === ';' && depth <= 0) break;
  }

  return text.slice(start, end).replaceAll(/\s+/g, ' ').trim();
}

/**
 * The package's type aliases, `{ Size: "'s' | 'm' | 'l'" }`, from every file in its `types/` folder.
 * @param {string} dir The package folder.
 * @returns {Record<string, string>}
 */
export function typeAliases(dir) {
  /** @type {Record<string, string>} */
  const aliases = {};

  for (const file of declarationFiles(join(dir, 'types'))) {
    const text = readFileSync(file, 'utf8');

    for (const match of text.matchAll(/export\s+type\s+([\w$]+)\s*(?:<[^=]*>)?\s*=\s*/g)) {
      const [whole, name = ''] = match;

      aliases[name] ??= aliasBody(text, match.index + whole.length);
    }
  }

  return aliases;
}

/**
 * A package's typed API for the baseline: the exported names per entry point, and its aliases.
 * @param {string} dir The package folder.
 * @param {any} pkg Its package.json.
 * @returns {{ exports: Record<string, string[]>, aliases: Record<string, string> }}
 */
export function typedApi(dir, pkg) {
  const entries = typedEntries(dir, pkg);

  return {
    exports: Object.fromEntries(Object.entries(entries).map(([subpath, file]) => [subpath, exportedNames(file)])),
    aliases: typeAliases(dir),
  };
}
