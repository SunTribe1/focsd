// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { render, svg } from 'lit';
import { barMarks } from '../src/marks/bar.js';

describe('stacked segments (review item 99)', () => {
  it('are drawn at least 2px tall, however small the value', () => {
    const ctx = {
      stack: { span: () => ({ base: 0, top: 0.0001 }) },
      mirror: false,
      valueAt: () => 0.0001,
      fill: () => 'red',
      pointAttrs: () => ({ active: false, tabindex: -1, name: 'x' }),
      focus: () => {},
      setHover: () => {},
    };
    const { marks } = barMarks(/** @type {any} */ (ctx), { rows: [{}], series: [{}], band: 40, cx: () => 20, y: (v) => 100 - v });
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    render(svg`${marks}`, host);
    expect(host.querySelector('rect')?.getAttribute('height')).toBe('2');
  });
});
