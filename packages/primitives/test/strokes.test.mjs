import { describe, expect, it } from 'vitest';
import {
  addPoint,
  isBlank,
  paintStrokes,
  paintText,
  pngFile,
  startStroke,
  strokePath,
  toSvg,
  undoStroke,
} from '../src/internal/strokes.js';

const p = (x, y) => ({ x, y });

describe('signature stroke model', () => {
  it('starts with nothing and is blank', () => {
    expect(isBlank([])).toBe(true);
  });

  it('starts a stroke and adds points to it, never changing the earlier lists', () => {
    const empty = Object.freeze([]);
    const one = startStroke(empty, p(1, 2));
    const two = addPoint(one, p(3, 4));

    expect(empty).toEqual([]);
    expect(one).toEqual([[p(1, 2)]]);
    expect(two).toEqual([[p(1, 2), p(3, 4)]]);
    expect(isBlank(two)).toBe(false);
  });

  it('adds a point to the last stroke only', () => {
    const strokes = addPoint(startStroke(addPoint(startStroke([], p(0, 0)), p(1, 1)), p(5, 5)), p(6, 6));

    expect(strokes).toEqual([
      [p(0, 0), p(1, 1)],
      [p(5, 5), p(6, 6)],
    ]);
  });

  it('a point with no stroke started starts one', () => {
    expect(addPoint([], p(2, 2))).toEqual([[p(2, 2)]]);
  });

  it('undo removes the last stroke, and is safe when blank', () => {
    const strokes = startStroke(startStroke([], p(0, 0)), p(9, 9));

    expect(undoStroke(strokes)).toEqual([[p(0, 0)]]);
    expect(undoStroke(undoStroke(strokes))).toEqual([]);
    expect(undoStroke([])).toEqual([]);
    expect(strokes).toHaveLength(2);
  });

  it('writes a stroke as an SVG path, rounded to a tenth', () => {
    expect(strokePath([p(1.234, 2), p(3, 4.56), p(5, 6)])).toBe('M1.2 2L3 4.6L5 6');
  });

  it('writes a single tap as a dot (a zero-length line with round caps)', () => {
    expect(strokePath([p(4, 4)])).toBe('M4 4l0 0');
    expect(strokePath([])).toBe('');
  });
});

describe('signature SVG', () => {
  it('writes the strokes as a standalone SVG image', () => {
    const svg = toSvg([[p(1, 1), p(2, 2)], [p(5, 5)]], { width: 300, height: 120, color: '#123', lineWidth: 2 });

    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="0 0 300 120" width="300" height="120">/);
    expect(svg).toContain(
      '<path d="M1 1L2 2M5 5l0 0" fill="none" stroke="#123" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    );
    expect(svg.endsWith('</svg>')).toBe(true);
  });

  it('writes a typed name as escaped italic text', () => {
    const svg = toSvg([], { width: 300, height: 100, color: 'black', lineWidth: 2, text: 'Ada <"&">', font: 'Inter' });

    expect(svg).toContain('font-style="italic"');
    expect(svg).toContain('font-family="Inter"');
    expect(svg).toContain('>Ada &lt;&quot;&amp;&quot;&gt;</text>');
    expect(svg).not.toContain('<path');
  });

  it('escapes the color and font attributes', () => {
    const svg = toSvg([[p(0, 0)]], { width: 10, height: 10, color: '"><script>', lineWidth: 1, text: '', font: '' });

    expect(svg).not.toContain('<script>');
  });
});

/** A canvas 2D context that records what was drawn. */
const recorder = () => {
  const calls = [];

  const ctx = new Proxy(
    { measureText: (t) => ({ width: t.length * 10 }) },
    {
      get: (target, key) => (key in target ? target[key] : (...args) => calls.push([key, ...args])),
      set: (target, key, value) => {
        calls.push([`=${String(key)}`, value]);

        return true;
      },
    },
  );

  return { ctx, calls };
};

