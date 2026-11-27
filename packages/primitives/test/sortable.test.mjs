// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SortableController, edgeScroll, isBefore, reorder, stepFor } from '../src/internal/sortable.js';

describe('reorder', () => {
  it('moves forward and back without mutating', () => {
    const list = ['a', 'b', 'c', 'd', 'e'];
    expect(reorder(list, 1, 3)).toEqual(['a', 'c', 'd', 'b', 'e']);
    expect(reorder(list, 3, 0)).toEqual(['d', 'a', 'b', 'c', 'e']);
    expect(list).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('ignores out-of-range moves', () => {
    expect(reorder(['a', 'b'], 0, 5)).toEqual(['b', 'a']);
    expect(reorder(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
  });
});

describe('stepFor', () => {
  it('maps arrows on each axis, mirroring Left/Right in RTL', () => {
    expect(stepFor('ArrowUp', 'vertical', false)).toBe(-1);
    expect(stepFor('ArrowDown', 'vertical', false)).toBe(1);
    expect(stepFor('ArrowLeft', 'vertical', false)).toBe(0);
    expect(stepFor('ArrowUp', 'horizontal', false)).toBe(0);
    expect(stepFor('ArrowLeft', 'horizontal', false)).toBe(-1);
    expect(stepFor('ArrowRight', 'horizontal', false)).toBe(1);
    expect(stepFor('ArrowLeft', 'horizontal', true)).toBe(1);
    expect(stepFor('ArrowRight', 'both', true)).toBe(-1);
    expect(stepFor('ArrowDown', 'both', false)).toBe(1);
    expect(stepFor('Home', 'both', false)).toBe(0);
  });
});

describe('edgeScroll', () => {
  it('scrolls up to 12 px per frame within 48 px of an edge', () => {
    expect(edgeScroll(200, 0, 400)).toBe(0);
    expect(edgeScroll(48, 0, 400)).toBe(0);
    expect(edgeScroll(24, 0, 400)).toBe(-6);
    expect(edgeScroll(0, 0, 400)).toBe(-12);
    expect(edgeScroll(-30, 0, 400)).toBe(-12);
    expect(edgeScroll(376, 0, 400)).toBe(6);
    expect(edgeScroll(420, 0, 400)).toBe(12);
  });
  it('picks the nearer edge in a small container', () => {
    expect(edgeScroll(10, 0, 60)).toBeLessThan(0);
    expect(edgeScroll(50, 0, 60)).toBeGreaterThan(0);
  });
});

describe('isBefore', () => {
  /** @param {number} left @param {number} top */
  const rect = (left, top, width = 100, height = 20) =>
    /** @type {DOMRect} */ ({ left, top, width, height, right: left + width, bottom: top + height });

  it('compares centers on one axis', () => {
    expect(isBefore(rect(0, 0), { x: 50, y: 15 }, 'vertical', false)).toBe(true);
    expect(isBefore(rect(0, 0), { x: 50, y: 5 }, 'vertical', false)).toBe(false);
    expect(isBefore(rect(0, 0), { x: 60, y: 0 }, 'horizontal', false)).toBe(true);
    expect(isBefore(rect(0, 0), { x: 60, y: 0 }, 'horizontal', true)).toBe(false);
    expect(isBefore(rect(0, 0), { x: 40, y: 0 }, 'horizontal', true)).toBe(true);
  });
  it('uses reading order for wrapping items', () => {
    expect(isBefore(rect(300, 0), { x: 10, y: 40 }, 'both', false)).toBe(true);
    expect(isBefore(rect(0, 50), { x: 300, y: 10 }, 'both', false)).toBe(false);
    expect(isBefore(rect(0, 0), { x: 60, y: 10 }, 'both', false)).toBe(true);
    expect(isBefore(rect(0, 0), { x: 40, y: 10 }, 'both', false)).toBe(false);
  });
});

/**
 * A host with five items, each with a handle button; `place` moves the DOM node.
 * @param {{ updateComplete?: () => Promise<unknown>, list?: boolean }} [extra] `list`: a `ul` of `li` items.
 */
function fixture(extra = {}) {
  document.body.innerHTML = '';
  const host = document.createElement(extra.list ? 'ul' : 'div');
  const outside = document.createElement('button');

  for (const name of ['a', 'b', 'c', 'd', 'e']) {
    const item = document.createElement(extra.list ? 'li' : 'div');
    const handle = document.createElement('button');

    item.dataset.name = name;
    handle.className = 'handle';
    item.append(handle);
    host.append(item);
  }

  document.body.append(host, outside);

  if (extra.updateComplete) Object.defineProperty(host, 'updateComplete', { get: extra.updateComplete });
  const announced = /** @type {string[]} */ ([]);
  const commit = vi.fn(() => true);

  const place = vi.fn((/** @type {HTMLElement} */ item, /** @type {number} */ index) => {
    const others = items().filter((other) => other !== item);

    if (index < others.length) others[index].before(item);
    else host.append(item);
  });

  const items = () => /** @type {HTMLElement[]} */ ([...host.children]).filter((el) => el.dataset.name);
  const handleOf = (/** @type {HTMLElement} */ item) => /** @type {HTMLElement} */ (item.querySelector('.handle'));

  const controller = new SortableController(/** @type {any} */ (host), {
    items,
    handleOf,
    labelOf: (item) => item.dataset.name ?? '',
    announce: (text) => announced.push(text),
    place,
    commit,
    terms: {
      grabbed: (item, position, total) => `grabbed ${item} ${position}/${total}`,
      movedTo: (position, total) => `moved ${position}/${total}`,
      droppedAt: (position) => `dropped ${position}`,
      reorderCanceled: (position) => `canceled ${position}`,
    },
  });

  controller.hostConnected();

  const order = () =>
    items()
      .map((item) => item.dataset.name)
      .join(' ');

  const handle = (/** @type {number} */ index) => handleOf(items()[index]);

  return { host, outside, items, handle, order, announced, commit, place, controller };
}

/** @param {EventTarget} target @param {string} key */
const press = (target, key) => target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));

/** @param {EventTarget} target @param {string} type @param {number} x @param {number} y */
const pointer = (target, type, x, y) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: x,
      clientY: y,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SortableController keyboard grab', () => {
  afterEach(() => vi.restoreAllMocks());

  it('Tab while grabbed drops', () => {
    const f = fixture();

    f.handle(0).focus();
    press(f.handle(0), ' ');
    press(f.handle(0), 'ArrowDown');
    press(f.handle(1), 'Tab');
    expect(f.order()).toBe('b a c d e');
    expect(f.commit).toHaveBeenCalledWith(0, 1, f.items()[1]);
    expect(f.announced.at(-1)).toBe('dropped 2');
  });

  it('focus leaving the host cancels: order restored, nothing committed', async () => {
    const f = fixture();

    f.handle(0).focus();
    press(f.handle(0), ' ');
    press(f.handle(0), 'ArrowDown');
    f.outside.focus();
    await settle();
    expect(f.order()).toBe('a b c d e');
    expect(f.commit).not.toHaveBeenCalled();
    expect(f.announced.at(-1)).toBe('canceled 1');
    press(f.handle(1), 'ArrowDown');
    expect(f.order()).toBe('a b c d e');
  });

  it('keeps the grab when the host re-renders and focus returns to the handle', async () => {
    /** @type {() => void} */
    let rendered = () => {};
    const f = fixture({ updateComplete: () => new Promise((resolve) => (rendered = () => resolve(true))) });

    f.handle(0).focus();
    press(f.handle(0), ' ');
    const grabbed = f.items()[0];

    f.outside.focus(); // a re-render blurs the handle…
    grabbed.querySelector('button')?.focus(); // …and the host puts focus back
    rendered();
    await settle();
    press(grabbed.querySelector('button') ?? f.host, 'ArrowDown');
    expect(f.order()).toBe('b a c d e');
    expect(f.announced.at(-1)).toBe('moved 2/5');
  });
});

