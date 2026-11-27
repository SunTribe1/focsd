// @vitest-environment happy-dom
// focsd-attachment-tile: a list item with the file's name, size and type icon, and a remove button.
import { afterEach, expect, it } from 'vitest';
import '../src/terms.js';
import '../src/attachment-tile.js';

/** @param {Record<string, unknown>} props */
async function mount(props = {}) {
  const el = /** @type {any} */ (document.createElement('focsd-attachment-tile'));
  Object.assign(el, props);
  document.body.append(el);
  await el.updateComplete;

  return el;
}

const part = (/** @type {any} */ el, /** @type {string} */ name) => el.shadowRoot.querySelector(`[part~="${name}"]`);

afterEach(() => document.body.replaceChildren());

it('is a list item with the name and the formatted size', async () => {
  const el = await mount({ name: 'report.pdf', size: 2_400_000, mediaType: 'application/pdf' });

  expect(el.getAttribute('role')).toBe('listitem');
  expect(part(el, 'name').textContent.trim()).toBe('report.pdf');
  expect(part(el, 'size').textContent.trim()).toBe('2.4 MB');
  expect(part(el, 'tile')).not.toBeNull();
});

it('reads name, size and type from a File', async () => {
  const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
  const el = await mount({ file });

  expect(part(el, 'name').textContent.trim()).toBe('notes.txt');
  expect(part(el, 'size').textContent.trim()).toBe('5 bytes');
  expect(el.shadowRoot.querySelector('[data-kind]').dataset.kind).toBe('file');
});

it('shows an image icon for image types and a file icon otherwise', async () => {
  const image = await mount({ name: 'a.png', size: 1, mediaType: 'image/png' });
  const other = await mount({ name: 'a.zip', size: 1, mediaType: 'application/zip' });

  expect(image.shadowRoot.querySelector('[data-kind]').dataset.kind).toBe('image');
  expect(other.shadowRoot.querySelector('[data-kind]').dataset.kind).toBe('file');
});

it('has no remove button unless removable', async () => {
  const el = await mount({ name: 'a.txt', size: 1 });

  expect(part(el, 'remove')).toBeNull();
});

it('names the remove button "Remove {name}" and fires focsd-attachment-remove (bubbles, not composed)', async () => {
  const el = await mount({ name: 'a.txt', size: 1, removable: true });
  const remove = part(el, 'remove');
  /** @type {CustomEvent[]} */
  const events = [];
  document.body.addEventListener('focsd-attachment-remove', (e) => events.push(/** @type {CustomEvent} */ (e)));

  expect(remove.tagName).toBe('BUTTON');
  expect(remove.getAttribute('aria-label')).toBe('Remove a.txt');
  remove.click();

  expect(events).toHaveLength(1);
  expect(events[0].detail).toEqual({ name: 'a.txt' });
  expect(events[0].bubbles).toBe(true);
  expect(events[0].composed).toBe(false);
});

it('reflects the removable attribute and reads media-type', async () => {
  const el = document.createElement('focsd-attachment-tile');
  el.setAttribute('name', 'b.jpg');
  el.setAttribute('size', '1500');
  el.setAttribute('media-type', 'image/jpeg');
  el.setAttribute('removable', '');
  document.body.append(el);
  await /** @type {any} */ (el).updateComplete;

  expect(part(el, 'size').textContent.trim()).toBe('1.5 kB');
  expect(/** @type {any} */ (el).shadowRoot.querySelector('[data-kind]').dataset.kind).toBe('image');
  expect(part(el, 'remove')).not.toBeNull();
});

it.each([
  ['uploading', 'Uploading'],
  ['error', 'Upload failed'],
])('status %s shows the word %s', async (status, word) => {
  const el = await mount({ name: 'a.txt', size: 1, status });

  expect(part(el, 'status').textContent.trim()).toBe(word);
  expect(el.getAttribute('status')).toBe(status);
});

it('status ready shows no status word', async () => {
  const el = await mount({ name: 'a.txt', size: 1 });

  expect(el.status).toBe('ready');
  expect(part(el, 'status')).toBeNull();
});

it('renders the name as text, never markup', async () => {
  const el = await mount({ name: '<img src=x onerror=alert(1)>.png', size: 1, removable: true });

  expect(el.shadowRoot.querySelector('img')).toBeNull();
  expect(part(el, 'remove').getAttribute('aria-label')).toBe('Remove <img src=x onerror=alert(1)>.png');
});
