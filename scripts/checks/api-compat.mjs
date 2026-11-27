/**
 * API-compat check (Ruling R4 of wave 20). Compares each package's `custom-elements.json` with the
 * baseline `api/<package dir>.cem.json` that `scripts/api-baseline.mjs` writes after a publish.
 *
 * A break is a removed element, attribute, property, event, slot, part, CSS property or method, a
 * narrowed type union (named type aliases are resolved from the typings), a newly required
 * attribute, or a name an entry point (`.`, `./utils`, …) no longer exports. It fails unless a
 * changeset bumps the package `major` and has a line starting `**Breaking**`. Without an `api/` folder (before the first publish)
 * the check is inactive and passes; with one, a package that has a baseline but no built manifest
 * fails ("run pnpm build"). A package whose version is past its baseline's version (after
 * `changeset version` consumed the changesets, before the publish refreshes the baseline) is skipped.
 *
 * A union widened to `string`, `any`, `unknown` or to a type alias the typings do not define is
 * accepted, and members starting with `_` are not public API.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { typedApi } from '../lib/dts-api.mjs';
import { readJson, readText } from '../lib/read.mjs';

/** Type members that never make a union narrower when dropped. */
const IGNORED_MEMBERS = new Set(['undefined', 'null']);

/** Types that accept every member of a narrower union. */
const OPEN_TYPES = new Set(['string', 'any', 'unknown']);

/** The kinds of named item an element declares, with the label used in messages. */
const NAMED = /** @type {const} */ ([
  ['events', 'event'],
  ['slots', 'slot'],
  ['parts', 'part'],
  ['cssProperties', 'CSS property'],
  ['methods', 'method'],
]);

/**
 * Split a TypeScript union at its top level.
 * @param {string | undefined} text
 * @returns {string[]}
 */
export function unionMembers(text) {
  if (!text) return [];
  const members = [];
  let depth = 0;
  let current = '';

  for (const char of text) {
    if ('<([{'.includes(char)) depth += 1;

    if ('>)]}'.includes(char)) depth -= 1;

    if (char === '|' && depth === 0) {
      members.push(current.trim());
      current = '';
    } else current += char;
  }

  return [...members, current.trim()].filter((member) => member && !IGNORED_MEMBERS.has(member));
}

/** @param {{ name: string }[] | undefined} list */
const byName = (list = []) => Object.fromEntries(list.map((item) => [item.name, item]));

/**
 * The public API of every custom element in a manifest, keyed by tag name.
 * @param {any} manifest
 * @returns {Record<string, any>}
 */
