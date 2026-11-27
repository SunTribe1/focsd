import { describe, expect, it } from 'vitest';
import { formatHex } from 'culori';
import { loadTokens } from '../lib/load.mjs';
import { src } from '../lib/paths.mjs';
import { checkGrades } from '../lib/checks/grades.mjs';
import { buildRefColors } from '../scripts/gen-ref-colors.mjs';

const refTokens = () => loadTokens({ source: [src('ref/*.json')] });

describe('reference colors', () => {
  it('src/ref/color.json matches the generator output (no hand edits)', async () => {
    const { readFile } = await import('node:fs/promises');
    const onDisk = JSON.parse(await readFile(src('ref/color.json'), 'utf8'));
    expect(onDisk).toEqual(buildRefColors());
  });

  it('every color round-trips from OKLCH to its exact DESIGN.md hex', async () => {
    const colors = (await refTokens()).filter((t) => t.type === 'color');
    expect(colors.length).toBe(54);

    for (const t of colors) {
      const [l, c, h] = t.value.components;
      expect(formatHex({ mode: 'oklch', l, c, h }), t.path.join('.')).toBe(t.value.hex);
    }
  });

  it('graded names match OKLCH lightness', async () => {
    expect(checkGrades(await refTokens())).toEqual([]);
  });
});

describe('checkGrades', () => {
  const tok = (family, step, l) => ({
    path: ['ref', 'color', family, step],
    type: 'color',
    value: { colorSpace: 'oklch', components: [l, 0, 0], hex: '#000000' },
    original: null,
    extensions: {},
  });

  it('accepts ±1 and exempts overlay and contrast families', () => {
    expect(checkGrades([tok('graphite', '21', 0.215), tok('overlay', 'ink-48', 0.21), tok('contrast', 'black', 0)])).toEqual([]);
  });
  it('flags a name that lies about its lightness', () => {
    expect(checkGrades([tok('graphite', '30', 0.21)])).toEqual(['ref.color.graphite.30: name says 30 but OKLCH lightness is 21']);
  });
});

describe('non-color reference tokens', () => {
  it('defines fonts, space, durations and easing', async () => {
    const names = (await refTokens()).map((t) => t.path.join('.'));
    expect(names).toEqual(
      expect.arrayContaining([
        'ref.font.atkinson-next',
        'ref.font.atkinson-mono',
        'ref.space.1',
        'ref.space.8',
        'ref.duration.100',
        'ref.duration.160',
        'ref.duration.240',
        'ref.ease.out',
        'ref.ease.in',
        'ref.ease.in-out',
      ]),
    );
  });
});
