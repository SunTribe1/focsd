// @vitest-environment happy-dom
// focsd-tool-call: a disclosure named "{name}, {status}" with the input and output as JSON text.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it, vi } from 'vitest';
import '../src/tool-call.js';

afterEach(() => document.body.replaceChildren());

/** @param {Record<string, unknown>} props */
async function tool(props = {}) {
  const el = Object.assign(document.createElement('focsd-tool-call'), props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

const q = (/** @type {HTMLElement} */ el, /** @type {string} */ part) => el.shadowRoot.querySelector(`[part="${part}"]`);

it.each([
  ['running', 'search, running', 'running'],
  ['done', 'search, done', 'done'],
  ['error', 'search, failed', 'failed'],
])('status %s: the button is named "%s" and shows an icon plus a word', async (status, name, word) => {
  const el = await tool({ name: 'search', status });
  const summary = q(el, 'summary');

  expect(summary.tagName).toBe('BUTTON');
  expect(summary.getAttribute('aria-label')).toBe(name);
  expect(q(el, 'status').textContent.trim()).toBe(word);
  expect(q(el, 'status').querySelector('[aria-hidden="true"]')).not.toBeNull();
  expect(el.getAttribute('status')).toBe(status);
});

it('an unknown status is shown as running', async () => {
  const el = await tool({ name: 'x', status: 'bogus' });

  expect(q(el, 'summary').getAttribute('aria-label')).toBe('x, running');
});

it('is collapsed by default and opens to show input and output as JSON', async () => {
  const el = await tool({ name: 'search', status: 'done', input: { q: 'lit', n: 2 }, output: ['a', 'b'] });
  const summary = q(el, 'summary');
  const onToggle = vi.fn();

  el.addEventListener('toggle', onToggle);
  expect(summary.getAttribute('aria-expanded')).toBe('false');

  summary.click();
  await el.updateComplete;

  expect(summary.getAttribute('aria-expanded')).toBe('true');
  expect(q(el, 'input').tagName).toBe('PRE');
  expect(q(el, 'input').textContent).toBe(JSON.stringify({ q: 'lit', n: 2 }, null, 2));
  expect(q(el, 'output').textContent).toBe(JSON.stringify(['a', 'b'], null, 2));
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(onToggle.mock.calls[0][0].bubbles).toBe(false);
});

it('labels the input and output and leaves out a missing output', async () => {
  const el = await tool({ name: 'search', input: 'raw string', open: true });

  expect(q(el, 'input').textContent).toBe('raw string');
  expect(q(el, 'output')).toBeNull();
  expect(el.shadowRoot.textContent).toContain('Input');
  expect(el.shadowRoot.textContent).not.toContain('Output');
});

it('markup in input and output stays text', async () => {
  const el = await tool({ name: 'x', input: '<img src=x onerror=alert(1)>', output: { html: '<script>alert(1)</script>' }, open: true });

  expect(el.shadowRoot.querySelector('img, script')).toBeNull();
  expect(q(el, 'input').textContent).toBe('<img src=x onerror=alert(1)>');
  expect(q(el, 'output').textContent).toContain('<script>');
});

it('a value JSON cannot show (a cycle, a BigInt) falls back to its string', async () => {
  const cycle = {};
  cycle.self = cycle;
  const el = await tool({ name: 'x', input: cycle, output: 10n, open: true });

  expect(q(el, 'input').textContent).toBe('[object Object]');
  expect(q(el, 'output').textContent).toBe('10');
});

it('uses no HTML sinks', () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/tool-call.js'), 'utf8');

  expect(source).not.toMatch(/innerHTML|insertAdjacentHTML|DOMParser|unsafeHTML/);
});

it('the input and output are named by their labels and take focus only when they scroll (in a browser)', async () => {
  // happy-dom does no layout, so the blocks fit: no role or tab stop, the label reference set aside.
  // The overflowing case is covered in the browser tests (ai-chat.spec.js).

  const el = await tool({ name: 'search', input: { q: 1 }, output: 'x\n'.repeat(200), open: true });

  const css = [el.constructor.styles]
    .flat(Infinity)
    .map((s) => s.cssText)
    .join('\n');

  for (const [part, name] of [
    ['input', 'Input'],
    ['output', 'Output'],
  ]) {
    const pre = q(el, part);
    const label = el.shadowRoot.getElementById(pre.getAttribute('data-aria-labelledby'));

    expect(pre.hasAttribute('tabindex')).toBe(false);
    expect(pre.hasAttribute('role')).toBe(false);
    expect(label.textContent).toBe(name);
  }

  expect(css).toMatch(/pre:focus-visible\s*\{\s*outline/);
});

it('an undefined input shows no input block (not the word "undefined")', async () => {
  const el = await tool({ name: 'ping', open: true });

  expect(q(el, 'input')).toBeNull();
  expect(el.shadowRoot.textContent).not.toContain('undefined');
});
