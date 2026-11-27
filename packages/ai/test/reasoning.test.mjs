// @vitest-environment happy-dom
// focsd-reasoning: a collapsed disclosure of the model's reasoning, never announced.
import { afterEach, expect, it, vi } from 'vitest';
import '../src/reasoning.js';

afterEach(() => document.body.replaceChildren());

/** @param {Record<string, unknown>} props */
async function reasoning(props = {}) {
  const el = Object.assign(document.createElement('focsd-reasoning'), props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

const parts = (/** @type {HTMLElement} */ el) => ({
  summary: el.shadowRoot.querySelector('button[part="summary"]'),
  body: el.shadowRoot.querySelector('[part="body"]'),
});

it('is collapsed by default, with a button that controls the body', async () => {
  const el = await reasoning({ text: 'Thinking about it' });
  const { summary, body } = parts(el);

  expect(summary.getAttribute('aria-expanded')).toBe('false');
  expect(summary.getAttribute('aria-controls')).toBe(body.id);
  expect(summary.textContent.trim()).toBe('Reasoning');
  expect(body.hidden).toBe(true);
  expect(body.textContent).toBe('Thinking about it');
});

it('says "Reasoning…" while streaming', async () => {
  const el = await reasoning({ text: 'a', streaming: true });

  expect(parts(el).summary.textContent.trim()).toBe('Reasoning…');
});

it('opens on click and fires a non-bubbling toggle', async () => {
  const el = await reasoning({ text: 'a' });
  const onToggle = vi.fn();
  const onBodyToggle = vi.fn();

  el.addEventListener('toggle', onToggle);
  document.body.addEventListener('toggle', onBodyToggle);
  parts(el).summary.click();
  await el.updateComplete;

  expect(el.open).toBe(true);
  expect(el.hasAttribute('open')).toBe(true);
  expect(parts(el).summary.getAttribute('aria-expanded')).toBe('true');
  expect(parts(el).body.hidden).toBe(false);
  expect(onToggle).toHaveBeenCalledTimes(1);
  expect(onToggle.mock.calls[0][0].bubbles).toBe(false);
  expect(onBodyToggle).not.toHaveBeenCalled();

  el.open = false;
  await el.updateComplete;

  expect(onToggle).toHaveBeenCalledTimes(2);
});

it('does not fire toggle for the first render', async () => {
  const onToggle = vi.fn();
  const el = Object.assign(document.createElement('focsd-reasoning'), { open: true });

  el.addEventListener('toggle', onToggle);
  document.body.append(el);
  await el.updateComplete;

  expect(onToggle).not.toHaveBeenCalled();
});

it('is never announced: no live region, status or alert role inside', async () => {
  const el = await reasoning({ text: 'secret thoughts', streaming: true, open: true });

  expect(el.shadowRoot.querySelector('[aria-live], [role="status"], [role="alert"], [role="log"]')).toBeNull();
});

it('shows reasoning text as text, never markup', async () => {
  const el = await reasoning({ text: '<img src=x onerror=alert(1)>', open: true });

  expect(parts(el).body.querySelector('img')).toBeNull();
  expect(parts(el).body.textContent).toBe('<img src=x onerror=alert(1)>');
});
