import { expect, test } from 'vitest';
import { typingsProblems } from '../../../scripts/lib/typings.mjs';

/** chart.js reactive state still published; chart.js belongs to batch B1, and B14 tags it @internal. */
const DEBT = { 'types/chart.d.ts': 3 };

test('the built typings are clean: no stale file, no internal member beyond the recorded debt', () => {
  expect(typingsProblems(new URL('../', import.meta.url).pathname, DEBT)).toEqual([]);
});
