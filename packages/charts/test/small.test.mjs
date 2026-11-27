// Sparkline and gauge: the words and the pure lookups (no DOM), then the server-rendered output.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';
import { sparkSummary } from '../src/sparkline.js';
import { bandAt, gaugeAngle } from '../src/gauge.js';
import { registerTranslation } from '@focsd/primitives/utils';
import { termFor } from '@focsd/primitives/internal';

await import('../src/index.js');

const n = new Intl.NumberFormat('en');

/** The same shape as `element.localize`, for the pure summary function. */
const words = (lang = 'en') => ({ locale: () => lang, term: (key, ...args) => termFor(lang, key, ...args) });

describe('sparkline summary', () => {
  it('says count, range, last value and the change from the first', () => {
    const values = [4, 8, 6, 12, 19, 17];

    expect(sparkSummary(values, (v) => n.format(v), words())).toBe('6 values, from 4 to 19, last 17, up 325% from the first');
  });

  it('reads a fall and a flat line', () => {
    expect(sparkSummary([10, 5], String, words())).toBe('2 values, from 5 to 10, last 5, down 50% from the first');
    expect(sparkSummary([7, 9, 7], String, words())).toBe('3 values, from 7 to 9, last 7, unchanged from the first');
  });

  it('handles one value, empty data and a first value of zero', () => {
    expect(sparkSummary([17], String, words())).toBe('1 value: 17');
    expect(sparkSummary([], String, words())).toBe('No data');
    expect(sparkSummary([0, 4], String, words())).toBe('2 values, from 0 to 4, last 4, up from the first');
  });

  it('ignores values that are not finite numbers', () => {
    expect(sparkSummary([1, NaN, 3, null, 'x'], String, words())).toBe('2 values, from 1 to 3, last 3, up 200% from the first');
  });
});

describe('gauge bands', () => {
  const bands = [
    { to: 60, label: 'Normal', tone: 'positive' },
    { to: 80, label: 'Warning', tone: 'caution' },
    { to: 100, label: 'Critical', tone: 'critical' },
  ];

  it('finds the band whose upper edge is the first at or above the value', () => {
    expect(bandAt(bands, 0)?.label).toBe('Normal');
    expect(bandAt(bands, 60)?.label).toBe('Normal');
    expect(bandAt(bands, 60.1)?.label).toBe('Warning');
    expect(bandAt(bands, 100)?.label).toBe('Critical');
  });

  it('sorts bands, and has none past the last one or without bands', () => {
    expect(bandAt([...bands].reverse(), 70)?.label).toBe('Warning');
    expect(bandAt(bands, 101)).toBeNull();
    expect(bandAt([], 5)).toBeNull();
    expect(bandAt(undefined, 5)).toBeNull();
  });

  it('maps a value to an angle over 240 degrees and clamps', () => {
    const third = (2 * Math.PI) / 3;

    expect(gaugeAngle(0, 0, 100)).toBeCloseTo(-third);
    expect(gaugeAngle(50, 0, 100)).toBeCloseTo(0);
    expect(gaugeAngle(100, 0, 100)).toBeCloseTo(third);
    expect(gaugeAngle(150, 0, 100)).toBeCloseTo(third);
    expect(gaugeAngle(5, 5, 5)).toBeCloseTo(-third);
  });
});

/** @param {import('lit').TemplateResult} t */
const out = (t) => collectResult(render(t));

describe('localized words', () => {
  it('takes every sparkline sentence and the gauge legend from the term tables', () => {
    registerTranslation({
      $code: 'xx',
      $name: 'Test',
      sparkOne: (v) => `un: ${v}`,
      chartRange: (a, b) => `${a}-${b}`,
      sparkSummary: (count, range, last, change) => `${count} vals ${range} fin ${last} ${change}`,
      sparkUp: (pct) => `haut ${pct}`,
      sparkDown: (pct) => `bas ${pct}`,
      sparkSame: 'stable',
      gaugeBand: (label, to) => `${label} upto ${to}`,
    });

    expect(sparkSummary([1, 2, 3], String, words('xx'))).toBe('3 vals 1-3 fin 3 haut 200%');
    expect(sparkSummary([3, 3], String, words('xx'))).toBe('2 vals 3-3 fin 3 stable');
    expect(sparkSummary([1], String, words('xx'))).toBe('un: 1');
    expect(termFor('xx', 'gaugeBand', 'Normal', '60')).toBe('Normal upto 60');
  });
});

describe('focsd-sparkline (server)', () => {
  it('is an image named by its label and its words', async () => {
    const s = await out(html`<focsd-sparkline label="Joins" .values=${[1, 2, 3]}></focsd-sparkline>`);

    expect(s).toContain('role="img"');
    expect(s).toContain('aria-label="Joins: 3 values, from 1 to 3, last 3, up 200% from the first"');
    expect(s).toContain('part="line"');
  });

  it('draws bars, an area, and a last-value dot on request', async () => {
    const bar = await out(html`<focsd-sparkline type="bar" label="x" .values=${[1, 2]}></focsd-sparkline>`);
    const area = await out(html`<focsd-sparkline type="area" show-last label="x" .values=${[1, 2]}></focsd-sparkline>`);

    expect([...bar.matchAll(/part="bar"/g)]).toHaveLength(2);
    expect(area).toContain('part="area"');
    expect(area).toContain('part="last"');
  });

  it('renders nothing drawn for empty data but still has a name', async () => {
    const s = await out(html`<focsd-sparkline label="x"></focsd-sparkline>`);

    expect(s).toContain('aria-label="x: No data"');
    expect(s).not.toContain('part="line"');
  });
});

