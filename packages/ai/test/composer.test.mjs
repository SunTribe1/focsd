// @vitest-environment happy-dom
// focsd-composer: a native textarea with send/stop and attach buttons, Enter to send, IME-safe,
// files by picker, paste or drop, checked with acceptsFile, rejections announced with a reason.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import '../src/terms.js';
import '../src/composer.js';

/** @param {Record<string, unknown>} props */
async function mount(props = {}) {
  const el = /** @type {any} */ (document.createElement('focsd-composer'));
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

const part = (/** @type {any} */ el, /** @type {string} */ name) => el.shadowRoot.querySelector(`[part~="${name}"]`);
const textarea = (/** @type {any} */ el) => /** @type {HTMLTextAreaElement} */ (part(el, 'textarea'));

/** Type text as a person would: set the value and fire the native input event. */
async function type(/** @type {any} */ el, /** @type {string} */ text) {
  const t = textarea(el);
  t.value = text;
  t.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await el.updateComplete;
}

/** @param {any} el @param {KeyboardEventInit & { keyCode?: number }} init */
function keydown(el, init) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, ...init });

  if (init.keyCode !== undefined) Object.defineProperty(event, 'keyCode', { value: init.keyCode });
  textarea(el).dispatchEvent(event);

  return event;
}

/** Collect the named events fired on the document. */
function record(/** @type {string} */ name) {
  /** @type {Event[]} */
  const events = [];
  document.addEventListener(name, (e) => events.push(e));

  return events;
}

const file = (/** @type {string} */ name, /** @type {string} */ mediaType, size = 4) =>
  new File(['x'.repeat(size)], name, { type: mediaType });

/** A DataTransfer-like object carrying files. */
const transfer = (/** @type {File[]} */ files, text = '') => ({ files, types: ['Files'], getData: () => text });

/** The text of the last polite or assertive announcement, after its frame. */
async function lastAnnouncement() {
  await new Promise((r) => requestAnimationFrame(() => r(undefined)));

  return [...document.querySelectorAll('[data-focsd-announcer]')].map((r) => r.textContent).join('');
}

beforeEach(() => document.body.replaceChildren());

afterEach(() => document.body.replaceChildren());

it('labels a native textarea "Message" by default and takes the label and placeholder', async () => {
  const el = await mount({ placeholder: 'Ask anything' });
  const t = textarea(el);
  const label = el.shadowRoot.querySelector(`label[for="${t.id}"]`);

  expect(t.tagName).toBe('TEXTAREA');
  expect(label.textContent.trim()).toBe('Message');
  expect(t.placeholder).toBe('Ask anything');

  el.label = 'Ask the assistant';
  await el.updateComplete;
  expect(label.textContent.trim()).toBe('Ask the assistant');
});

it('focus() puts focus in the textarea, ahead of the attach button', async () => {
  const el = await mount();

  el.focus();

  expect(el.shadowRoot.activeElement).toBe(textarea(el));
});

it('keeps value in step with typing; the native input event reaches the host', async () => {
  const el = await mount();
  const inputs = record('input');

  await type(el, 'hello');

  expect(el.value).toBe('hello');
  expect(inputs.length).toBe(1);

  el.value = 'set from code';
  await el.updateComplete;
  expect(textarea(el).value).toBe('set from code');
});

it('Enter sends focsd-submit {text, files} and clears; it bubbles and is not composed', async () => {
  const el = await mount();
  const submits = /** @type {CustomEvent[]} */ (record('focsd-submit'));

  await type(el, 'Hi there');
  const event = keydown(el, { key: 'Enter' });
  await el.updateComplete;

  expect(event.defaultPrevented).toBe(true);
  expect(submits).toHaveLength(1);
  expect(submits[0].detail).toEqual({ text: 'Hi there', files: [] });
  expect(submits[0].bubbles).toBe(true);
  expect(submits[0].composed).toBe(false);
  expect(el.value).toBe('');
  expect(textarea(el).value).toBe('');
});

it('Shift+Enter adds a newline (default kept) and sends nothing', async () => {
  const el = await mount();
  const submits = record('focsd-submit');

  await type(el, 'line one');
  const event = keydown(el, { key: 'Enter', shiftKey: true });

  expect(event.defaultPrevented).toBe(false);
  expect(submits).toHaveLength(0);
});