describe('painting', () => {
  it('paints each stroke as one path in the pen color and width', () => {
    const { ctx, calls } = recorder();
    paintStrokes(ctx, [[p(1, 1), p(2, 2)], [p(5, 5)]], { color: 'red', lineWidth: 3 });
    const names = calls.map((c) => c[0]);

    expect(calls).toContainEqual(['=strokeStyle', 'red']);
    expect(calls).toContainEqual(['=lineWidth', 3]);
    expect(calls).toContainEqual(['=lineCap', 'round']);
    expect(names.filter((n) => n === 'beginPath')).toHaveLength(2);
    expect(names.filter((n) => n === 'stroke')).toHaveLength(2);
    expect(calls).toContainEqual(['lineTo', 5, 5]);
  });

  it('paints a typed name in italic, shrunk to fit the width', () => {
    const { ctx, calls } = recorder();
    paintText(ctx, 'A long typed name', { width: 100, height: 100, color: 'blue', font: 'Inter' });
    const font = calls.findLast((c) => c[0] === '=font')?.[1];

    expect(font).toMatch(/^italic \d+(\.\d+)?px Inter$/);
    expect(calls).toContainEqual(['=fillStyle', 'blue']);
    expect(calls.find((c) => c[0] === 'fillText')?.[1]).toBe('A long typed name');
    // 17 characters at 10 px each at the start size are wider than the 100 px box minus padding, so it shrinks.
    expect(Number(/(\d+(\.\d+)?)px/.exec(font)?.[1])).toBeLessThan(45);
  });

  it('returns the size it used, which the SVG copy takes', () => {
    const { ctx } = recorder();
    const size = paintText(ctx, 'Ada', { width: 300, height: 100, color: 'blue', font: 'Inter' });
    const svg = toSvg([], { width: 300, height: 100, color: 'blue', lineWidth: 2, text: 'Ada', font: 'Inter', fontSize: size });

    expect(size).toBe(45);
    expect(svg).toContain('font-size="45"');
  });

  it('paints nothing for blank text', () => {
    const { ctx, calls } = recorder();
    expect(paintText(ctx, '  ', { width: 100, height: 100, color: 'blue', font: 'Inter' })).toBe(0);

    expect(calls.some((c) => c[0] === 'fillText')).toBe(false);
  });
});

describe('signature SVG: numbers from script are never markup', () => {
  const box = { width: 100, height: 50, color: '#000' };

  it('coerces the pen width, so a string cannot break out of the attribute', () => {
    const svg = toSvg([[p(0, 0), p(5, 5)]], { ...box, lineWidth: /** @type {any} */ ('1" onload="x') });

    expect(svg).not.toContain('onload');
    expect(svg).toContain('stroke-width="0"');
  });

  it('coerces the size and the font size too, and keeps numeric strings as numbers', () => {
    const svg = toSvg([], {
      ...box,
      width: /** @type {any} */ ('100" x="1'),
      height: /** @type {any} */ ('50'),
      lineWidth: /** @type {any} */ ('3'),
      text: 'Ada',
      fontSize: /** @type {any} */ ('9"y'),
    });

    expect(svg).not.toContain('100"');
    expect(svg).not.toContain('9"y');
    expect(svg).toContain('width="0"');
    expect(svg).toContain('height="50"');
    expect(svg).toContain('font-size="0"');
    expect(toSvg([[p(0, 0)]], { ...box, lineWidth: /** @type {any} */ ('3') })).toContain('stroke-width="3"');
  });
});

describe('pngFile', () => {
  const canvasWith = (/** @type {string} */ url) => /** @type {HTMLCanvasElement} */ (/** @type {unknown} */ ({ toDataURL: () => url }));

  it('makes signature.png from a PNG data URL, at once', () => {
    const file = pngFile(canvasWith(`data:image/png;base64,${btoa('png bytes')}`));

    expect(file?.name).toBe('signature.png');
    expect(file?.type).toBe('image/png');
    expect(file?.size).toBe(9);
  });

  it('gives null when the canvas made no PNG', () => {
    expect(pngFile(canvasWith('data:,'))).toBeNull();
    expect(pngFile(canvasWith('data:image/png;base64,'))).toBeNull();
    expect(pngFile(canvasWith(''))).toBeNull();
  });
});
