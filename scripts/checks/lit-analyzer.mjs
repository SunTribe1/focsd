/**
 * Lit template check (part of `pnpm check`, audit F9): runs `lit-analyzer` over the Lit sources of every
 * package that ships elements, after `pnpm build` (the `check:lit` script builds them first).
 *
 * The analyzer cannot see `defineElement('focsd-x', FocsdX)` registrations, and it reads Lit's
 * `static properties` only in the `static get properties()` form, so it learns our elements from what the
 * build generates from custom-elements.json instead:
 *
 * - `types/elements.d.ts` (the `HTMLElementTagNameMap` entries): tag names, properties and their types;
 * - `vscode.html-custom-data.json`: attributes. The generator writes `values: []` for an attribute without
 *   a fixed set of values, which the analyzer would read as an impossible type, so those are dropped
 *   from a temporary copy.
 *
 * The configuration lives here, written into a temporary tsconfig.json (the analyzer reads its options
 * from the `ts-lit-plugin` entry of the tsconfig in its working directory). Nothing is written to the repo.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

/** Packages that ship elements. primitives has the headless bases (templates, no tags of its own). */
const ELEMENT_PACKAGES = ['ai', 'charts', 'components', 'data-grid', 'editor'];
const SOURCES = [...ELEMENT_PACKAGES, 'primitives'].map((pkg) => join(root, 'packages', pkg, 'src'));

/** Strict mode (every template rule on, as errors), tuned where the analyzer is wrong for this repo. */
const PLUGIN = {
  name: 'ts-lit-plugin',
  strict: true,
  rules: {
    // Its CSS data predates nesting, @container, @starting-style, anchor positioning, forced-color-adjust
    // and field-sizing, so most of what it reports is valid CSS.
    'no-invalid-css': 'off',
    // Elements register through their own modules and the package entry points, often imported by a
    // sibling or by the page, not by the module whose template uses the tag. The e2e suite proves each
    // element renders.
    'no-missing-import': 'off',
    // lit-analyzer 2.0.3 types Lit 3's `nothing` as an unknown symbol, so every `${value || nothing}`
    // attribute binding (Lit's own idiom) reports, as does `aria-expanded=${String(open)}` and the ARIA
    // 1.2 roles missing from its data (role="meter"). tsc (checkJs) types the expressions themselves.
    'no-incompatible-type-binding': 'off',
  },
  // HTML attributes newer than the analyzer's HTML data.
  globalAttributes: ['aria-description', 'capture', 'fetchpriority', 'inert', 'popover', 'webkitdirectory'],
};

/**
 * A copy of a package's VS Code HTML data without empty `values` lists.
 * @param {string} pkg
 * @param {string} dir
 * @returns {string}
 */
function htmlData(pkg, dir) {
  const source = join(root, 'packages', pkg, 'vscode.html-custom-data.json');
  const data = JSON.parse(readFileSync(source, 'utf8'));

  const tags = data.tags.map((tag) => ({
    ...tag,
    attributes: (tag.attributes ?? []).map(({ values, ...attr }) => (values?.length ? { ...attr, values } : attr)),
  }));

  const file = join(dir, `${pkg}.html-data.json`);

  writeFileSync(file, JSON.stringify({ ...data, tags }));

  return file;
}

const missing = ELEMENT_PACKAGES.flatMap((pkg) =>
  ['types/elements.d.ts', 'vscode.html-custom-data.json'].flatMap((file) => {
    const path = join('packages', pkg, file);

    return existsSync(join(root, path)) ? [] : [path];
  }),
);

if (missing.length) {
  console.error(`lit-analyzer: build first (pnpm build). Missing:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'focsd-lit-analyzer-'));

try {
  const compilerOptions = {
    allowJs: true,
    noEmit: true,
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'es2022',
    skipLibCheck: true,
    plugins: [{ ...PLUGIN, customHtmlData: ELEMENT_PACKAGES.map((pkg) => htmlData(pkg, dir)) }],
  };

  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions }));

  // Globs take forward slashes on every platform.
  const inputs = [
    ...SOURCES.map((src) => `${src}/**/*.js`),
    ...ELEMENT_PACKAGES.map((pkg) => join(root, 'packages', pkg, 'types/elements.d.ts')),
  ].map((path) => path.replaceAll('\\', '/'));

  const bin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'lit-analyzer.cmd' : 'lit-analyzer');

  const { status, error } = spawnSync(bin, ['--maxWarnings', '0', ...inputs], {
    cwd: dir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (error) throw error;
  process.exitCode = status ?? 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
