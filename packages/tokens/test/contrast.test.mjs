import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { loadTokens } from '../lib/load.mjs';
import { THEMES, fullSet } from '../lib/passes.mjs';
import { src, pkgRoot } from '../lib/paths.mjs';
import { checkContrast, colorMap, ratio } from '../lib/checks/contrast.mjs';

const spec = JSON.parse(await readFile(src('checks/contrast-pairs.json'), 'utf8'));
const oklch = (l, c, h, hex) => ({ colorSpace: 'oklch', components: [l, c, h], hex });
const black = oklch(0, 0, 0, '#000000');
const white = oklch(1, 0, 0, '#ffffff');

describe('ratio', () => {
  it('black on white is 21:1', () => {
    expect(ratio(black, white)).toBeCloseTo(21, 1);
  });
});

describe('checkContrast', () => {
  it.each(THEMES)('%s theme passes every declared pair', async (theme) => {
    const colors = colorMap(await loadTokens(fullSet(theme, 'comfortable')));
    expect(checkContrast(theme, colors, spec)).toEqual([]);
  });

  it('reports a failing pair with its ratio', () => {
    const grey = oklch(0.7, 0, 0, '#a0a0a0');

    const colors = new Map([
      ['ink', grey],
      ['ground', white],
    ]);

    const errors = checkContrast('test', colors, { pairs: [{ fg: ['ink'], bg: ['ground'], min: 4.5 }] });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^test: ink on ground is \d+\.\d\d:1, needs 4\.5:1$/);
  });

  it('anyOf passes when one ring color contrasts, fails when none do', () => {
    const pale = oklch(0.97, 0, 0, '#f4f4f4');
    const rule = { pairs: [], anyOf: [{ fg: ['a', 'b'], bg: ['bg'], min: 3 }] };
    expect(
      checkContrast(
        't',
        new Map([
          ['a', pale],
          ['b', black],
          ['bg', white],
        ]),
        rule,
      ),
    ).toEqual([]);
    expect(
      checkContrast(
        't',
        new Map([
          ['a', pale],
          ['b', pale],
          ['bg', white],
        ]),
        rule,
      ),
    ).toEqual(['t: none of a, b reaches 3:1 on bg']);
  });

  it('throws on a misspelled color name', () => {
    expect(() => checkContrast('t', new Map(), { pairs: [{ fg: ['inc'], bg: ['ground'], min: 4.5 }] })).toThrow(
      'Contrast rule names unknown color "inc" (theme t)',
    );
  });
});

describe('check-all script', () => {
  it('exits 0 on the real sources', () => {
    const out = execFileSync('node', ['scripts/check-all.mjs'], { cwd: pkgRoot, encoding: 'utf8' });
    expect(out).toContain('token checks passed');
  });
});
