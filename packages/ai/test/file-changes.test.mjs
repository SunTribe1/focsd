// @vitest-environment happy-dom
// focsd-file-changes: the files an agent changed. Each file is a button named in full; one is in the
// tab order; arrow keys move between them; choosing one fires focsd-file-select.
import { afterEach, describe, expect, it } from 'vitest';
import '../src/file-changes.js';

afterEach(() => document.body.replaceChildren());

const FILES = [
  { path: 'src/lib/runs.ts', status: 'modified', additions: 24, deletions: 9 },
  { path: 'src/app/load-more.tsx', status: 'added', additions: 36 },
  { path: 'src/lib/cache.ts', status: 'deleted', deletions: 12 },
  { status: 'added' },
];

/** @param {Record<string, unknown>} props */
async function mount(props = {}) {
  const el = /** @type {any} */ (Object.assign(document.createElement('focsd-file-changes'), { files: FILES, ...props }));

  document.body.append(el);
  await el.updateComplete;

  return el;
}

const buttons = (/** @type {any} */ el) => [...el.shadowRoot.querySelectorAll('button[part~="file"]')];

describe('focsd-file-changes', () => {
  it('lists files with a path, names each in full and drops entries without a path', async () => {
    const el = await mount();

    expect(buttons(el)).toHaveLength(3);
    expect(buttons(el)[0].getAttribute('aria-label')).toBe('src/lib/runs.ts, modified, 24 lines added, 9 removed');
    expect(el.shadowRoot.querySelector('[part~="count"]').textContent).toBe('3 files');
    expect(el.shadowRoot.querySelector('[part~="totals"] .focsd-visually-hidden').textContent).toBe('60 lines added, 21 removed');
  });

  it('keeps one tab stop: the chosen file, or the first when the choice is missing', async () => {
    const chosen = await mount({ selected: 'src/lib/cache.ts' });

    expect(buttons(chosen).map((b) => b.tabIndex)).toEqual([-1, -1, 0]);
    expect(buttons(chosen)[2].getAttribute('aria-current')).toBe('true');

    const stale = await mount({ selected: 'gone.ts' });

    expect(buttons(stale).map((b) => b.tabIndex)).toEqual([0, -1, -1]);
  });

  it('fires focsd-file-select with the path and file, and marks the choice', async () => {
    const el = await mount();
    /** @type {any[]} */
    const seen = [];

    el.addEventListener('focsd-file-select', (/** @type {CustomEvent} */ e) => seen.push(e.detail));
    buttons(el)[1].click();
    await el.updateComplete;

    expect(seen).toEqual([{ path: 'src/app/load-more.tsx', file: { ...FILES[1], path: 'src/app/load-more.tsx' } }]);
    expect(el.selected).toBe('src/app/load-more.tsx');
  });

  it('moves focus with the arrow keys, Home and End', async () => {
    const el = await mount();
    const list = el.shadowRoot.querySelector('[part~="list"]');

    const press = (/** @type {HTMLElement} */ from, /** @type {string} */ key) =>
      from.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));

    buttons(el)[0].focus();
    press(buttons(el)[0], 'ArrowDown');
    expect(el.shadowRoot.activeElement).toBe(buttons(el)[1]);
    press(buttons(el)[1], 'End');
    expect(el.shadowRoot.activeElement).toBe(buttons(el)[2]);
    press(buttons(el)[2], 'Home');
    expect(el.shadowRoot.activeElement).toBe(buttons(el)[0]);
    expect(list).not.toBeNull();
  });
});
