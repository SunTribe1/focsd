// @vitest-environment happy-dom
// focsd-prompt-suggestions: a list of up to four suggestion buttons, each its own tab stop.
import { afterEach, expect, it } from 'vitest';
import '../src/terms.js';
import '../src/prompt-suggestions.js';

/** @param {Record<string, unknown>} props */
async function mount(props = {}) {
  const el = /** @type {any} */ (document.createElement('focsd-prompt-suggestions'));
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

const buttons = (/** @type {any} */ el) => [...el.shadowRoot.querySelectorAll('[part~="suggestion"]')];

afterEach(() => document.body.replaceChildren());

it('renders a named list of buttons, each a tab stop', async () => {
  const el = await mount({ suggestions: ['Summarize this', 'Explain like I am five'] });
  const list = el.shadowRoot.querySelector('[part~="list"]');

  expect(list.getAttribute('role')).toBe('list');
  expect(list.getAttribute('aria-label')).toBe('Suggestions');
  expect(buttons(el).map((b) => b.textContent.trim())).toEqual(['Summarize this', 'Explain like I am five']);
  expect(buttons(el).every((b) => b.tagName === 'BUTTON' && b.type === 'button' && !b.hasAttribute('tabindex'))).toBe(true);
  expect(list.querySelectorAll('li').length).toBe(2);
});

it('uses the label for the list name', async () => {
  const el = await mount({ suggestions: ['a'], label: 'Try asking' });

  expect(el.shadowRoot.querySelector('[part~="list"]').getAttribute('aria-label')).toBe('Try asking');
});

it('shows at most four suggestions', async () => {
  const el = await mount({ suggestions: ['1', '2', '3', '4', '5', '6'] });

  expect(buttons(el).length).toBe(4);
});

it('renders nothing focusable without suggestions', async () => {
  const el = await mount();

  expect(buttons(el).length).toBe(0);
});

it('fires focsd-suggestion-select with the text; it bubbles and is not composed', async () => {
  const el = await mount({ suggestions: ['Plan a trip', 'Write a poem'] });
  /** @type {CustomEvent[]} */
  const events = [];
  document.body.addEventListener('focsd-suggestion-select', (e) => events.push(/** @type {CustomEvent} */ (e)));

  buttons(el)[1].click();

  expect(events).toHaveLength(1);
  expect(events[0].detail).toEqual({ text: 'Write a poem' });
  expect(events[0].bubbles).toBe(true);
  expect(events[0].composed).toBe(false);
});

it('keeps the suggestions array it was given untouched', async () => {
  const suggestions = Object.freeze(['a', 'b', 'c', 'd', 'e']);
  const el = await mount({ suggestions });

  expect(el.suggestions).toBe(suggestions);
  expect(buttons(el).length).toBe(4);
});

it('renders suggestion text as text, never markup', async () => {
  const el = await mount({ suggestions: ['<img src=x onerror=alert(1)>'] });

  expect(el.shadowRoot.querySelector('img')).toBeNull();
  expect(buttons(el)[0].textContent.trim()).toBe('<img src=x onerror=alert(1)>');
});
