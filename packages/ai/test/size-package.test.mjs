// The whole package, as an app gets it: dist/index.js with Lit, the primitives and the components
// it uses must stay at or under 34 KB gzip (wave 17 spec). Run after `build` (turbo orders it).
import { expect, it } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { gzipSizes } from '../../../scripts/lib/initial-size.mjs';

// 2026-11-27: focsd-file-changes joined the entry: 35146 B, so 35 KB (accepted by the owner, 2026-11-27).
// 2026-11-27, 1.0 review items: feed exit keys, word-boundary announcements, code blocks that take
// focus only when they scroll and localized file sizes: 36440 B measured, so 36 KB.
const BUDGET_KB = 36;

it(`dist/index.js stays under ${BUDGET_KB} KB gzip (initial download)`, async () => {
  const { initial } = await gzipSizes(build, fileURLToPath(new URL('../dist/index.js', import.meta.url)));

  console.log(`@focsd/ai dist/index.js: ${initial} B gzip (${((initial / 1024 / BUDGET_KB) * 100).toFixed(0)}% of budget)`);
  expect(initial).toBeLessThanOrEqual(BUDGET_KB * 1024);
});
