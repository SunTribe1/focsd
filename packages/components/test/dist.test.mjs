// dist/ ships the source as written: open-wc ("Do not minify") and Lit ("Don't bundle, minify, or
// optimize") leave optimizing to the application's build (audit F5). scripts/build-dist.mjs copies src/
// to dist/ file for file, and these tests hold it to an exact copy.
import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { stripCssComments } from '../../../scripts/lib/strip-css-comments.mjs';

const packages = fileURLToPath(new URL('../../', import.meta.url));
const script = fileURLToPath(new URL('../../../scripts/build-dist.mjs', import.meta.url));

/** Every file under `dir`, relative, sorted. */
const listFiles = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1))
    .toSorted();

/** What dist/ should hold for a src/ file: the same bytes, with comments in `css` templates removed from JavaScript. */
const expected = (path) => (path.endsWith('.js') ? Buffer.from(stripCssComments(readFileSync(path, 'utf8'))) : readFileSync(path));

/** Fails naming every file that is missing, extra or not as built. */
function expectCopy(src, dist) {
  const files = listFiles(src);

  expect(listFiles(dist)).toEqual(files);
  expect(files.filter((file) => !readFileSync(join(dist, file)).equals(expected(join(src, file))))).toEqual([]);
}

describe('build-dist', () => {
  test('copies src/ to dist/, removing only the comments inside css templates', () => {
    const root = mkdtempSync(join(tmpdir(), 'focsd-dist-'));

    try {
      mkdirSync(join(root, 'src/styles'), { recursive: true });
      writeFileSync(join(root, 'src/index.js'), 'export const s = css`\n  /* note */\n  a {\n    color: red;\n  }\n`;\n');
      writeFileSync(join(root, 'src/styles/motion.js'), 'export const m = unsafeCSS(`\n  b { margin: 0 }\n`);\n');
      writeFileSync(join(root, 'src/data.json'), '{ "a": 1 }\n');
      // A stale file from an earlier build is removed.
      mkdirSync(join(root, 'dist'));
      writeFileSync(join(root, 'dist/stale.js'), '');

      execFileSync(process.execPath, [script], { cwd: root, stdio: 'pipe' });

      expectCopy(join(root, 'src'), join(root, 'dist'));
      expect(readFileSync(join(root, 'dist/index.js'), 'utf8')).toBe('export const s = css`\n  a {\n    color: red;\n  }\n`;\n');
      expect(readFileSync(join(root, 'dist/styles/motion.js'), 'utf8')).toBe('export const m = unsafeCSS(`\n  b { margin: 0 }\n`);\n');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// Built before this suite runs (turbo: test depends on build and ^build).
describe.each(['components', 'primitives'])('@focsd-dev/%s dist/', (pkg) => {
  test('is a copy of src/ without the comments in css templates', () => {
    expectCopy(join(packages, pkg, 'src'), join(packages, pkg, 'dist'));
  });
});
