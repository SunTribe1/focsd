// @vitest-environment happy-dom
// focsd-streaming-text: markdown that grows while it streams. Finished blocks keep their nodes,
// only the last block is rebuilt, a caret shows while streaming, and code blocks get a copy button.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import '../src/streaming-text.js';

afterEach(() => document.body.replaceChildren());

/** @param {Record<string, unknown>} props */
async function stream(props) {
  const el = Object.assign(document.createElement('focsd-streaming-text'), props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

const box = (/** @type {HTMLElement} */ el) => el.shadowRoot.querySelector('[part="text"]');

it('renders markdown by default', async () => {
  const el = await stream({ text: '# Title\n\nSome **bold** text' });

  expect(box(el).querySelector('h3').textContent).toBe('Title');
  expect(box(el).querySelector('strong').textContent).toBe('bold');
});

it('renders markdown by default: plain defaults to false', async () => {
  document.body.innerHTML = '<focsd-streaming-text></focsd-streaming-text>';

  expect(document.querySelector('focsd-streaming-text').plain).toBe(false);
});

it('renders plain text when plain is set (the bare plain attribute too)', async () => {
  const el = await stream({ text: '**not bold** <b>x</b>', plain: true });

  expect(box(el).querySelector('strong, b')).toBeNull();
  expect(box(el).textContent).toBe('**not bold** <b>x</b>');

  document.body.innerHTML = '<focsd-streaming-text plain></focsd-streaming-text>';
  const attr = document.querySelector('focsd-streaming-text');

  expect(attr.plain).toBe(true);
  expect('markdown' in attr).toBe(false);
});

it('keeps finished blocks as the same nodes and rebuilds only the last one', async () => {
  const el = await stream({ text: 'First paragraph.\n\nSecond', streaming: true });
  const first = box(el).querySelector('p');

  el.text = 'First paragraph.\n\nSecond paragraph grows';
  await el.updateComplete;

  const [p1, p2] = box(el).querySelectorAll('p');

  expect(p1).toBe(first);
  expect(p2.textContent).toContain('Second paragraph grows');

  el.text += '\n\nThird';
  await el.updateComplete;

  expect(box(el).querySelector('p')).toBe(first);
  expect(box(el).querySelectorAll('p')).toHaveLength(3);
});

it('shows a hidden caret at the end of the last block only while streaming', async () => {
  const el = await stream({ text: 'Hello', streaming: true });
  const caret = el.shadowRoot.querySelector('[part="caret"]');

  expect(caret.getAttribute('aria-hidden')).toBe('true');
  expect(box(el).querySelector('p').lastChild).toBe(caret);
  // The caret never adds to the text.
  expect(caret.textContent).toBe('');

  el.text = 'Hello world';
  await el.updateComplete;

  expect(box(el).querySelector('p').lastChild).toBe(el.shadowRoot.querySelector('[part="caret"]'));

  el.streaming = false;
  await el.updateComplete;

  expect(el.shadowRoot.querySelector('[part="caret"]')).toBeNull();
});

it('the caret pulses with opacity only, and not under reduced motion', async () => {
  const el = await stream({ text: 'x' });

  const css = [el.constructor.styles]
    .flat(Infinity)
    .map((s) => s.cssText)
    .join('\n');

  expect(css).toMatch(/@keyframes[^{]+\{[^}]*opacity/);
  expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*\[part~='caret'\]\s*\{\s*animation: none/);
});

it('code blocks get a language label and a copy button with the code', async () => {
  const el = await stream({ text: '```js\nconst a = 1;\n```' });
  const pre = box(el).querySelector('pre[part="code"]');
  const copy = pre.querySelector('focsd-copy-button[part="code-copy"]');

  expect(pre.querySelector('code').textContent).toBe('const a = 1;');
  expect(pre.textContent).toContain('js code');
  expect(copy.value).toBe('const a = 1;');
  expect(copy.label).toBe('Copy code');
});

it('raw HTML in the text stays text', async () => {
  const el = await stream({ text: '<img src=x onerror=alert(1)><script>alert(1)</script>' });

  expect(box(el).querySelector('img, script')).toBeNull();
  expect(box(el).textContent).toContain('<script>');
});

it('a text that is replaced (not extended) is rebuilt', async () => {
  const el = await stream({ text: 'One\n\nTwo' });

  el.text = 'Other';
  await el.updateComplete;

  expect(box(el).textContent.trim()).toBe('Other');
});

it('uses no HTML sinks', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(dir, '../src/streaming-text.js'), 'utf8');

  expect(source).not.toMatch(/innerHTML|insertAdjacentHTML|DOMParser|unsafeHTML/);
});

it('plain text keeps its line breaks (pre-wrap), markdown does not', async () => {
  const el = await stream({ text: 'line one\nline two', plain: true });

  const css = [el.constructor.styles]
    .flat(Infinity)
    .map((s) => s.cssText)
    .join('\n');

  expect(box(el).hasAttribute('data-plain')).toBe(true);
  expect(css).toMatch(/\[part~='text'\]\[data-plain\]\s*\{\s*white-space: pre-wrap/);

  el.plain = false;
  await el.updateComplete;
  expect(box(el).hasAttribute('data-plain')).toBe(false);
});

it('the caret sits in the code of a streaming code block, never in the copy button', async () => {
  const el = await stream({ text: 'hi\n\n```js\nconst a = 1;', streaming: true });
  const caret = () => el.shadowRoot.querySelector('[part="caret"]');

  expect(caret().parentElement.tagName).toBe('CODE');

  el.text += '\nconst b = 2;';
  await el.updateComplete;
  expect(caret().parentElement.tagName).toBe('CODE');
  expect(el.shadowRoot.querySelector('focsd-copy-button [part="caret"], focsd-copy-button + [part="caret"]')).toBeNull();
});

it('the caret goes after the last text of the last block, not inside inline markup', async () => {
  const el = await stream({ text: '- a **b** c', streaming: true });
  const caret = el.shadowRoot.querySelector('[part="caret"]');

  expect(caret.parentElement.tagName).toBe('LI');
  expect(caret.previousSibling.textContent).toBe(' c');
});

it('a streaming code block keeps its copy button (same element) and updates its value', async () => {
  const el = await stream({ text: '```js\nconst a = 1;', streaming: true });
  const copy = box(el).querySelector('[part="code-copy"]');
  const pre = box(el).querySelector('pre');

  el.text += '\nconst b = 2;';
  await el.updateComplete;

  expect(box(el).querySelector('[part="code-copy"]')).toBe(copy);
  expect(box(el).querySelector('pre')).toBe(pre);
  expect(copy.isConnected).toBe(true);
  expect(copy.value).toBe('const a = 1;\nconst b = 2;');
  expect(box(el).querySelectorAll('[part="code-copy"]')).toHaveLength(1);
});

it('a code block that fits is plain content with its name set aside, and has a focus ring for when it scrolls', async () => {
  // happy-dom does no layout, so every block fits; the overflowing case is in overflow-region.test.mjs
  // (primitives) and the browser tests.
  const el = await stream({ text: '```js\nconst a = 1;\n```\n\n```\nplain\n```' });
  const [js, plain] = box(el).querySelectorAll('pre[part="code"]');

  const css = [el.constructor.styles]
    .flat(Infinity)
    .map((s) => s.cssText)
    .join('\n');

  for (const pre of [js, plain]) {
    expect(pre.hasAttribute('tabindex')).toBe(false);
    expect(pre.hasAttribute('role')).toBe(false);
  }

  expect(js.getAttribute('data-aria-label')).toBe('js code');
  expect(plain.getAttribute('data-aria-label')).toBe('Code');
  expect(css).toMatch(/\[part~='code'\]:focus-visible\s*\{\s*outline/);
});