describe('SortableController with a rejecting host update', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports the error and still cancels the grab when focus leaves', async () => {
    const error = new Error('render failed');
    const reported = vi.fn();

    vi.stubGlobal('reportError', reported);
    const f = fixture({ updateComplete: () => Promise.reject(error) });

    f.handle(0).focus();
    press(f.handle(0), ' ');
    press(f.handle(0), 'ArrowDown');
    await settle(); // the post-update refocus has run
    f.outside.focus();
    await settle();
    vi.unstubAllGlobals();
    expect(f.order()).toBe('a b c d e');
    expect(f.commit).not.toHaveBeenCalled();
    expect(f.announced.at(-1)).toBe('canceled 1');
    expect(reported).toHaveBeenCalledWith(error);
  });

  it('falls back to console.error without reportError, and still settles a drop', async () => {
    const error = new Error('render failed');
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubGlobal('reportError', undefined);
    const f = fixture({ updateComplete: () => Promise.reject(error) });
    const item = f.items()[0];
    const animate = vi.fn();
    let top = 0;

    vi.spyOn(item, 'getBoundingClientRect').mockImplementation(
      () => /** @type {DOMRect} */ ({ left: 0, top, width: 10, height: 10, right: 10, bottom: top + 10 }),
    );
    Object.defineProperty(item, 'animate', { value: animate });
    pointer(f.handle(0), 'pointerdown', 0, 0);
    pointer(f.handle(0), 'pointermove', 0, 30);
    top = 30;
    pointer(f.handle(0), 'pointerup', 0, 30);
    top = 50;
    await settle();
    vi.unstubAllGlobals();
    expect(logged).toHaveBeenCalledWith(error);
    expect(animate).toHaveBeenCalledTimes(1);
  });
});

