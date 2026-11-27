// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { controlSchema } from '../src/schema.js';
import { check } from '../src/fill.js';

/**
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 */
function control(tag, attrs = {}) {
  const el = document.createElement(tag);

  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.name = 'x';

  return el;
}

/** Field names `check` rejects for `value` under the control's schema. */
const errors = (schema, value) =>
  check({ type: 'object', properties: { x: schema } }, { x: value })
    .map((e) => e.field)
    .join();

describe('color picker schema', () => {
  const schema = controlSchema(control('focsd-color-picker', { label: 'Color' }));

  it('declares a color format', () => {
    expect(schema).toMatchObject({ type: 'string', format: 'color' });
  });

  it('accepts colors the picker reads', () => {
    for (const ok of ['#36f', '#3366ff', '#3366ff80', 'rebeccapurple', 'rgb(51 102 255)', 'hsl(225 100% 60% / 0.5)', 'oklch(0.6 0.2 260)'])
      expect(errors(schema, ok), ok).toBe('');
  });

  it('rejects text that is not a color', () => {
    for (const bad of ['#12', '#ggg', 'blue sky', 'rgb(1, 2', '12']) expect(errors(schema, bad), bad).toBe('x');
  });
});

describe('currency field schema', () => {
  it('refuses negative amounts unless allowed', () => {
    const schema = controlSchema(control('focsd-currency-field', { currency: 'EUR' }));
    expect(errors(schema, '-5')).toBe('x');
    expect(errors(schema, '5.25')).toBe('');
  });

  it('allows negative amounts with allow-negative or a negative min', () => {
    expect(errors(controlSchema(control('focsd-currency-field', { 'allow-negative': '' })), '-5')).toBe('');
    expect(errors(controlSchema(control('focsd-currency-field', { min: '-10' })), '-5')).toBe('');
  });

  it('a min of zero or more refuses negatives even with allow-negative', () => {
    expect(errors(controlSchema(control('focsd-currency-field', { min: '0', 'allow-negative': '' })), '-5')).toBe('x');
  });

  it('states min and max', () => {
    const schema = controlSchema(control('focsd-currency-field', { label: 'Price', currency: 'JPY', min: '100', max: '5000' }));
    expect(schema.pattern).toBe('^\\d+$');
    expect(schema.description).toContain('At least 100.');
    expect(schema.description).toContain('At most 5000.');
  });
});
