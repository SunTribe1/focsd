/**
 * Component counts check (part of `pnpm check`, Ruling R34). The catalogue
 * (docs/components-catalogue.md) is the source of truth: the docs home page renders
 * `components.length` from it, and the plain-text files below must say the same number wherever
 * they write "<n> components" (a few words may sit between, as in "87 accessible,
 * framework-agnostic components").
 */
import process from 'node:process';
import { readText, runScript } from './lib/read.mjs';

const root = new URL('../', import.meta.url);

/**
 * Files that state the component count in plain text. The docs landing (apps/docs/src/pages/index.astro)
 * reads the count from the catalogue at build time, so it cannot disagree.
 */
const FILES = ['README.md', 'packages/components/CHANGELOG.md', 'DESIGN.md'];

/** A catalogue row: `| 12 | Name | ...`. */
const ROW = /^\| \d+ \|/;

/** "<n> components", allowing up to three words (with commas or hyphens) in between. */
const PHRASE = /\b(\d+)\s+(?:[A-Za-z-]+,?\s+){0,3}?components\b/g;

/**
 * @param {string} text
 * @returns {number}
 */
export const catalogueCount = (text) => text.split('\n').filter((line) => ROW.test(line.trim())).length;

/**
 * Each "<n> components" phrase in `text` whose number is not `expected`.
 * @param {string} text
 * @param {number} expected
 * @returns {{ line: number, found: number }[]}
 */
export function wrongCounts(text, expected) {
  return text
    .split('\n')
    .flatMap((line, index) =>
      [...line.matchAll(PHRASE)].flatMap((match) => (Number(match[1]) === expected ? [] : [{ line: index + 1, found: Number(match[1]) }])),
    );
}

runScript(() => {
  const expected = catalogueCount(readText(new URL('docs/components-catalogue.md', root)));

  const problems = FILES.flatMap((file) =>
    wrongCounts(readText(new URL(file, root)), expected).map(({ line, found }) => `${file}:${line} says ${found} components`),
  );

  if (problems.length) {
    console.error(`Component counts disagree with the catalogue (${expected} components):\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    process.exitCode = 1;

    return;
  }

  console.log(`✓ counts match the catalogue (${expected} components)`);
});
