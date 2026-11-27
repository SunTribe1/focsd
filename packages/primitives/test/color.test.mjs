// cspell:ignore rebeccapurple blurple darkgray
import { describe, expect, it } from 'vitest';
import { colorName, contrastRatio, formatColor, fromHsv, parseColor, toHsv } from '../src/internal/color.js';

describe('color', () => {
  it('parses every supported syntax to the same color', () => {
    const want = { r: 51, g: 102, b: 255, a: 1 };

    for (const t of ['#36f', '#3366ff', '#3366FFFF', 'rgb(51 102 255)', 'rgb(51, 102, 255)', 'rgba(51,102,255,1)', 'hsl(225 100% 60%)'])
      expect(parseColor(t), t).toEqual(want);
    expect(parseColor('rebeccapurple')).toEqual({ r: 102, g: 51, b: 153, a: 1 });
    expect(parseColor('#3366ff80').a).toBeCloseTo(0.5, 2);
    expect(parseColor('oklch(62.8% 0.2577 29.23)')).toMatchObject({ r: 255, g: 0, b: 0 });
  });
  it('rejects junk', () => {
    for (const t of ['', '#12', 'rgb(1,2)', 'blurple', 'hsl(10 10 10 10 10)']) expect(parseColor(t), t).toBeNull();
  });
  it('round-trips through every format', () => {
    const c = { r: 18, g: 52, b: 86, a: 1 };

    for (const f of ['hex', 'rgb', 'hsl', 'oklch']) {
      const back = parseColor(formatColor(c, f, false));

      for (const k of ['r', 'g', 'b']) expect(Math.abs(back[k] - c[k]), `${f}.${k}`).toBeLessThanOrEqual(1);
    }

    expect(formatColor(c, 'hex', false)).toBe('#123456');
    expect(formatColor({ ...c, a: 0.5 }, 'rgb', true)).toBe('rgb(18 52 86 / 0.5)');
  });
  it('converts HSV both ways', () => {
    expect(toHsv({ r: 255, g: 0, b: 0, a: 1 })).toEqual({ h: 0, s: 100, v: 100, a: 1 });
    expect(fromHsv({ h: 120, s: 100, v: 50, a: 1 })).toEqual({ r: 0, g: 128, b: 0, a: 1 });
  });
  it('computes WCAG contrast', () => {
    expect(contrastRatio(parseColor('#000'), parseColor('#fff'))).toBe(21);
    expect(contrastRatio(parseColor('#767676'), parseColor('#fff'))).toBe(4.54);
  });
});

describe('colorName', () => {
  it('names exact CSS colors only', () => {
    expect(colorName(parseColor('#ff6347'))).toBe('tomato');
    expect(colorName(parseColor('#123456'))).toBeNull();
  });
  it('prefers gray, ignores partial alpha, is lower case', () => {
    expect(colorName(parseColor('#808080'))).toBe('gray');
    expect(colorName(parseColor('#a9a9a9'))).toBe('darkgray');
    expect(colorName({ r: 255, g: 99, b: 71, a: 0.5 })).toBeNull();
    expect(colorName(parseColor('#FF6347'))).toBe('tomato');
  });
});