export function extractApi(manifest) {
  const declarations = (manifest.modules ?? []).flatMap((module) => module.declarations ?? []);

  const isPublic = (/** @type {any} */ member) =>
    member.privacy !== 'private' && member.privacy !== 'protected' && !/^[#_]/.test(member.name);

  return Object.fromEntries(
    declarations
      .filter((declaration) => declaration.customElement && declaration.tagName)
      .map((declaration) => {
        const members = (declaration.members ?? []).filter(isPublic);

        return [
          declaration.tagName,
          {
            attributes: byName(declaration.attributes),
            properties: byName(members.filter((member) => member.kind === 'field' && !member.static)),
            methods: byName(members.filter((member) => member.kind === 'method')),
            events: byName(declaration.events),
            slots: byName(declaration.slots),
            parts: byName(declaration.cssParts),
            cssProperties: byName(declaration.cssProperties),
          },
        ];
      }),
  );
}

/**
 * A union's members with type aliases replaced by their own members (`Size` → `'s' | 'm' | 'l'`).
 * @param {string | undefined} text
 * @param {Record<string, string>} aliases
 * @param {number} [depth]
 * @returns {string[]}
 */
export function resolvedMembers(text, aliases, depth = 0) {
  return unionMembers(text).flatMap((member) =>
    depth < 5 && Object.hasOwn(aliases, member) ? resolvedMembers(aliases[member], aliases, depth + 1) : [member],
  );
}

/**
 * Types in `before` that `after` no longer accepts.
 * @param {any} before
 * @param {any} after
 * @param {{ before: Record<string, string>, after: Record<string, string> }} aliases
 * @returns {string[]}
 */
const dropped = (before, after, aliases) => {
  const was = resolvedMembers(before?.type?.text, aliases.before);
  const now = resolvedMembers(after?.type?.text, aliases.after);
  const kept = new Set(now);

  // An alias the typings do not define (`Size` from elsewhere) cannot be compared, so it is trusted.
  const open = now.some((member) => OPEN_TYPES.has(member) || (/^[A-Z][\w.]*$/.test(member) && !was.includes(member)));

  return after?.type?.text && !open ? was.filter((member) => !kept.has(member)) : [];
};

/**
 * @param {string} tag
 * @param {string} label
 * @param {{ before: Record<string, any>, after: Record<string, any>, aliases: { before: Record<string, string>, after: Record<string, string> } }} sides
 * @returns {string[]}
 */
function diffTyped(tag, label, { before, after, aliases }) {
  return Object.entries(before).flatMap(([name, item]) => {
    if (!after[name]) return [`${tag}: ${label} \`${name}\` was removed`];

    return dropped(item, after[name], aliases).map((member) => `${tag}: ${label} \`${name}\` no longer accepts ${member}`);
  });
}

/**
 * Every break between two extracted APIs, as plain sentences.
 * @param {Record<string, any>} before
 * @param {Record<string, any>} after
 * @param {{ before: Record<string, string>, after: Record<string, string> }} [aliases] Type aliases of each side.
 * @returns {string[]}
 */
export function diffApi(before, after, aliases = { before: {}, after: {} }) {
  return Object.entries(before).flatMap(([tag, old]) => {
    const now = after[tag];

    if (!now) return [`element \`${tag}\` was removed`];

    const typed = [
      ...diffTyped(tag, 'attribute', { before: old.attributes, after: now.attributes, aliases }),
      ...diffTyped(tag, 'property', { before: old.properties, after: now.properties, aliases }),
    ];

    const named = NAMED.flatMap(([group, label]) =>
      Object.keys(old[group])
        .filter((name) => !now[group][name])
        .map((name) => `${tag}: ${label} \`${name}\` was removed`),
    );

    const required = Object.entries(now.attributes)
      .filter(([name, attribute]) => /** @type {any} */ (attribute).required && !old.attributes[name]?.required)
      .map(([name]) => `${tag}: attribute \`${name}\` is now required`);

    return [...typed, ...named, ...required];
  });
}

/**
 * Names an entry point no longer exports, and entry points that were removed.
 * @param {Record<string, string[]>} before
 * @param {Record<string, string[]>} after
 * @returns {string[]}
 */
export function diffExports(before, after) {
  return Object.entries(before).flatMap(([subpath, names]) => {
    const now = after[subpath];

    if (!now) return [`entry point \`${subpath}\` was removed`];
    const kept = new Set(now);

    return names.filter((name) => !kept.has(name)).map((name) => `\`${subpath}\` no longer exports \`${name}\``);
  });
}

/**
 * Names of the packages that a pending changeset bumps `major` and marks with a `**Breaking**` line.
 * @param {string} root
 * @returns {Set<string>}
 */
export function breakingPackages(root) {
  const dir = join(root, '.changeset');
  const names = new Set();

  if (!existsSync(dir)) return names;

  for (const file of readdirSync(dir).filter((name) => name.endsWith('.md') && name !== 'README.md')) {
    const [, front = '', body = ''] = readText(join(dir, file)).split(/^---\s*$/m);

    if (!/^\*\*Breaking\*\*/m.test(body)) continue;

    for (const match of front.matchAll(/^\s*['"]?([^'":\s]+)['"]?\s*:\s*['"]?major\b/gm)) names.add(match[1]);
  }

  return names;
}

/**
 * Whether version `a` is greater than `b` (major.minor.patch; a pre-release tag counts as lower).
 * @param {string} a
 * @param {string} b
 */
export function isNewer(a, b) {
  const parts = (/** @type {string} */ v) => v.split(/[.-]/).slice(0, 3).map(Number);
  const [x, y] = [parts(a), parts(b)];
  const index = x.findIndex((n, i) => n !== y[i]);

  if (index !== -1) return x[index] > y[index];

  return !a.includes('-') && b.includes('-');
}

/**
 * A baseline file: `{ name, version, manifest, exports, aliases }` as `api-baseline.mjs` writes it, or a bare manifest.
 * @param {string} path
 * @returns {{ version: string | null, manifest: any }}
 */
function readBaseline(path) {
  const data = readJson(path);

  return data.manifest
    ? { version: data.version ?? null, manifest: data.manifest, exports: data.exports ?? {}, aliases: data.aliases ?? {} }
    : { version: null, manifest: data, exports: {}, aliases: {} };
}

/**
 * @param {string} root Repository root.
 * @returns {{ code: number, lines: string[] }}
 */
export function run(root) {
  const packagesDir = join(root, 'packages');
  const apiDir = join(root, 'api');

  if (!existsSync(apiDir)) return { code: 0, lines: ['api-compat: inactive (no api/ baseline folder)'] };

  /** @type {string[]} */
  const notes = [];
  /** @type {string[]} */
  const missing = [];

  const checked = readdirSync(packagesDir)
    .filter((dir) => existsSync(join(apiDir, `${dir}.cem.json`)))
    .flatMap((dir) => {
      const pkg = readJson(join(packagesDir, dir, 'package.json'));
      const { name, version } = pkg;
      const base = readBaseline(join(apiDir, `${dir}.cem.json`));
      const manifest = join(packagesDir, dir, 'custom-elements.json');

      if (base.version && version && isNewer(version, base.version)) {
        notes.push(`  ${name}: skipped, version ${version} is past the baseline ${base.version} (not yet published)`);

        return [];
      }

      if (!existsSync(manifest)) {
        missing.push(`  packages/${dir}/custom-elements.json is missing: run \`pnpm build\` first`);

        return [];
      }

      const typed = typedApi(join(packagesDir, dir), pkg);

      const problems = [
        ...diffApi(extractApi(base.manifest), extractApi(readJson(manifest)), { before: base.aliases, after: typed.aliases }),
        ...diffExports(base.exports, typed.exports),
      ];

      return [{ dir, name, problems }];
    });

  if (missing.length) return { code: 1, lines: ['api-compat: a published baseline has no manifest to compare with:', ...missing] };

  const allowed = breakingPackages(root);
  const failing = checked.filter((item) => item.problems.length > 0 && !allowed.has(item.name));

  if (failing.length === 0)
    return { code: 0, lines: [`✓ api-compat: ${checked.length} package(s) compared with their published baseline`, ...notes] };

  return {
    code: 1,
    lines: [
      'api-compat: breaking API changes without a major changeset with a line starting `**Breaking**`:',
      ...failing.flatMap((item) => [`  ${item.name}`, ...item.problems.map((problem) => `    - ${problem}`)]),
      ...notes,
    ],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run(fileURLToPath(new URL('../../', import.meta.url)));

  for (const line of result.lines) (result.code ? console.error : console.log)(line);
  process.exitCode = result.code;
}
