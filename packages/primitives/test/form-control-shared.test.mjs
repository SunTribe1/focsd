// Quality batch B8: the list-step helpers every listbox shares, and the select-base.js split.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { stepIndex } from '../src/internal/options.js';
import { edgeIndex, nextIndex } from '../src/internal/roving.js';

const none = () => false;
const all = () => true;

describe('stepIndex (aria-activedescendant lists)', () => {
  it.each([
    // [title, current, delta, count, disabled, expected]
    ['Down from no active option is the first', -1, 1, 4, none, 0],
    ['Up from no active option is the last', -1, -1, 4, none, 3],
    ['Down from the last wraps to the first', 3, 1, 4, none, 0],
    ['Up from the first wraps to the last', 0, -1, 4, none, 3],
    ['Down skips disabled options', 0, 1, 4, (i) => i === 1, 2],
    ['Up from nothing skips a disabled last option', -1, -1, 4, (i) => i === 3, 2],
    ['an index left out of range by filtering restarts at the edge (Down)', 7, 1, 3, none, 0],
    ['an index left out of range by filtering restarts at the edge (Up)', 7, -1, 3, none, 2],
    ['every option disabled, from nothing: none', -1, 1, 3, all, -1],
    ['every option disabled, from an option: stays', 1, 1, 3, all, 1],
    ['an empty list: none', -1, 1, 0, none, -1],
    ['an empty list with a stale index: none', 2, -1, 0, none, -1],
  ])('%s', (_title, ...[current, delta, count, disabled, expected]) => {
    expect(stepIndex(current, delta, count, disabled)).toBe(expected);
  });

  it('agrees with nextIndex and edgeIndex inside the list', () => {
    const disabled = (/** @type {number} */ i) => i % 3 === 1;

    for (let i = 0; i < 6; i += 1)
      for (const d of /** @type {const} */ ([1, -1])) expect(stepIndex(i, d, 6, disabled)).toBe(nextIndex(i, d, 6, disabled));
    expect(stepIndex(-1, 1, 6, disabled)).toBe(edgeIndex('first', 6, disabled));
    expect(stepIndex(-1, -1, 6, disabled)).toBe(edgeIndex('last', 6, disabled));
  });
});

describe('select-base.js split (Q32)', () => {
  const src = (/** @type {string} */ path) => new URL(`../src/${path}`, import.meta.url);

  it('select-base.js is under the 800-line maximum', () => {
    expect(readFileSync(src('select/select-base.js'), 'utf8').split('\n').length).toBeLessThan(800);
  });

  it('the option classes have their own modules, and inputs/date-utils.js is gone', () => {
    expect(existsSync(src('select/option-base.js'))).toBe(true);
    expect(existsSync(src('select/option-group-base.js'))).toBe(true);
    expect(existsSync(src('inputs/date-utils.js'))).toBe(false);
  });
});
