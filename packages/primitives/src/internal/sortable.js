/**
 * Sortable index maths and the reorder controller behind `focsd-list` and `focsd-tag-input`
 * (private: bases import it by relative path). Reorders within one container.
 *
 * Keyboard, on an item's handle: Space or Enter grabs, the arrow keys move one step, Space or
 * Enter drops, Escape cancels and Tab drops. Pointer and touch, from the handle: past 4 px the item
 * follows the pointer and a placeholder marks the drop slot; release drops, pointercancel cancels.
 * The controller has no Lit import: it implements `hostConnected` / `hostDisconnected`, so a Lit
 * host can `addController` it.
 */

/**
 * A copy of `items` with the item at `from` moved so that it ends at index `to`.
 * `to` is clamped into range; an invalid `from` returns an unchanged copy.
 * @template T
 * @param {readonly T[]} items
 * @param {number} from
 * @param {number} to The moved item's final index.
 * @returns {T[]}
 */
export function reorder(items, from, to) {
  const copy = [...items];

  if (!Number.isInteger(from) || from < 0 || from >= copy.length) return copy;
  const target = Math.min(Math.max(Math.trunc(to) || 0, 0), copy.length - 1);
  const [moved] = /** @type {[T]} */ (copy.splice(from, 1));

  copy.splice(target, 0, moved);

  return copy;
}

/** Pointer travel (px) before a press on the handle becomes a drag. */
const DRAG_THRESHOLD = 4;

/** Distance (px) from the scroll container's edge where auto-scroll starts. */
const SCROLL_EDGE = 48;

/** Largest auto-scroll step (px per frame). */
const SCROLL_STEP = 12;

/** Settle animation after a pointer drop (ms); skipped under reduced motion. */
const SETTLE_MS = 150;

/**
 * @typedef {object} SortableTerms Localized announcements (from the translation table).
 * @property {(item: string, position: number, total: number) => string} grabbed
 * @property {(position: number, total: number) => string} movedTo
 * @property {(position: number) => string} droppedAt
 * @property {(position: number) => string} reorderCanceled
 */

/**
 * The four sortable announcements, read from the host's translation table.
 * @param {{ term(key: string, ...args: unknown[]): string }} localize The host's `LocalizeController`.
 * @returns {SortableTerms}
 */
export const sortableTerms = (localize) => ({
  grabbed: (item, position, total) => localize.term('grabbed', item, position, total),
  movedTo: (position, total) => localize.term('movedTo', position, total),
  droppedAt: (position) => localize.term('droppedAt', position),
  reorderCanceled: (position) => localize.term('reorderCanceled', position),
});

/**
 * @typedef {object} SortableOptions
 * @property {() => HTMLElement[]} items Current items in order.
 * @property {(item: HTMLElement) => HTMLElement | null} handleOf The item's drag handle button.
 * @property {(item: HTMLElement) => string} labelOf Text used in announcements.
 * @property {(text: string) => void} announce Writes to the host's polite status region.
 * @property {(item: HTMLElement, index: number) => void} place Moves the item to `index` (DOM or data; the host decides).
 * @property {(from: number, to: number, item: HTMLElement) => boolean} commit Called on drop; return false to cancel (the controller puts the item back).
 * @property {'vertical' | 'horizontal' | 'both'} [axis] Arrow keys that move: vertical (Up/Down), horizontal (Left/Right, mirrored in RTL) or both.
 * @property {SortableTerms} terms Localized messages.
 */

/**
 * @typedef {object} SortableHost The part of a (Lit) host element the controller uses.
 * @property {EventTarget['addEventListener']} addEventListener
 * @property {EventTarget['removeEventListener']} removeEventListener
 * @property {(controller: { hostConnected(): void, hostDisconnected(): void }) => void} [addController]
 * @property {Promise<unknown>} [updateComplete]
 * @property {Document} ownerDocument
 */

/**
 * @typedef {object} Drag A pointer gesture from a handle.
 * @property {HTMLElement} item
 * @property {HTMLElement} handle
 * @property {number} pointerId
 * @property {number} from The item's index at pointerdown.
 * @property {number} startX
 * @property {number} startY
 * @property {number} x Latest pointer position.
 * @property {number} y
 * @property {boolean} active Past the threshold.
 * @property {number} index The placeholder's slot among the other items.
 * @property {number} offsetX Correction for a containing block that is not the viewport.
 * @property {number} offsetY
 * @property {HTMLElement | null} placeholder
 * @property {Element | null} scroller
 * @property {number} frame The auto-scroll animation frame.
 * @property {string} style The item's inline styles before the drag, put back when it ends.
 */