it.each([
  ['isComposing', { key: 'Enter', isComposing: true }],
  ['keyCode 229', { key: 'Enter', keyCode: 229 }],
])('never sends while an IME is composing (%s)', async (_name, init) => {
  const el = await mount();
  const submits = record('focsd-submit');

  await type(el, 'にほんご');
  const event = keydown(el, init);

  expect(event.defaultPrevented).toBe(false);
  expect(submits).toHaveLength(0);
  expect(el.value).toBe('にほんご');
});

it('does not send empty or whitespace-only text', async () => {
  const el = await mount();
  const submits = record('focsd-submit');

  await type(el, '   \n ');
  keydown(el, { key: 'Enter' });
  part(el, 'send').click();

  expect(submits).toHaveLength(0);
  expect(part(el, 'send').getAttribute('aria-disabled')).toBe('true');
});

it('the send button sends and is named "Send"', async () => {
  const el = await mount();
  const submits = record('focsd-submit');

  await type(el, 'go');
  const send = part(el, 'send');

  expect(send.tagName).toBe('BUTTON');
  expect(send.getAttribute('aria-label')).toBe('Send');
  expect(send.hasAttribute('aria-disabled')).toBe(false);
  send.click();

  expect(submits).toHaveLength(1);
});

it('a cancelled focsd-submit keeps the text and files', async () => {
  const el = await mount();
  el.addEventListener('focsd-submit', (/** @type {Event} */ e) => e.preventDefault());

  await type(el, 'keep me');
  el.addFiles([file('a.txt', 'text/plain')]);
  keydown(el, { key: 'Enter' });
  await el.updateComplete;

  expect(el.value).toBe('keep me');
  expect(el.files).toHaveLength(1);
});

it('busy: the send button becomes Stop in the same element, keeps focus and fires focsd-stop', async () => {
  const el = await mount();
  const stops = record('focsd-stop');
  const submits = record('focsd-submit');
  const button = part(el, 'send');
  button.focus();

  el.busy = true;
  await el.updateComplete;

  expect(part(el, 'stop')).toBe(button);
  expect(part(el, 'send')).toBeNull();
  expect(button.getAttribute('aria-label')).toBe('Stop');
  expect(el.shadowRoot.activeElement).toBe(button);

  button.click();
  expect(stops).toHaveLength(1);
  expect(stops[0]).not.toBeInstanceOf(CustomEvent);
  expect(stops[0].bubbles).toBe(true);
  expect(stops[0].composed).toBe(false);
  expect(submits).toHaveLength(0);

  el.busy = false;
  await el.updateComplete;
  expect(part(el, 'send')).toBe(button);
  expect(el.shadowRoot.activeElement).toBe(button);
});

it('busy: Enter does not send and keeps the draft', async () => {
  const el = await mount({ busy: true });
  const submits = record('focsd-submit');

  await type(el, 'next question');
  keydown(el, { key: 'Enter' });

  expect(submits).toHaveLength(0);
  expect(el.value).toBe('next question');
});

it('disabled: the textarea and buttons are disabled and nothing is sent', async () => {
  const el = await mount({ disabled: true, value: 'x' });
  const submits = record('focsd-submit');

  expect(textarea(el).disabled).toBe(true);
  expect(part(el, 'send').disabled).toBe(true);
  expect(part(el, 'attach').disabled).toBe(true);
  keydown(el, { key: 'Enter' });
  el.addFiles([file('a.txt', 'text/plain')]);

  expect(submits).toHaveLength(0);
  expect(el.files).toHaveLength(0);
});

it('the attach button is named "Attach files" and opens the hidden file input', async () => {
  const el = await mount({ accept: 'image/*' });
  const input = el.shadowRoot.querySelector('input[type=file]');
  const click = vi.spyOn(input, 'click');

  expect(part(el, 'attach').getAttribute('aria-label')).toBe('Attach files');
  expect(input.accept).toBe('image/*');
  expect(input.multiple).toBe(true);
  expect(input.getAttribute('tabindex')).toBe('-1');
  part(el, 'attach').click();

  expect(click).toHaveBeenCalledOnce();
});

