import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { edgeIndex, nextIndex } from '../src/internal/roving.js';
import { typeaheadIndex } from '../src/internal/typeahead.js';
import { uid } from '../src/internal/id.js';
import { floorCssText } from '../src/floor.styles.js';

const none = () => false;

describe('nextIndex', () => {
  it('moves forward and backward with wrapping', () => {
    expect(nextIndex(0, 1, 3, none)).toBe(1);
    expect(nextIndex(2, 1, 3, none)).toBe(0);
    expect(nextIndex(0, -1, 3, none)).toBe(2);
  });
  it('skips disabled items', () => {
    const disabled = (i) => i === 1;
    expect(nextIndex(0, 1, 3, disabled)).toBe(2);
    expect(nextIndex(2, -1, 3, disabled)).toBe(0);
  });
  it('returns the current index when every other item is disabled', () => {
    expect(nextIndex(1, 1, 3, (i) => i !== 1)).toBe(1);
  });
  it('returns -1 for an empty list', () => {
    expect(nextIndex(0, 1, 0, none)).toBe(-1);
  });
});

describe('edgeIndex', () => {
  it('finds the first and last enabled items', () => {
    const disabled = (i) => i === 0 || i === 4;
    expect(edgeIndex('first', 5, disabled)).toBe(1);
    expect(edgeIndex('last', 5, disabled)).toBe(3);
    expect(edgeIndex('first', 2, () => true)).toBe(-1);
  });
});

describe('typeaheadIndex', () => {
  const labels = ['Apple', 'Banana', 'blueberry', 'Cherry'];
  it('finds the next item starting with the character, case-insensitive, after the current one', () => {
    expect(typeaheadIndex(labels, 0, 'b', none)).toBe(1);
    expect(typeaheadIndex(labels, 1, 'b', none)).toBe(2);
    expect(typeaheadIndex(labels, 2, 'B', none)).toBe(1);
  });
  it('skips disabled items and returns -1 when nothing matches', () => {
    expect(typeaheadIndex(labels, 0, 'b', (i) => i === 1)).toBe(2);
    expect(typeaheadIndex(labels, 0, 'z', none)).toBe(-1);
  });
});

describe('uid', () => {
  it('returns unique ids with the given prefix', () => {
    const a = uid('focsd-x');
    const b = uid('focsd-x');
    expect(a).toMatch(/^focsd-x-\d+$/);
    expect(a).not.toBe(b);
  });
});

describe('floor styles', () => {
  it('match @focsd/tokens dist/floor.css exactly (run pnpm sync-floor after token changes)', async () => {
    const tokensFloor = await readFile(new URL('../node_modules/@focsd/tokens/dist/floor.css', import.meta.url), 'utf8');
    expect(floorCssText).toBe(tokensFloor);
  });
});
