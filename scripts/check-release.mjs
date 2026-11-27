/**
 * Release configuration check (part of `pnpm check`). Every publishable package must:
 * - version in lockstep (the Changesets `fixed` group and the first-release changeset),
 * - be listed in VERSIONING.md,
 * - build before it is packed, when it has a build (its typings and manifests are generated),
 * - depend on third-party packages by range, not an exact version: an exact pin forces a second
 *   copy of Lit (or Tiptap…) into every app that has another patch version,
 * - give resolvers that predate `exports` (older bundlers, Jest's default resolver) the same entry:
 *   top-level `main`, `module` and `types` match the "." export's default and types,
 * - export no `./internal/*` subpath, apart from the named exceptions in lib/internal-exports.mjs.
 * Every package test runs its build, so the turbo `test` task waits for the package's own `build`
 * (two tasks writing dist/ at once race) and caches everything `build` writes.
 * When a package has been built, its `types/` holds no declaration without a source module (stale
 * typings, such as the pre-rename opn-* and ub-* files, would be published and resolve through
 * the `./*.js` export).
 */
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { internalExportProblems } from './lib/internal-exports.mjs';
import { readJson, readText, runScript } from './lib/read.mjs';
import { orphanTypings } from './lib/typings.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => readText(new URL(path, root));

/** Folders under packages/ that hold a package.json; a stray file or folder is ignored. */
function readPackages() {
  return readdirSync(new URL('packages/', root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(new URL(`packages/${entry.name}/package.json`, root)))
    .map((entry) => {
      const dir = fileURLToPath(new URL(`packages/${entry.name}/`, root));

      return { dir, pkg: readJson(`${dir}package.json`) };
    })
    .filter(({ pkg }) => !pkg.private);
}

/**
 * Top-level fields that disagree with the "." export (packages without one, like the CLI, have none).
 * @param {{ name: string, exports?: Record<string, { default?: string, types?: string }>, main?: string, module?: string, types?: string }} pkg
 */
function legacyEntry(pkg) {
  const entry = pkg.exports?.['.'];

  if (!entry?.default) return [];

  const expected = [
    ['main', entry.default],
    ['module', entry.default],
  ];

  if (entry.types) expected.push(['types', entry.types]);

  return expected.flatMap(([field, path]) =>
    pkg[field] === path ? [] : [`${pkg.name} needs "${field}": "${path}" for resolvers that ignore "exports"`],
  );
}

/** A test script that builds itself (B4 m77). */
const BUILDS = /\bpnpm (?:run )?build\b|\bnode (?:\S*\/)?build(?:-dist)?\.mjs\b/;

/**
 * Turbo runs `build` before `test`, so a test script never builds again: two writers on dist/ race
 * on a cold cache (cd31eea), and a test that builds would have to declare every build output.
 * @param {{ pkg: { name: string, scripts?: Record<string, string> } }[]} packages
 */
function turboProblems(packages) {
  const turbo = readJson(new URL('turbo.json', root)).tasks;

  return [
    ...(turbo.test.dependsOn.includes('build') ? [] : ['turbo.json: the test task must depend on "build"']),
    ...packages
      .filter(({ pkg }) => BUILDS.test(pkg.scripts?.test ?? ''))
      .map(({ pkg }) => `${pkg.name}: the test script builds; turbo's test task already depends on build`),
  ];
}

/**
 * @param {{ dir: string, pkg: any }} entry
 * @param {{ fixed: Set<string>, firstRelease: string, versioning: string }} release
 */
function packageProblems({ dir, pkg }, { fixed, firstRelease, versioning }) {
  return [
    ...(fixed.has(pkg.name) ? [] : [`${pkg.name} is not in the Changesets fixed group`]),
    // Before the first release every package must be in its changeset; after it, the changeset is consumed.
    ...(pkg.version !== '0.0.0' || firstRelease.includes(`'${pkg.name}'`)
      ? []
      : [`${pkg.name} is missing from .changeset/first-release.md`]),
    ...(versioning.includes(pkg.name) ? [] : [`${pkg.name} is not listed in VERSIONING.md`]),
    ...(pkg.scripts?.build && !pkg.scripts?.prepack ? [`${pkg.name} has a build but no prepack script`] : []),
    ...(pkg.exports && !pkg.exports['./package.json'] ? [`${pkg.name} needs "./package.json" in "exports" (tools read it)`] : []),
    ...Object.entries({ ...pkg.dependencies, ...pkg.peerDependencies })
      .filter(([name, range]) => !name.startsWith('@focsd/') && /^\d/.test(String(range)))
      .map(([name, range]) => `${pkg.name} pins ${name} to exactly ${range}; use a range such as ^${range}`),
    ...legacyEntry(pkg),
    ...internalExportProblems(pkg),
    ...orphanTypings(dir).map((file) => `${pkg.name}: ${file} has no source module (stale typings); rebuild the package`),
  ];
}

runScript(() => {
  const packages = readPackages();

  const release = {
    fixed: new Set(readJson(new URL('.changeset/config.json', root)).fixed.flat()),
    firstRelease: existsSync(new URL('.changeset/first-release.md', root)) ? read('.changeset/first-release.md') : '',
    versioning: read('VERSIONING.md'),
  };

  const problems = [...turboProblems(packages), ...packages.flatMap((entry) => packageProblems(entry, release))];

  if (problems.length) {
    console.error(`Release configuration:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    process.exitCode = 1;

    return;
  }

  console.log(`✓ release configuration covers ${packages.length} packages`);
});
