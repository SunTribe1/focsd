// @vitest-environment happy-dom
// focsd-message-actions: a toolbar with copy, retry and thumbs up/down (aria-pressed, announced).
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '../src/message-actions.js';

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (/** @type {() => void} */ fn) => setTimeout(fn, 0));
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

/** @param {Record<string, unknown>} props */
async function actions(props = {}) {
  const el = Object.assign(document.createElement('focsd-message-actions'), { for: 'm1', text: 'Hello there', ...props });
  document.body.append(el);
  await el.updateComplete;
  await el.shadowRoot.querySelector('focsd-copy-button')?.updateComplete;
  await el.updateComplete;

  return el;
}

const toolbar = (/** @type {HTMLElement} */ el) => el.shadowRoot.querySelector('[part="toolbar"]');

const button = (/** @type {HTMLElement} */ el, /** @type {string} */ name) => el.shadowRoot.querySelector(`button[aria-label="${name}"]`);
/** The focusable controls, in order (the copy button's own button included). */

const stops = (/** @type {HTMLElement} */ el) => [...el.shadowRoot.querySelectorAll('[part~="action"]')];

const announced = () =>
  new Promise((r) => setTimeout(r, 5)).then(() => document.querySelector('[data-focsd-announcer="polite"]')?.textContent);

it('is a toolbar named "Message actions" with copy, retry, good and bad', async () => {
  const el = await actions();

  expect(toolbar(el).getAttribute('role')).toBe('toolbar');
  expect(toolbar(el).getAttribute('aria-label')).toBe('Message actions');

  const copy = el.shadowRoot.querySelector('focsd-copy-button[part~="action"]');

  expect(copy.value).toBe('Hello there');
  expect(copy.label).toBe('Copy');
  expect(button(el, 'Retry')).not.toBeNull();
  expect(button(el, 'Good response').getAttribute('aria-pressed')).toBe('false');
  expect(button(el, 'Bad response').getAttribute('aria-pressed')).toBe('false');
});

it('shows only the listed actions', async () => {
  const el = await actions({ actions: 'copy' });

  expect(stops(el)).toHaveLength(1);
  expect(button(el, 'Retry')).toBeNull();

  el.setAttribute('actions', 'retry, feedback');
  await el.updateComplete;

  expect(el.shadowRoot.querySelector('focsd-copy-button')).toBeNull();
  expect(stops(el)).toHaveLength(3);
});

it('retry fires focsd-retry with the message id (bubbling, not composed)', async () => {
  const el = await actions();
  const onRetry = vi.fn();

  document.body.addEventListener('focsd-retry', onRetry);
  button(el, 'Retry').click();

  expect(onRetry).toHaveBeenCalledTimes(1);
  const [event] = onRetry.mock.calls[0];

  expect(event.detail).toEqual({ id: 'm1' });
  expect(event.composed).toBe(false);
  document.body.removeEventListener('focsd-retry', onRetry);
});

it('feedback toggles aria-pressed, fires focsd-feedback and is announced', async () => {
  const el = await actions();
  const onFeedback = vi.fn();

  el.addEventListener('focsd-feedback', onFeedback);

  button(el, 'Good response').click();
  await el.updateComplete;

  expect(button(el, 'Good response').getAttribute('aria-pressed')).toBe('true');
  expect(onFeedback.mock.calls.at(-1)[0].detail).toEqual({ id: 'm1', value: 'up' });
  expect(await announced()).toBe('Marked as a good response');

  button(el, 'Bad response').click();
  await el.updateComplete;

  expect(button(el, 'Good response').getAttribute('aria-pressed')).toBe('false');
  expect(button(el, 'Bad response').getAttribute('aria-pressed')).toBe('true');
  expect(onFeedback.mock.calls.at(-1)[0].detail).toEqual({ id: 'm1', value: 'down' });
  expect(await announced()).toBe('Marked as a bad response');

  button(el, 'Bad response').click();
  await el.updateComplete;

  expect(button(el, 'Bad response').getAttribute('aria-pressed')).toBe('false');
  expect(onFeedback.mock.calls.at(-1)[0].detail).toEqual({ id: 'm1', value: null });
  expect(await announced()).toBe('Feedback removed');
});

it('manages the copy button through its public API only: the host takes the tab stop and focus', async () => {
  const el = await actions();
  const copy = el.shadowRoot.querySelector('focsd-copy-button');

  expect(customElements.get('focsd-copy-button').shadowRootOptions.delegatesFocus).toBe(true);
  expect(copy.getAttribute('tabindex')).toBe('0');
  expect(copy.shadowRoot.querySelector('button').hasAttribute('tabindex')).toBe(false);
});

it('has one tab stop and moves with the arrow keys, Home and End', async () => {
  const el = await actions();
  const all = stops(el);

  expect(all.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1']);

  const key = (/** @type {string} */ k, /** @type {Element} */ from) =>
    from.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, composed: true, cancelable: true }));

  all[0].focus();
  key('ArrowRight', all[0]);
  await el.updateComplete;

  expect(el.shadowRoot.activeElement).toBe(all[1]);
  expect(stops(el).map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1']);

  key('End', all[1]);
  expect(el.shadowRoot.activeElement).toBe(all[3]);

  key('ArrowRight', all[3]);
  expect(all[0].getRootNode().activeElement).toBe(all[0]);

  key('ArrowLeft', all[0]);
  expect(el.shadowRoot.activeElement).toBe(all[3]);

  key('Home', all[3]);
  expect(all[0].getRootNode().activeElement).toBe(all[0]);
});