describe('SortableController keyboard grab guards', () => {
  afterEach(() => vi.restoreAllMocks());

  it('any pointerdown cancels the grab', () => {
    const f = fixture();

    f.handle(2).focus();
    press(f.handle(2), ' ');
    press(f.handle(2), 'ArrowUp');
    pointer(document.body, 'pointerdown', 0, 0);
    expect(f.order()).toBe('a b c d e');
    expect(f.commit).not.toHaveBeenCalled();
    expect(f.announced.at(-1)).toBe('canceled 3');
  });

  it("an arrow on another item's handle does not move the stale grab", () => {
    const f = fixture();

    f.handle(0).focus();
    press(f.handle(0), ' ');
    press(f.handle(3), 'ArrowDown');
    expect(f.order()).toBe('a b c d e');
    expect(f.place).not.toHaveBeenCalled();
    press(f.handle(0), 'ArrowDown');
    expect(f.order()).toBe('a b c d e');
  });

  it('a grabbed item that was removed ends the grab without placing it', () => {
    const f = fixture();

    f.handle(1).focus();
    press(f.handle(1), ' ');
    const removed = f.items()[1];

    removed.remove();
    press(/** @type {HTMLElement} */ (removed.querySelector('button')), 'ArrowDown');
    expect(f.place).not.toHaveBeenCalled();
    expect(removed.isConnected).toBe(false);
    f.handle(0).focus();
    press(f.handle(0), ' ');
    expect(f.announced.at(-1)).toBe('grabbed a 1/4');
  });
});