it('files picked with the input become tiles in a named list, and are sent with the text', async () => {
  const el = await mount();
  const submits = /** @type {CustomEvent[]} */ (record('focsd-submit'));
  const input = el.shadowRoot.querySelector('input[type=file]');
  const picked = [file('a.png', 'image/png'), file('b.pdf', 'application/pdf')];
  Object.defineProperty(input, 'files', { value: picked, configurable: true });
  input.dispatchEvent(new Event('change'));
  await el.updateComplete;

  const list = part(el, 'attachments');
  const tiles = [...list.querySelectorAll('focsd-attachment-tile')];

  expect(list.getAttribute('role')).toBe('list');
  expect(list.getAttribute('aria-label')).toBe('Attachments');
  expect(tiles.map((t) => /** @type {any} */ (t).file.name)).toEqual(['a.png', 'b.pdf']);
  expect(tiles.every((t) => t.hasAttribute('removable'))).toBe(true);

  part(el, 'send').click();
  await el.updateComplete;

  expect(submits[0].detail.files).toEqual(picked);
  expect(submits[0].detail.text).toBe('');
  expect(el.files).toEqual([]);
  expect(part(el, 'attachments')).toBeNull();
});

it('pasting files adds tiles and keeps the clipboard text out of the field', async () => {
  const el = await mount();
  const event = new Event('paste', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, 'clipboardData', { value: transfer([file('shot.png', 'image/png')]) });
  textarea(el).dispatchEvent(event);
  await el.updateComplete;

  expect(event.defaultPrevented).toBe(true);
  expect(el.files.map((/** @type {File} */ f) => f.name)).toEqual(['shot.png']);
});

it('pasting files with text attaches the files and lets the text paste (review item 79)', async () => {
  const el = await mount();
  const event = new Event('paste', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, 'clipboardData', { value: transfer([file('shot.png', 'image/png')], 'See this screenshot') });
  textarea(el).dispatchEvent(event);
  await el.updateComplete;

  expect(event.defaultPrevented).toBe(false);
  expect(el.files.map((/** @type {File} */ f) => f.name)).toEqual(['shot.png']);
});

it('pasting a file copied in a file manager does not paste its name as text', async () => {
  const el = await mount();
  const event = new Event('paste', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, 'clipboardData', { value: transfer([file('notes.txt', 'text/plain')], 'notes.txt') });
  textarea(el).dispatchEvent(event);
  await el.updateComplete;

  expect(event.defaultPrevented).toBe(true);
  expect(el.files.map((/** @type {File} */ f) => f.name)).toEqual(['notes.txt']);
});

it('pasting plain text is left to the textarea', async () => {
  const el = await mount();
  const event = new Event('paste', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, 'clipboardData', { value: { files: [], types: ['text/plain'], getData: () => 'hi' } });
  textarea(el).dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
  expect(el.files).toEqual([]);
});

it('a rejected type is not added, is announced with its reason and shown', async () => {
  const el = await mount({ accept: 'image/*' });

  el.addFiles([file('ok.png', 'image/png'), file('bad.exe', 'application/octet-stream')]);
  await el.updateComplete;

  expect(el.files.map((/** @type {File} */ f) => f.name)).toEqual(['ok.png']);
  expect(await lastAnnouncement()).toBe('bad.exe was not attached: this file type is not accepted');
  expect(part(el, 'error').textContent.trim()).toBe('bad.exe was not attached: this file type is not accepted');
});

it('a file over max-file-size is rejected as too large', async () => {
  const el = await mount();
  el.setAttribute('max-file-size', '10');
  await el.updateComplete;

  el.addFiles([file('big.txt', 'text/plain', 11), file('small.txt', 'text/plain', 10)]);
  await el.updateComplete;

  expect(el.files.map((/** @type {File} */ f) => f.name)).toEqual(['small.txt']);
  expect(await lastAnnouncement()).toBe('big.txt was not attached: the file is too large');
});

it('max-files (default 10) caps the attachments and says why', async () => {
  const el = await mount();

  expect(el.maxFiles).toBe(10);
  el.setAttribute('max-files', '2');
  await el.updateComplete;

  el.addFiles([file('1.txt', 'text/plain'), file('2.txt', 'text/plain'), file('3.txt', 'text/plain')]);
  await el.updateComplete;

  expect(el.files).toHaveLength(2);
  expect(await lastAnnouncement()).toBe('3.txt was not attached: at most 2 files can be attached');
});

