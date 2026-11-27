import { describe, expect, it } from 'vitest';
import { figmaFiles, figmaValue } from '../lib/figma.mjs';

const row = (theme, density, name, value, hex) => {
  const r = { theme, density, name, css: `--focsd-${name}`, value };

  if (hex) r.hex = hex;

  return r;
};

describe('figmaValue', () => {
  it('converts colors to sRGB components with the hex fallback', () => {
    expect(figmaValue(row('light', 'default', 'ink', 'oklch(0% 0 0)', '#336699'))).toEqual({
      $type: 'color',
      $value: { colorSpace: 'srgb', components: [0.2, 0.4, 0.6], alpha: 1, hex: '#336699' },
    });
    expect(figmaValue(row('light', 'default', 'scrim', 'x', '#00000080')).$value.alpha).toBeCloseTo(0.502, 3);
    // The DTCG hex field is six digits; alpha travels in `alpha`.
    expect(figmaValue(row('light', 'default', 'scrim', 'x', '#00000080')).$value.hex).toBe('#000000');
  });

  it('converts rem and px lengths to px dimensions (Figma takes px only)', () => {
    expect(figmaValue(row('light', 'default', 'space-2', '0.5rem'))).toEqual({ $type: 'dimension', $value: { value: 8, unit: 'px' } });
    expect(figmaValue(row('light', 'default', 'border-width', '1px'))).toEqual({ $type: 'dimension', $value: { value: 1, unit: 'px' } });
  });

  it('uses the largest size of a fluid clamp()', () => {
    expect(figmaValue(row('light', 'default', 'text-display-size', 'clamp(2.25rem, 1.6rem + 2.2vw, 3.25rem)')).$value).toEqual({
      value: 52,
      unit: 'px',
    });
  });

  it('converts durations to seconds and plain numbers to numbers', () => {
    expect(figmaValue(row('light', 'default', 'duration-fast', '150ms'))).toEqual({
      $type: 'duration',
      $value: { value: 0.15, unit: 's' },
    });
    expect(figmaValue(row('light', 'default', 'text-heading-weight', '800'))).toEqual({ $type: 'number', $value: 800 });
  });

  it('takes the first family of a font stack', () => {
    expect(figmaValue(row('light', 'default', 'font-sans', '"Atkinson Hyperlegible Next", ui-sans-serif, sans-serif'))).toEqual({
      $type: 'fontFamily',
      $value: 'Atkinson Hyperlegible Next',
    });
  });

  it('skips values Figma variables cannot hold (em tracking, easing, shadows)', () => {
    expect(figmaValue(row('light', 'default', 'text-display-tracking', '-0.02em'))).toBeNull();
    expect(figmaValue(row('light', 'default', 'ease-enter', 'cubic-bezier(0.2, 0.7, 0.2, 1)'))).toBeNull();
    expect(figmaValue(row('light', 'default', 'shadow-overlay', '0px 12px 32px -8px black'))).toBeNull();
  });
});

describe('figmaFiles', () => {
  const rows = [];

  for (const theme of ['light', 'dark', 'contrast']) {
    for (const density of ['default', 'comfortable', 'compact']) {
      rows.push(
        row(theme, density, 'ink', 'x', theme === 'dark' ? '#ffffff' : '#000000'),
        row(theme, density, 'control-height', density === 'compact' ? '2rem' : '2.25rem'),
        row(theme, density, 'radius-control', '0.25rem'),
      );
    }
  }

  const files = figmaFiles(rows);

  it('writes one file per mode: theme modes, density modes, and a single base mode', () => {
    expect(Object.keys(files).toSorted()).toEqual([
      'base.tokens.json',
      'density.comfortable.tokens.json',
      'density.compact.tokens.json',
      'density.default.tokens.json',
      'theme.contrast.tokens.json',
      'theme.dark.tokens.json',
      'theme.light.tokens.json',
    ]);
  });

  it('puts a token in the collection whose modes change it, grouped by type', () => {
    expect(files['theme.dark.tokens.json'].color.ink.$value.hex).toBe('#ffffff');
    expect(files['theme.light.tokens.json'].color.ink.$value.hex).toBe('#000000');
    expect(files['density.compact.tokens.json'].dimension['control-height'].$value.value).toBe(32);
    expect(files['base.tokens.json'].dimension['radius-control'].$value.value).toBe(4);
    expect(files['base.tokens.json'].color).toBeUndefined();
  });
});
