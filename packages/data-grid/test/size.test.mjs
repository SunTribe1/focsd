import { expect, it } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { gzipSizes } from '../../../scripts/lib/initial-size.mjs';

// 2026-11-27: status-chip and avatar cells bring focsd-tag and focsd-avatar: 43365 B, so 43 KB (accepted by the owner, 2026-11-27).
// 2026-11-27, 1.0 review items (signature terms in the shared term table, strict index checks): 44078 B, so 43.1 KB.
const BUDGET_KB = 43.1;

it(`the data grid stays under ${BUDGET_KB} KB gzip (Lit included)`, async () => {
  const entry = fileURLToPath(new URL('../src/index.js', import.meta.url));
  const { initial, lazy } = await gzipSizes(build, entry);

  expect(initial).toBeLessThanOrEqual(BUDGET_KB * 1024);
  // Lazily loaded code (only the icon sanitizer may be, B11) stays capped, as in components.
  expect(lazy).toBeLessThanOrEqual(1.75 * 1024);
});
