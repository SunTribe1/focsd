// Every element module defines its element through `defineElement()` from
// `@focsd-dev/primitives/internal` (quality m34): a second copy of the module skips the define instead of
// throwing. The guard's "already defined" branch never runs in one page, so the helper carries the
// one `v8 ignore next` comment: without it, the end-to-end branch floor for the package fails
// (apps/playground/scripts/check-coverage.mjs).
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = new URL('../src/', import.meta.url);
const DEFINE = /^defineElement\('(focsd-[a-z-]+)', \w+\);$/m;

const modules = readdirSync(src)
  .filter((f) => /^focsd-.*\.js$/.test(f))
  .map((f) => [f, readFileSync(new URL(f, src), 'utf8')]);

const helper = readFileSync(new URL('../../primitives/src/internal/define.js', import.meta.url), 'utf8');

describe('define guards (m34)', () => {
  it('finds the element modules', () => {
    expect(modules.length).toBeGreaterThan(100);
  });

  it('each element module defines its own tag through defineElement()', () => {
    // The grouped bundles (focsd-data.js and the like) only import element modules.
    const elements = modules.filter(([, text]) => /^defineElement\(/m.test(text));
    const wrong = elements.flatMap(([f, text]) => (text.match(DEFINE)?.[1] === f.replace(/\.js$/, '') ? [] : [f]));

    expect(elements.length).toBeGreaterThan(100);

    expect(wrong).toEqual([]);
  });

  it('no element module writes the guard out by hand', () => {
    expect(modules.flatMap(([f, text]) => (/customElements\.(get|define)\(/.test(text) ? [f] : []))).toEqual([]);
  });

  it('the helper excludes its guard from coverage', () => {
    expect(helper).toMatch(/\/\* v8 ignore next -- [^\n]*\*\/\n\s*if \(!registry\.get\(tag\)\)/);
  });
});
