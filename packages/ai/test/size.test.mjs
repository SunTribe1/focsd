// Size budgets (gzip, initial download) for the non-element parts of the package.
import { expect, it } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { gzipSizes } from '../../../scripts/lib/initial-size.mjs';

it.each([
  ['markdown', '../src/markdown/index.js', 3],
  ['chat controller and transports', '../src/chat/index.js', 2.5],
])('%s stays under %s KB gzip', async (_name, path, budgetKb) => {
  const { initial, lazy } = await gzipSizes(build, fileURLToPath(new URL(path, import.meta.url)));

  expect(initial).toBeLessThanOrEqual(budgetKb * 1024);
  expect(lazy).toBe(0);
});
