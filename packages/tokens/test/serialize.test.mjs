import { describe, expect, it } from 'vitest';
import { colorToCss, colorToHexFallback, dimensionToCss, toCss } from '../lib/serialize.mjs';

const ink = { colorSpace: 'oklch', components: [0.2108, 0.0098, 173.15], hex: '#141a18' };

describe('colorToCss', () => {
  it('writes oklch with lightness as a percentage', () => {
    expect(colorToCss(ink)).toBe('oklch(21.08% 0.0098 173.15)');
  });
  it('adds alpha only when below 1', () => {
    expect(colorToCss({ ...ink, alpha: 0.48 })).toBe('oklch(21.08% 0.0098 173.15 / 0.48)');
    expect(colorToCss({ ...ink, alpha: 1 })).toBe('oklch(21.08% 0.0098 173.15)');
  });
  it('rejects color spaces other than oklch', () => {
    expect(() => colorToCss({ colorSpace: 'srgb', components: [0, 0, 0], hex: '#000000' })).toThrow('oklch');
  });
});

describe('colorToHexFallback', () => {
  it('returns the 6-digit hex for opaque colors', () => {
    expect(colorToHexFallback(ink)).toBe('#141a18');
  });
  it('appends the alpha byte for translucent colors', () => {
    expect(colorToHexFallback({ ...ink, alpha: 0.48 })).toBe('#141a187a');
  });
});

describe('toCss', () => {
  it('serializes dimensions and durations', () => {
    expect(dimensionToCss({ value: 16, unit: 'px' })).toBe('16px');
    expect(toCss({ value: -0.02, unit: 'em' }, 'dimension')).toBe('-0.02em');
    expect(toCss({ value: 160, unit: 'ms' }, 'duration')).toBe('160ms');
  });
  it('serializes cubic-bezier, weights and numbers', () => {
    expect(toCss([0.2, 0.7, 0.2, 1], 'cubicBezier')).toBe('cubic-bezier(0.2, 0.7, 0.2, 1)');
    expect(toCss(800, 'fontWeight')).toBe('800');
    expect(toCss(1.55, 'number')).toBe('1.55');
  });
  it('quotes font family names that contain spaces', () => {
    expect(toCss(['Atkinson Hyperlegible Next', 'ui-sans-serif', 'sans-serif'], 'fontFamily')).toBe(
      '"Atkinson Hyperlegible Next", ui-sans-serif, sans-serif',
    );
  });
  it('serializes shadow lists and an empty list as none', () => {
    const layer = {
      color: { ...ink, alpha: 0.28 },
      offsetX: { value: 0, unit: 'px' },
      offsetY: { value: 12, unit: 'px' },
      blur: { value: 32, unit: 'px' },
      spread: { value: -8, unit: 'px' },
    };

    expect(toCss([layer], 'shadow')).toBe('0px 12px 32px -8px oklch(21.08% 0.0098 173.15 / 0.28)');
    expect(toCss([], 'shadow')).toBe('none');
  });
  it('passes untyped strings through (e.g. clamp())', () => {
    expect(toCss('clamp(2.25rem, 1.6rem + 2.2vw, 3.25rem)', undefined)).toBe('clamp(2.25rem, 1.6rem + 2.2vw, 3.25rem)');
  });
  it('throws on unsupported types', () => {
    expect(() => toCss({ x: 1 }, 'gradient')).toThrow('Cannot serialize token of type gradient');
  });
});