describe('SortableController pointer drag', () => {
  afterEach(() => vi.restoreAllMocks());

  it('survives a setPointerCapture that throws and accepts the next press', () => {
    const f = fixture();

    const capture = vi.spyOn(HTMLElement.prototype, 'setPointerCapture').mockImplementation(() => {
      throw new DOMException('inactive pointer', 'NotFoundError');
    });

    pointer(f.handle(0), 'pointerdown', 0, 0);
    expect(capture).toHaveBeenCalled();
    pointer(document, 'pointermove', 0, 20);
    expect(f.items()[0].hasAttribute('data-dragging')).toBe(true);
    pointer(document, 'pointerup', 0, 20);
    expect(f.items()[0].hasAttribute('data-dragging')).toBe(false);
    pointer(f.handle(1), 'pointerdown', 0, 0);
    pointer(document, 'pointermove', 0, 20);
    expect(f.items()[1].hasAttribute('data-dragging')).toBe(true);
    pointer(document, 'pointercancel', 0, 20);
  });

  it('Escape cancels a drag and stops listening', () => {
    const f = fixture();

    pointer(f.handle(0), 'pointerdown', 0, 0);
    pointer(f.handle(0), 'pointermove', 0, 20);
    expect(f.host.querySelector('[data-sortable-placeholder]')).not.toBeNull();
    press(document.body, 'Escape');
    expect(f.items()[0].hasAttribute('data-dragging')).toBe(false);
    expect(f.host.querySelector('[data-sortable-placeholder]')).toBeNull();
    expect(f.commit).not.toHaveBeenCalled();
    expect(f.announced).toEqual(['canceled 1']);
    press(document.body, 'Escape');
    expect(f.announced).toEqual(['canceled 1']);
  });
});

describe('SortableController pointer drag (14c-9 review fixes)', () => {
  afterEach(() => vi.restoreAllMocks());

  it("puts the author's inline styles back after a drag, rather than deleting them", () => {
    const f = fixture();
    const item = f.items()[0];

    item.style.setProperty('width', '12rem', 'important');
    item.style.marginTop = '4px';
    item.style.transform = 'rotate(1deg)';
    item.style.color = 'red';
    pointer(f.handle(0), 'pointerdown', 0, 0);
    pointer(document, 'pointermove', 0, 20);
    expect(item.style.position).toBe('fixed');
    pointer(document, 'pointerup', 0, 20);
    expect(item.style.position).toBe('');
    expect(item.style.getPropertyValue('width')).toBe('12rem');
    expect(item.style.getPropertyPriority('width')).toBe('important');
    expect(item.style.marginTop).toBe('4px');
    expect(item.style.transform).toBe('rotate(1deg)');
    expect(item.style.color).toBe('red');
    expect(item.style.zIndex).toBe('');
    expect(item.style.pointerEvents).toBe('');
  });

  it('Escape before the drag threshold is left to the page', () => {
    const f = fixture();

    pointer(f.handle(0), 'pointerdown', 0, 0);
    pointer(document, 'pointermove', 0, 2);
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    document.body.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    expect(f.announced).toEqual([]);
    pointer(document, 'pointerup', 0, 2);
  });

  it('the placeholder in a list is an aria-hidden li', () => {
    const f = fixture({ list: true });

    pointer(f.handle(0), 'pointerdown', 0, 0);
    pointer(document, 'pointermove', 0, 20);
    const placeholder = f.host.querySelector('[data-sortable-placeholder]');

    expect(placeholder?.localName).toBe('li');
    expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
    pointer(document, 'pointercancel', 0, 20);
  });
});

describe('SortableController settle', () => {
  afterEach(() => vi.restoreAllMocks());

  it('measures the settle animation after the host update', async () => {
    /** @type {() => void} */
    let rendered = () => {};
    const f = fixture({ updateComplete: () => new Promise((resolve) => (rendered = () => resolve(true))) });
    const item = f.items()[0];
    let top = 0;

    vi.spyOn(item, 'getBoundingClientRect').mockImplementation(
      () => /** @type {DOMRect} */ ({ left: 0, top, width: 10, height: 10, right: 10, bottom: top + 10 }),
    );
    const animate = vi.fn();

    Object.defineProperty(item, 'animate', { value: animate });
    pointer(f.handle(0), 'pointerdown', 0, 0);
    pointer(f.handle(0), 'pointermove', 0, 30);
    top = 30; // where it was dropped
    pointer(f.handle(0), 'pointerup', 0, 30);
    top = 50; // the host's render moves the node
    rendered();
    await settle();
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0][0][0]).toEqual({ transform: 'translate(0px, -20px)' });
  });
});
