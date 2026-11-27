// Docs prose and examples name events by their current names (docs/events.md): no event renamed in
// quality batch B9 may appear under its old name, and a native name never carries a detail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const OLD = [
  'select',
  'sort',
  'remove',
  'move',
  'open',
  'command',
  'point-focus',
  'sort-change',
  'filter-change',
  'search-change',
  'column-change',
  'group-change',
  'selection-change',
  'page-change',
  'row-activate',
  'cell-edit',
  'state-change',
];

const names = OLD.join('|');

const PATTERNS = [
  // "fires `select`", "Fire `remove`", "firing `sort`"
  new RegExp(`\\b(fire|fires|fired|firing)\\b[^.\`]{0,20}\`(${names})\``, 'gi'),
  // "`point-focus` event", "`select` with `detail…`"
  new RegExp(`\`(${names})\` (event|with \`detail)`, 'gi'),
  // addEventListener('sort-change', …)
  new RegExp(`addEventListener\\(\\s*['"](${names})['"]`, 'g'),
  // a native name with a payload
  /`(input|change|toggle|close|cancel)` with `detail/gi,
];

const repo = new URL('../../../', import.meta.url).pathname;
const roots = ['../src/data', '../src/content', '../../../docs/a11y'].map((p) => new URL(p, import.meta.url).pathname);

/** @param {string} dir */
const files = (dir) =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' }).flatMap((f) => (/\.(js|mdx?|astro)$/.test(f) ? [join(dir, f)] : []));

test('docs name every event by its focsd-* or native name', () => {
  const hits = roots.flatMap(files).flatMap((file) => {
    const text = readFileSync(file, 'utf8');

    return PATTERNS.flatMap((re) => [...text.matchAll(re)].map((m) => `${relative(repo, file)}: ${m[0]}`));
  });

  assert.deepEqual(hits, []);
});
