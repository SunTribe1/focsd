import { expect, test } from 'vitest';
import { typingsProblems } from '../../../scripts/lib/typings.mjs';

/** grid.js reactive state still published; grid.js belongs to batch B1, and B14 tags it @internal. */
const DEBT = { 'types/grid.d.ts': 7 };

test('the built typings are clean: no stale file, no internal member beyond the recorded debt', () => {
  expect(typingsProblems(new URL('../', import.meta.url).pathname, DEBT)).toEqual([]);
});
