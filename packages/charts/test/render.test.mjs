// The drawn marks: each type renders its focusable points with accessible names on the server.
import '@lit-labs/ssr/lib/install-global-dom-shim.js';
import { describe, expect, it } from 'vitest';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';

await import('../src/index.js');

const data = [
  { label: 'Jan', sales: 10, costs: 4 },
  { label: 'Feb', sales: 20, costs: 6 },
];

/** @param {string} type @param {{ stacked?: boolean, mirror?: boolean }} [opts] */
async function draw(type, { stacked = false, mirror = false } = {}) {
  const el = html`<focsd-chart label="Revenue" type=${type} ?stacked=${stacked} ?mirror=${mirror} .data=${data}></focsd-chart>`;

  return collectResult(render(el));
}

const points = [
  { day: 1, a: 3, b: 10 },
  { day: 40, a: 97, b: null },
  { day: 12, a: 50, b: 20 },
];

describe('chart marks', () => {
  it.each([
    ['bar', 4, 'sales, Jan: 10', '<rect'],
    ['line', 4, 'costs, Feb: 6', 'class="line"'],
  ])('%s draws a named, focusable point per value', async (type, count, name, mark) => {
    const out = await draw(type);

    expect([...out.matchAll(/role="img"/g)]).toHaveLength(count);
    expect(out).toContain(`aria-label="${name}"`);
    expect(out).toContain(mark);
    expect(out).toContain('part="legend"');
  });

  it('donut draws one slice per row of the first series', async () => {
    const out = await draw('donut');

    expect([...out.matchAll(/role="img"/g)]).toHaveLength(2);
    expect(out).toMatch(/aria-label="Jan: 10 \(33\.3%\)"/);
  });

  it('keeps exactly one point in the tab order', async () => {
    const out = await draw('bar');

    expect([...out.matchAll(/tabindex="0"/g)]).toHaveLength(1);
  });
});

describe('wave 18 types', () => {
  it('area draws a filled shape under each line, with named markers on top', async () => {
    const out = await draw('area');

    expect([...out.matchAll(/class="area"/g)]).toHaveLength(2);
    expect(out).toContain('fill-opacity="0.24"');
    expect(out.indexOf('class="area"')).toBeLessThan(out.indexOf('class="line"'));
    expect(out).toContain('aria-label="sales, Jan: 10"');
    expect(out).not.toMatch(/style="[^"]*fill/);
  });

  it('stacked bars name each segment with its total and add a total column', async () => {
    const out = await draw('bar', { stacked: true });

    expect(out).toContain('aria-label="costs, Feb: 6 of 26"');
    expect(out).toContain('Stacked bar chart, 2 categories, 2 series. Highest total: Feb, 26.');
    expect(out).toMatch(/<th scope="col">(<!--[^>]*-->)*Total(<!--[^>]*-->)*<\/th>/);
  });

  it('scatter names points by x and y and lists them in the table', async () => {
    const el = html`<focsd-chart label="Trials" type="scatter" x="day" .data=${points}></focsd-chart>`;
    const out = await collectResult(render(el));

    expect([...out.matchAll(/role="img"/g)]).toHaveLength(5);
    expect(out).toContain('aria-label="a, x: 40, y: 97"');
    expect(out).toContain('Scatter chart, 2 series, 5 points. x from 1 to 40, y from 3 to 97.');
    expect([...out.matchAll(/tabindex="0"/g)]).toHaveLength(1);
  });

  it('scatter with a y key draws that one series', async () => {
    const el = html`<focsd-chart label="Trials" type="scatter" x="day" y="b" .data=${points}></focsd-chart>`;
    const out = await collectResult(render(el));

    expect([...out.matchAll(/role="img"/g)]).toHaveLength(2);
    expect(out).toContain('aria-label="x: 12, y: 20"');
  });

  it('mirror puts the value labels on the right, start-anchored', async () => {
    const plain = await draw('bar');
    const mirrored = await draw('bar', { mirror: true });

    expect(plain).toMatch(/class="axis grid">[\s\S]*?text-anchor="end"/);
    expect(mirrored).toMatch(/class="axis grid">[\s\S]*?text-anchor="start"/);
  });
});

describe('scatter render cost', () => {
  it('renders 5,000 points with nothing focused in linear time (the first point is found once)', { timeout: 30_000 }, async () => {
    const many = Array.from({ length: 5000 }, (_, i) => ({ t: (i * 7919) % 5000, a: i % 97 }));
    const el = html`<focsd-chart label="Many" type="scatter" x="t" .data=${many}></focsd-chart>`;
    const started = performance.now();
    const out = await collectResult(render(el));
    const ms = performance.now() - started;

    expect([...out.matchAll(/role="img"/g)]).toHaveLength(5000);
    // Measured about 200 ms on a laptop and 2.5 s on a busy CI runner, mostly string building; the
    // quadratic version took 12 s. The bound only has to catch that, so it is loose on purpose.
    expect(ms).toBeLessThan(6000);
  });
});