/**
 * The arrow-key step (-1, 0 or 1) for a key on an axis.
 * @param {string} key
 * @param {'vertical' | 'horizontal' | 'both'} axis
 * @param {boolean} rtl
 */
export function stepFor(key, axis, rtl) {
  const vertical = axis !== 'horizontal';
  const horizontal = axis !== 'vertical';

  if (vertical && key === 'ArrowUp') return -1;

  if (vertical && key === 'ArrowDown') return 1;

  if (horizontal && key === 'ArrowLeft') return rtl ? 1 : -1;

  if (horizontal && key === 'ArrowRight') return rtl ? -1 : 1;

  return 0;
}

/**
 * The auto-scroll step for a pointer coordinate inside a container's range: negative near the
 * start edge, positive near the end edge, 0 elsewhere; at most `SCROLL_STEP`.
 * @param {number} position
 * @param {number} start
 * @param {number} end
 */
export function edgeScroll(position, start, end) {
  const fromStart = position - start;
  const fromEnd = end - position;
  const speed = (/** @type {number} */ distance) => Math.ceil((SCROLL_STEP * (SCROLL_EDGE - Math.max(distance, 0))) / SCROLL_EDGE);

  if (fromStart < SCROLL_EDGE && fromStart <= fromEnd) return -Math.min(speed(fromStart), SCROLL_STEP);

  if (fromEnd < SCROLL_EDGE) return Math.min(speed(fromEnd), SCROLL_STEP);

  return 0;
}

/**
 * Whether a rect comes before the pointer in reading order on the axis.
 * @param {Pick<DOMRect, 'left' | 'top' | 'width' | 'height' | 'bottom'>} rect
 * @param {{ x: number, y: number }} point
 * @param {'vertical' | 'horizontal' | 'both'} axis
 * @param {boolean} rtl
 */
export function isBefore(rect, point, axis, rtl) {
  const { x, y } = point;
  const centerX = rect.left + rect.width / 2;
  const beforeX = rtl ? centerX > x : centerX < x;

  if (axis === 'vertical') return rect.top + rect.height / 2 < y;

  if (axis === 'horizontal') return beforeX;

  if (rect.bottom < y) return true;

  return rect.top <= y && y <= rect.bottom && beforeX;
}

/** @param {Element} element */
const isRtl = (element) => getComputedStyle(element).direction === 'rtl';

/** @param {Element} element The parent across shadow boundaries. */
function parentOf(element) {
  const root = element.getRootNode();

  return element.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
}

/**
 * The nearest scrollable ancestor (across shadow boundaries), else the document's scrolling element.
 * @param {Element} element
 */
function scrollerOf(element) {
  for (let node = parentOf(element); node; node = parentOf(node)) {
    const { overflowX, overflowY } = getComputedStyle(node);
    const scrolls = /auto|scroll/.test(overflowY + overflowX);

    if (scrolls && (node.scrollHeight > node.clientHeight || node.scrollWidth > node.clientWidth)) return node;
  }

  return document.scrollingElement;
}

/**
 * A host update that rejects is reported, not left unhandled; the work waiting on it still runs.
 * @param {unknown} error
 */
function report(error) {
  if (globalThis.reportError) globalThis.reportError(error);
  else console.error(error);
}

/**
 * Resolves after the host's pending update, whether it fulfils or rejects.
 * @param {Promise<unknown> | undefined} update The host's `updateComplete`, read once.
 */
