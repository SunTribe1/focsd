import { expect, test } from 'vitest';
import { typingsProblems } from '../../../scripts/lib/typings.mjs';

test('the built typings are clean: no stale file, no internal member', () => {
  expect(typingsProblems(new URL('../', import.meta.url).pathname)).toEqual([]);
});