describe('focsd-gauge (server)', () => {
  const bands = [
    { to: 60, label: 'Normal', tone: 'positive' },
    { to: 100, label: 'Warning', tone: 'caution' },
  ];

  it('is a meter with a value, bounds and value text including the band', async () => {
    const g = await out(
      html`<focsd-gauge label="CPU" .value=${72} .bands=${bands} .format=${{ style: 'unit', unit: 'percent' }}></focsd-gauge>`,
    );

    expect(g).toContain('role="meter"');
    expect(g).toContain('aria-valuemin="0"');
    expect(g).toContain('aria-valuemax="100"');
    expect(g).toContain('aria-valuenow="72"');
    expect(g).toContain('aria-valuetext="72%, Warning"');
    expect(g).toContain('aria-label="CPU"');
  });

  it('labels every band in a list and draws a tick between bands', async () => {
    const g = await out(html`<focsd-gauge label="CPU" .value=${10} .bands=${bands}></focsd-gauge>`);

    expect(g).toContain('Normal');
    expect(g).toContain('Warning');
    expect([...g.matchAll(/part="band"/g)]).toHaveLength(2);
    expect([...g.matchAll(/part="tick"/g)]).toHaveLength(1);
    expect(g).toContain('part="needle"');
  });

  it('clamps the value into the range and shows it only on request', async () => {
    const g = await out(html`<focsd-gauge label="x" show-value .value=${500} max="200"></focsd-gauge>`);

    expect(g).toContain('aria-valuenow="200"');
    expect(g).toContain('part="value"');
    expect(await out(html`<focsd-gauge label="x" .value=${5}></focsd-gauge>`)).not.toContain('part="value"');
  });
});

describe('a bad format never takes the element down (server)', () => {
  const bad = { style: 'currency' }; // no currency: Intl throws "Currency code is required"

  it('the sparkline falls back to plain numbers and warns once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const a = await out(html`<focsd-sparkline label="Sales" .format=${bad} .values=${[1, 2000]}></focsd-sparkline>`);
    const b = await out(html`<focsd-sparkline label="Sales" .format=${bad} .values=${[1, 2000]}></focsd-sparkline>`);

    expect(a).toContain('aria-label="Sales: 2 values, from 1 to 2,000, last 2,000, up 199,900% from the first"');
    expect(b).toContain('last 2,000');
    expect(warn.mock.calls.filter(([m]) => String(m).includes('invalid format'))).toHaveLength(1);
    warn.mockRestore();
  });

  it('the gauge falls back to plain numbers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = await out(html`<focsd-gauge label="Load" .value=${72} .format=${bad} .bands=${[{ to: 100, label: 'Ok' }]}></focsd-gauge>`);

    expect(g).toContain('aria-valuetext="72, Ok"');
    expect(g).toContain('Ok, up to 100');
    warn.mockRestore();
  });
});

describe('focsd-sparkline edge cases (server)', () => {
  it('draws a dot for a single value, without show-last', async () => {
    const s = await out(html`<focsd-sparkline label="x" .values=${[5]}></focsd-sparkline>`);

    expect(s).toContain('part="last"');
  });

  it('takes a very long series without overflowing the stack', async () => {
    const long = Array.from({ length: 300_000 }, (_, i) => i % 50);

    expect(sparkSummary(long, String, words())).toContain('300000 values, from 0 to 49');
    expect(await out(html`<focsd-sparkline label="x" .values=${long}></focsd-sparkline>`)).toContain('part="line"');
  });

  it('draws an unknown type as a line, not a zero-based one', async () => {
    const odd = await out(html`<focsd-sparkline label="x" type="spline" .values=${[100, 110, 105]}></focsd-sparkline>`);
    const line = await out(html`<focsd-sparkline label="x" type="line" .values=${[100, 110, 105]}></focsd-sparkline>`);

    expect(odd.match(/part="line" d="([^"]+)"/)?.[1]).toBe(line.match(/part="line" d="([^"]+)"/)?.[1]);
    expect(odd).not.toContain('part="area"');
  });

  it('warns once when it has no label, and when it skips values that are not numbers', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await out(html`<focsd-sparkline .values=${[1, 'x', 3]}></focsd-sparkline>`);
    await out(html`<focsd-sparkline .values=${[1, 'x', 3]}></focsd-sparkline>`);
    const messages = warn.mock.calls.map(([m]) => String(m));

    expect(messages.filter((m) => m.includes('needs a label'))).toHaveLength(1);
    expect(messages.filter((m) => m.includes('not finite numbers'))).toHaveLength(1);
    warn.mockRestore();
  });
});