const afterUpdate = (update) => Promise.resolve(update).catch(report);

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export class SortableController {
  #host;

  #options;

  /** @type {{ item: HTMLElement, from: number } | null} The keyboard grab. */
  #grab = null;

  /** @type {Drag | null} */
  #drag = null;

  /**
   * @param {SortableHost & HTMLElement} host Listens for keydown and pointerdown here (delegated).
   * @param {SortableOptions} options
   */
  constructor(host, options) {
    this.#host = host;
    this.#options = options;
    host.addController?.(this);
  }

  /** Whether an item is grabbed (keyboard) or being dragged (pointer). */
  get active() {
    return this.#grab !== null || this.#drag?.active === true;
  }

  hostConnected() {
    this.#host.addEventListener('keydown', this.#onKeydown);
    this.#host.addEventListener('pointerdown', this.#onPointerdown);
  }

  hostDisconnected() {
    this.#host.removeEventListener('keydown', this.#onKeydown);
    this.#host.removeEventListener('pointerdown', this.#onPointerdown);

    if (this.#grab) this.#cancelKeyboard();

    if (this.#drag) this.#endDrag(false);
  }

  /**
   * The item whose handle is on the event's path.
   * @param {Event} event
   * @returns {HTMLElement | undefined}
   */
  #itemFor(event) {
    const path = event.composedPath();

    return this.#options.items().find((item) => {
      const handle = this.#options.handleOf(item);

      return handle !== null && path.includes(handle);
    });
  }

  /** @param {HTMLElement} item */
  #indexOf(item) {
    return this.#options.items().indexOf(item);
  }

  /**
   * Move the item and keep focus on its handle (again after the host's next render).
   * @param {HTMLElement} item
   * @param {number} index
   */
  #place(item, index) {
    this.#options.place(item, index);
    this.#refocus(item);
  }

  /** @param {HTMLElement} item */
  #refocus(item) {
    const focus = () => {
      const handle = this.#options.handleOf(item);

      if (handle?.isConnected) handle.focus();
    };

    focus();
    const update = this.#host.updateComplete;

    if (update) afterUpdate(update).then(focus);
  }

  /** @param {KeyboardEvent} event */
  #onKeydown = (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const item = this.#itemFor(event);

    if (!item) return;

    // A grabbed item the host removed ends the grab quietly; this key then acts as usual.
    if (this.#grab && this.#indexOf(this.#grab.item) === -1) this.#setGrab(null);

    if (this.#grab && item !== this.#grab.item) {
      this.#cancelKeyboard();

      return;
    }

    if (this.#grab) this.#grabbedKey(event, this.#grab.item);
    else if (event.key === ' ' || event.key === 'Enter') this.#grabItem(event, item);
  };

  /**
   * Start or end the keyboard grab, with its listeners: focus leaving the host, or any pointerdown,
   * cancels it.
   * @param {{ item: HTMLElement, from: number } | null} grab
   */
  #setGrab(grab) {
    const doc = this.#host.ownerDocument;

    this.#grab = grab;

    if (grab) {
      doc.addEventListener('pointerdown', this.#onGrabPointerdown, true);
      this.#host.addEventListener('focusout', this.#onGrabFocusout);
    } else {
      doc.removeEventListener('pointerdown', this.#onGrabPointerdown, true);
      this.#host.removeEventListener('focusout', this.#onGrabFocusout);
    }
  }

  #onGrabPointerdown = () => this.#cancelKeyboard();

  /** Cancel once the host has rendered, unless focus is back on the handle or inside the host. */
  #onGrabFocusout = () => {
    const grab = this.#grab;

    afterUpdate(this.#host.updateComplete).then(() => {
      if (grab && this.#grab === grab && !this.#hasFocus(grab.item)) this.#cancelKeyboard();
    });
  };

  /**
   * Whether focus is on the item's handle or anywhere inside the host.
   * @param {HTMLElement} item
   */
  #hasFocus(item) {
    const root = /** @type {Document | ShadowRoot} */ (this.#host.getRootNode());
    const active = root.activeElement;
    const handle = this.#options.handleOf(item);

    return active !== null && (active === handle || active === this.#host || this.#host.contains(active));
  }

  /**
   * @param {KeyboardEvent} event
   * @param {HTMLElement} item
   */
  #grabItem(event, item) {
    if (this.#drag || event.repeat) return;
    event.preventDefault();
    const from = this.#indexOf(item);

    this.#setGrab({ item, from });
    this.#options.announce(this.#options.terms.grabbed(this.#options.labelOf(item), from + 1, this.#options.items().length));
  }

  /**
   * @param {KeyboardEvent} event
   * @param {HTMLElement} item
   */
  #grabbedKey(event, item) {
    const { key } = event;

    if (key === ' ' || key === 'Enter') {
      event.preventDefault();

      if (!event.repeat) this.#dropKeyboard();
    } else if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.#cancelKeyboard();
    } else if (key === 'Tab') {
      this.#dropKeyboard();
    } else {
      const step = stepFor(key, this.#options.axis ?? 'vertical', isRtl(item));

      if (step === 0) return;
      event.preventDefault();
      this.#moveBy(item, step);
    }
  }

  /**
   * @param {HTMLElement} item
   * @param {number} step
   */
  #moveBy(item, step) {
    const total = this.#options.items().length;
    const index = this.#indexOf(item);
    const to = index + step;

    if (index === -1) {
      this.#setGrab(null);

      return;
    }

    if (to < 0 || to >= total) return;
    this.#place(item, to);
    this.#options.announce(this.#options.terms.movedTo(to + 1, total));
  }

  #dropKeyboard() {
    const grab = this.#grab;

    if (!grab) return;
    this.#setGrab(null);
    const to = this.#indexOf(grab.item);

    if (to !== -1) this.#finish(grab.item, grab.from, to);
  }

  #cancelKeyboard() {
    const grab = this.#grab;

    if (!grab) return;
    this.#setGrab(null);
    const index = this.#indexOf(grab.item);

    // The host removed the item: nothing to put back.
    if (index === -1) return;

    if (index !== grab.from) this.#place(grab.item, grab.from);
    this.#options.announce(this.#options.terms.reorderCanceled(grab.from + 1));
  }

  /**
   * Commit a move whose item is already at `to`; put it back when the host refuses.
   * An unchanged position only announces the drop.
   * @param {HTMLElement} item
   * @param {number} from
   * @param {number} to
   */
  #finish(item, from, to) {
    const { commit, announce, terms } = this.#options;

    if (to === from || commit(from, to, item)) {
      announce(terms.droppedAt(to + 1));

      return;
    }

    this.#place(item, from);
    announce(terms.reorderCanceled(from + 1));
  }

  /** @param {PointerEvent} event */
  #onPointerdown = (event) => {
    if (this.#drag?.active || this.#grab || !event.isPrimary || event.button !== 0) return;
    // A press that never became a drag (its pointerup was lost) gives way to this one.
    this.#endDrag(false);
    const item = this.#itemFor(event);
    const handle = item && this.#options.handleOf(item);

    if (!item || !handle) return;
    this.#drag = {
      item,
      handle,
      pointerId: event.pointerId,
      from: this.#indexOf(item),
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      active: false,
      index: this.#indexOf(item),
      offsetX: 0,
      offsetY: 0,
      placeholder: null,
      scroller: null,
      frame: 0,
      style: '',
    };
    this.#listen(true);

    // Listeners first: capture throws for an inactive pointer (synthetic events), and the gesture
    // still works without it, since the document hears every pointer event.
    try {
      handle.setPointerCapture?.(event.pointerId);
    } catch {
      // Not captured: the document listeners carry the gesture.
    }
  };

  /**
   * Add or remove the listeners of a pointer gesture.
   * @param {boolean} on
   */
  #listen(on) {
    const drag = this.#drag;

    if (!drag) return;
    const { handle } = drag;
    const doc = handle.ownerDocument;

    if (on) {
      doc.addEventListener('pointermove', this.#onPointermove);
      doc.addEventListener('pointerup', this.#onPointerup);
      doc.addEventListener('pointercancel', this.#onPointercancel);
      doc.addEventListener('keydown', this.#onDragKeydown, true);
      handle.addEventListener('lostpointercapture', this.#onPointercancel);
    } else {
      doc.removeEventListener('pointermove', this.#onPointermove);
      doc.removeEventListener('pointerup', this.#onPointerup);
      doc.removeEventListener('pointercancel', this.#onPointercancel);
      doc.removeEventListener('keydown', this.#onDragKeydown, true);
      handle.removeEventListener('lostpointercapture', this.#onPointercancel);
    }
  }

  /** @param {KeyboardEvent} event Escape cancels a pointer drag. */
  #onDragKeydown = (event) => {
    // Before the threshold nothing is being dragged, so Escape stays with the page.
    if (event.key !== 'Escape' || !this.#drag?.active) return;
    event.preventDefault();
    event.stopPropagation();
    this.#endDrag(false);
  };

  /** @param {PointerEvent} event */
  #onPointermove = (event) => {
    const drag = this.#drag;

    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;

    if (!drag.active) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < DRAG_THRESHOLD) return;
      this.#startDrag();
    }

    event.preventDefault();
    this.#follow();
  };

  /** @param {PointerEvent} event */
  #onPointerup = (event) => {
    if (this.#drag && event.pointerId === this.#drag.pointerId) this.#endDrag(true);
  };

  /** @param {PointerEvent} event */
  #onPointercancel = (event) => {
    if (this.#drag && event.pointerId === this.#drag.pointerId) this.#endDrag(false);
  };

  /**
   * Lift the item out of flow (fixed, at its own rect) and put a same-size placeholder in its slot.
   */
  #startDrag() {
    const drag = this.#drag;

    if (!drag) return;
    const { item } = drag;
    const rect = item.getBoundingClientRect();
    // In a list the placeholder must be a list item too (`ul`/`ol` may hold only `li`).
    const placeholder = document.createElement(/^[ou]l$/.test(item.parentElement?.localName ?? '') ? 'li' : 'div');

    placeholder.setAttribute('data-sortable-placeholder', '');
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;
    item.before(placeholder);
    drag.placeholder = placeholder;
    drag.active = true;
    drag.scroller = scrollerOf(item);
    item.setAttribute('data-dragging', '');
    // Saved and restored through CSSOM `cssText` (allowed under `style-src 'self'`), so the author's own inline styles survive.
    drag.style = item.style.cssText;
    Object.assign(item.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      zIndex: '1',
      pointerEvents: 'none',
    });
    // A transformed or contained ancestor makes `fixed` relative to itself: measure and correct.
    const lifted = item.getBoundingClientRect();

    drag.offsetX = rect.left - lifted.left;
    drag.offsetY = rect.top - lifted.top;
    drag.frame = requestAnimationFrame(this.#autoScroll);
  }

  /**
   * Move the item with the pointer and the placeholder to the slot under it.
   */
  #follow() {
    const drag = this.#drag;

    if (!drag) return;
    const dx = drag.x - drag.startX + drag.offsetX;
    const dy = drag.y - drag.startY + drag.offsetY;

    drag.item.style.transform = `translate(${dx}px, ${dy}px)`;
    this.#movePlaceholder();
  }

  #movePlaceholder() {
    const drag = this.#drag;

    if (!drag?.placeholder) return;
    const { placeholder, item } = drag;

    const others = this.#options.items().filter((other) => other !== item);
    const axis = this.#options.axis ?? 'vertical';
    const rtl = isRtl(item);
    let index = 0;

    for (const other of others) {
      if (isBefore(other.getBoundingClientRect(), drag, axis, rtl)) index += 1;
    }

    if (index === drag.index) return;
    drag.index = index;

    if (index < others.length) others[index]?.before(placeholder);
    else others.at(-1)?.after(placeholder);
  }

  #autoScroll = () => {
    const drag = this.#drag;

    if (!drag?.active || !drag.scroller) return;
    const { scroller } = drag;
    const isPage = scroller === document.scrollingElement;
    const box = isPage ? { top: 0, left: 0, bottom: innerHeight, right: innerWidth } : scroller.getBoundingClientRect();
    const axis = this.#options.axis ?? 'vertical';
    const dy = axis === 'horizontal' ? 0 : edgeScroll(drag.y, box.top, box.bottom);
    const dx = axis === 'vertical' ? 0 : edgeScroll(drag.x, box.left, box.right);

    if (dx || dy) {
      scroller.scrollBy(dx, dy);
      this.#movePlaceholder();
    }

    drag.frame = requestAnimationFrame(this.#autoScroll);
  };

  /**
   * End the pointer gesture; on a drop, commit at the placeholder's slot.
   * @param {boolean} drop
   */
  #endDrag(drop) {
    const drag = this.#drag;

    if (!drag) return;
    this.#listen(false);
    this.#drag = null;
    const { handle, item } = drag;

    if (handle.hasPointerCapture?.(drag.pointerId)) handle.releasePointerCapture(drag.pointerId);

    if (!drag.active) return;
    cancelAnimationFrame(drag.frame);
    const dropped = item.getBoundingClientRect();

    drag.placeholder?.remove();
    item.removeAttribute('data-dragging');

    item.style.cssText = drag.style;

    if (!drop) {
      this.#options.announce(this.#options.terms.reorderCanceled(drag.from + 1));

      return;
    }

    if (drag.index !== drag.from) this.#place(item, drag.index);
    this.#finish(item, drag.from, drag.index);
    // Data-driven hosts move the node when they render: measure the final slot after that.
    afterUpdate(this.#host.updateComplete).then(() => this.#settle(item, dropped));
  }

  /**
   * Animate the item from where it was dropped into its slot (transform only; none under reduced motion).
   * @param {HTMLElement} item
   * @param {DOMRect} dropped
   */
  #settle(item, dropped) {
    if (reducedMotion() || !('animate' in item) || !item.isConnected) return;
    const rect = item.getBoundingClientRect();
    const dx = dropped.left - rect.left;
    const dy = dropped.top - rect.top;

    if (!dx && !dy) return;
    item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
      duration: SETTLE_MS,
      easing: 'ease-out',
    });
  }
}