it.each(['abc', '-1', 'Infinity'])('an invalid max-files (%j) falls back to the default 10', async (value) => {
  const el = await mount();

  el.setAttribute('max-files', value);
  await el.updateComplete;
  el.addFiles(Array.from({ length: 11 }, (_, i) => file(`${i}.txt`, 'text/plain')));
  await el.updateComplete;

  expect(el.files).toHaveLength(10);
  expect(await lastAnnouncement()).toBe('10.txt was not attached: at most 10 files can be attached');
});

it('several rejections are announced together, once', async () => {
  const el = await mount({ accept: '.txt' });

  el.addFiles([file('a.png', 'image/png'), file('b.png', 'image/png')]);

  expect(await lastAnnouncement()).toBe(
    'a.png was not attached: this file type is not accepted b.png was not attached: this file type is not accepted',
  );
});

it('the error clears on the next successful add', async () => {
  const el = await mount({ accept: '.txt' });

  el.addFiles([file('a.png', 'image/png')]);
  await el.updateComplete;
  el.addFiles([file('a.txt', 'text/plain')]);
  await el.updateComplete;

  expect(part(el, 'error')).toBeNull();
});

it('removing a tile drops that file, keeps the others and moves focus to the textarea', async () => {
  const el = await mount();
  const a = file('same.txt', 'text/plain');
  const b = file('same.txt', 'text/plain');
  el.addFiles([a, b]);
  await el.updateComplete;

  const first = el.shadowRoot.querySelector('focsd-attachment-tile');
  await first.updateComplete;
  first.shadowRoot.querySelector('[part~="remove"]').click();
  await el.updateComplete;

  expect(el.files).toEqual([b]);
  expect(el.shadowRoot.activeElement).toBe(textarea(el));
});

it('files returns a copy; addFiles never mutates the list it is given', async () => {
  const el = await mount();
  const list = Object.freeze([file('a.txt', 'text/plain')]);

  el.addFiles(list);
  el.files.push(file('x', ''));

  expect(el.files).toHaveLength(1);
});

it('dragging files over the composer outlines it and shows "Drop files to attach"; drop adds them', async () => {
  const el = await mount();
  const field = part(el, 'field');

  const drag = (/** @type {string} */ name, /** @type {File[]} */ files = []) => {
    const event = new Event(name, { bubbles: true, cancelable: true, composed: true });
    Object.defineProperty(event, 'dataTransfer', { value: transfer(files) });
    field.dispatchEvent(event);

    return event;
  };

  expect(part(el, 'drop-text')).toBeNull();
  drag('dragenter');
  const over = drag('dragover');
  await el.updateComplete;

  expect(over.defaultPrevented).toBe(true);
  expect(field.getAttribute('part')).toContain('dragging');
  expect(part(el, 'drop-text').textContent.trim()).toBe('Drop files to attach');

  drag('dragleave');
  await el.updateComplete;
  expect(part(el, 'drop-text')).toBeNull();

  drag('dragenter');
  const drop = drag('drop', [file('d.txt', 'text/plain')]);
  await el.updateComplete;

  expect(drop.defaultPrevented).toBe(true);
  expect(part(el, 'drop-text')).toBeNull();
  expect(el.files.map((/** @type {File} */ f) => f.name)).toEqual(['d.txt']);
});

it('dragging text (not files) does not turn on the drop zone', async () => {
  const el = await mount();
  const event = new Event('dragenter', { bubbles: true, cancelable: true, composed: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files: [], types: ['text/plain'] } });
  part(el, 'field').dispatchEvent(event);
  await el.updateComplete;

  expect(part(el, 'drop-text')).toBeNull();
});

it('auto-grows to at most 8 lines (CSS: field-sizing with an 8lh cap)', async () => {
  const el = await mount();

  const css = /** @type {any} */ (el.constructor).styles
    .flat(Infinity)
    .map((/** @type {any} */ s) => s.cssText)
    .join('');

  expect(css).toMatch(/field-sizing:\s*content/);
  expect(css).toMatch(/max-block-size:\s*calc\(8lh/);
});

it('send, stop and attach follow the density control height (32, 36 or 44 px; all above the 24 px WCAG 2.5.8 minimum)', async () => {
  const el = await mount();

  const css = /** @type {any} */ (el.constructor).styles
    .flat(Infinity)
    .map((/** @type {any} */ s) => s.cssText)
    .join('');

  expect(css).toMatch(/--_target:\s*var\(--focsd-control-height/);
});
