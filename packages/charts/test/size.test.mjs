// Size budget (gzip) of `focsd-chart`, Lit and the shared primitives excluded (spec: wave 18,
// "focsd-chart total <= 13 KB", raised by 18b). Measured as in the other packages: one minified,
// code-split esbuild bundle of the entry, counting the entry chunk and its static imports.
import { expect, it } from 'vitest';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { gzipSizes } from '../../../scripts/lib/initial-size.mjs';

const KB = 1024;

/** Lit and the primitives are shared by every package: they are not the chart's cost. */
const shared = {
  name: 'shared-external',
  setup(/** @type {import('esbuild').PluginBuild} */ b) {
    b.onResolve({ filter: /^(lit|@lit\/|@lit-labs\/|@focsd-dev\/primitives)/ }, (args) => ({ path: args.path, external: true }));
  },
};

it('focsd-chart stays under 13 KB gzip (Lit and primitives excluded)', async () => {
  const entry = fileURLToPath(new URL('../src/index.js', import.meta.url));
  const { initial, lazy } = await gzipSizes(build, entry, [shared]);

  expect(initial).toBeGreaterThan(4 * KB); // a floor, so an empty bundle cannot pass
  expect(initial).toBeLessThanOrEqual(13 * KB);
  expect(lazy).toBe(0);
});

/** The chart element alone (the 13 KB row above is chart + sparkline + gauge). Measured 2026-11-25: 9,187 B (8,975 B before the wave 18 fix pass). */
it('focsd-chart alone stays under 10 KB gzip (Lit and primitives excluded)', async () => {
  const entry = fileURLToPath(new URL('../src/chart.js', import.meta.url));
  const { initial, lazy } = await gzipSizes(build, entry, [shared]);

  expect(initial).toBeGreaterThan(4 * KB);
  expect(initial).toBeLessThanOrEqual(10 * KB);
  expect(lazy).toBe(0);
});

/**
 * The whole package with Lit included, as one esbuild bundle. The arithmetic: Lit plus the shared
 * primitives are about 11.9 KB of it, the three elements about 11.2 KB. Before wave 18 the
 * bundle was about 18.6 KB under a 20 KB bound (7% slack); after it, 23.1 KB under 25 KB (8%); 23,553 B on 2026-11-25.
 * Growth of the primitives in other waves counts here, so a trip of this bound is first a question
 * about the primitives, not the charts.
 */
it('the chart package stays under 25 KB gzip (Lit included)', async () => {
  const entry = fileURLToPath(new URL('../src/index.js', import.meta.url));
  const result = await build({ entryPoints: [entry], bundle: true, minify: true, write: false, format: 'esm', logLevel: 'silent' });

  expect(gzipSync(result.outputFiles[0].contents).length).toBeLessThanOrEqual(25 * KB);
});

/**
 * The marginal cost of one small element: its own file, Lit and the shared primitives excluded.
 * 2026-11-25 (wave 18 fix pass): the shared guarded number format, the dropped-value and label
 * warnings and the single-value dot took the sparkline from 1,419 B to 1,732 B and the gauge from
 * 1,981 B to 2,106 B, so the sparkline row is raised from 1.5 to 1.75 KB and the gauge row from 2 to 2.25 KB.
 */
it.each([
  ['sparkline', 1.75],
  ['gauge', 2.25],
])('focsd-%s stays under its budget (%s KB gzip)', async (name, budget) => {
  const entry = fileURLToPath(new URL(`../src/${name}.js`, import.meta.url));
  const { initial, lazy } = await gzipSizes(build, entry, [shared]);

  expect(initial).toBeGreaterThan(0.5 * KB);
  expect(initial).toBeLessThanOrEqual(budget * KB);
  expect(lazy).toBe(0);
});
