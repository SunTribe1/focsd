// WCAG 1.4.11: every default chart series color (chart, sparkline, gauge) holds 3:1 against the
// ground and the surface, in every preset and theme. Reads the defaults from the charts source, so
// a changed default is checked without editing this test.
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTokens } from '../lib/load.mjs';
import { PRESETS, THEMES, presetSet } from '../lib/passes.mjs';
import { colorMap, ratio } from '../lib/checks/contrast.mjs';

const charts = (f) => readFile(new URL(`../../charts/src/${f}`, import.meta.url), 'utf8');

// `--_chart-N: var(--focsd-chart-N, var(--focsd-<token>))`: a preset may set the series; the fallback is the default.
const DEFAULT = /--_chart-(\d):\s*var\(--focsd-chart-\d,\s*var\(--focsd-([a-z-]+)\)\)/g;
const GROUNDS = ['ground', 'surface'];

/** @type {Map<string, string>} chart slot -> sys color */
let series;

beforeAll(async () => {
  series = new Map([...(await charts('styles.js')).matchAll(DEFAULT)].map(([, n, token]) => [n, token]));
});

describe('default series colors', () => {
  it('names six distinct colors for the chart', () => {
    expect([...series.keys()]).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(new Set(series.values()).size).toBe(6);
  });

  it.each(['sparkline.js', 'gauge.js'])('%s starts from the same first color as the chart', async (file) => {
    const own = [...(await charts(file)).matchAll(DEFAULT)].flatMap((m) => (m[1] === '1' ? [m[2]] : []));

    expect(own).toEqual([series.get('1')]);
  });

  it.each(PRESETS.flatMap((p) => THEMES.map((t) => [p, t])))(
    '%s %s: series 1 to 6 are 3:1 on ground and surface',
    async (preset, theme) => {
      const colors = colorMap(await loadTokens(presetSet(preset, theme)));
      const failures = [];

      for (const [n, token] of series) {
        for (const ground of GROUNDS) {
          const r = ratio(colors.get(token), colors.get(ground));

          if (r < 3) failures.push(`chart-${n} (${token}) on ${ground}: ${r.toFixed(2)}:1`);
        }
      }

      expect(failures).toEqual([]);
    },
  );
});
