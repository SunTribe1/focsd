import { html, nothing } from 'lit';
import { cssomStyle } from '../internal/style.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';
import { clamp } from '../internal/number.js';
import { collapse, expand, normalize, resize } from '../internal/split-sizes.js';
import { FocsdSplitterPaneBase } from './splitter-pane-base.js';

/**
 * `detail` of `focsd-resize` on a splitter: every pane's size, as percentages.
 * @typedef {{ sizes: number[] }} SplitterResizeDetail
 */

/**
 * APG window splitter. With `focsd-splitter-pane` children it lays them out in a row (or a column)
 * with a separator between each pair; without them it splits a `start` and an `end` slot, and
 * `value` is the start pane's percentage.
 *
 * @fires change - Fired when the user commits a change to the value or state (two-slot markup only).
 * @fires {CustomEvent<SplitterResizeDetail>} focsd-resize - Fired after the user resizes, collapses or restores a `focsd-splitter-pane`; `detail.sizes` holds every pane's size.
 * @slot - `focsd-splitter-pane` elements, one per pane.
 * @slot end - The second pane.
 * @slot start - The first pane (its size is `value`).
 * @csspart end - The end element.
 * @csspart pane - The wrapper round each pane's slot (`display: contents`).
 * @csspart panes - The row (or column) of panes and separators.
 * @csspart separator - The separator element.
 * @csspart start - The start element.
 */
export class FocsdSplitterBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: { type: Number },
    min: { type: Number },
    max: { type: Number },
    orientation: {},
    autosave: {},
  };

  #startId = uid('focsd-splitter-start');

  #restore = 0;

  #dragging = false;

  /** @type {FocsdSplitterPaneBase[]} */
  #panes = [];

  /** @type {number[]} */
  #sizes = [];

  /** The size each collapsible pane goes back to when it is restored. @type {WeakMap<FocsdSplitterPaneBase, number>} */
  #restores = new WeakMap();

  /** Ids of the shadow wrappers round each pane's slot (`aria-controls` cannot reach light DOM ids). */
  #paneId = uid('focsd-splitter-pane');

  /** @type {{ index: number, from: number, sizes: number[], total: number } | null} */
  #drag = null;

  constructor() {
    super();
    /** Accessible name of the two-slot splitter's separator, such as "Resize sidebar". Pane mode names each separator from its pane's `label`. */
    this.label = '';
    /** Two-slot markup: the start pane's size, as a percentage of the splitter. */
    this.value = 50;
    /** Two-slot markup: the smallest `value`, in percent. Panes use their own `min`. */
    this.min = 10;
    /** Two-slot markup: the largest `value`, in percent. Panes use their own `max`. */
    this.max = 90;
    /**
     * Lays `focsd-splitter-pane` children out side by side, or one above the other (pane mode only).
     * It does not reflect: a `[orientation]` selector matches only when you set the attribute.
     * @type {'horizontal' | 'vertical'}
     */
    this.orientation = 'horizontal';
    /** A key under which the pane sizes are kept in `localStorage` and restored on the next visit. */
    this.autosave = '';
  }

  /**
   * Every pane's size, as percentages that add up to 100 (read-only). With two-slot markup, the
   * start and end panes.
   * @returns {number[]}
   */
  get sizes() {
    return this.#panes.length ? [...this.#sizes] : [this.#shown, 100 - this.#shown];
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#sync();
    // Panes defined after the splitter (a lazy import) are found once their element is defined.
    customElements.whenDefined('focsd-splitter-pane').then(this.#sync);
  }

  /** @param {number} value */
  #set(value) {
    const next = value === 0 ? 0 : clamp(Math.round(value), this.min, this.max);

    if (next === this.value) return;
    this.value = next;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    // The same steps as the pane mode: 1 % per arrow key, 10 % with Shift.
    const step = event.shiftKey ? 10 : 1;
    /** @type {Record<string, number>} */
    const deltas = { ArrowRight: rtl ? -step : step, ArrowLeft: rtl ? step : -step, ArrowUp: step, ArrowDown: -step };

    if (event.key in deltas) this.#set(Math.max(this.min, this.#shown) + /** @type {number} */ (deltas[event.key]));
    else if (event.key === 'Home') this.#set(this.min);
    else if (event.key === 'End') this.#set(this.max);
    else if (event.key === 'Enter') {
      if (this.value > 0) {
        this.#restore = this.value;
        this.#set(0);
      } else this.#set(this.#restore || this.min);
    } else return;
    event.preventDefault();
  };

  /** @param {number} clientX */
  #valueAt(clientX) {
    const rect = this.getBoundingClientRect();
    let ratio = (clientX - rect.left) / rect.width;

    if (getComputedStyle(this).direction === 'rtl') ratio = 1 - ratio;

    return ratio * 100;
  }

  /** The shown value: 0 (collapsed), else `value` kept within min and max. */
  get #shown() {
    return this.value === 0 ? 0 : clamp(Math.round(this.value), this.min, this.max);
  }

  /** @returns {[number[], number[]]} The minimum and maximum sizes, one per pane. */
  get #limits() {
    return [this.#panes.map((pane) => pane.min ?? 0), this.#panes.map((pane) => pane.max ?? 100)];
  }

  /** -1 when Left and Right are mirrored (a right-to-left row), else 1. */
  get #sign() {
    return this.orientation !== 'vertical' && getComputedStyle(this).direction === 'rtl' ? -1 : 1;
  }

  get #key() {
    return `focsd-splitter:${this.autosave}`;
  }

  /** Finds the pane children; when they change, names their slots and works out their sizes. */
  #sync = () => {
    const panes = [...this.children].filter((child) => child instanceof FocsdSplitterPaneBase);

    if (panes.length === this.#panes.length && panes.every((pane, i) => pane === this.#panes[i])) return;
    // Sizes the panes already had (0 = collapsed), kept by pane so they survive a change of panes.
    const known = new Map(this.#panes.map((pane, i) => [pane, this.#sizes[i]]));

    this.#panes = panes;

    for (const [i, pane] of panes.entries()) pane.slot = `pane-${i}`;
    const [mins, maxes] = this.#limits;

    const saved = known.size ? null : this.#saved(panes.length);
    const added = panes.filter((pane) => !known.has(pane)).length;
    // A pane added later asks for an equal share of the new total (100 / n once the rest scale down).
    const share = known.size && added < panes.length ? 100 / (panes.length - added) : undefined;
    const wanted = saved ?? panes.map((pane) => known.get(pane) ?? pane.size ?? share);
    const shut = panes.map((pane, i) => wanted[i] === 0 || (!saved && !known.has(pane) && pane.collapsed));

    /**
     * @template T
     * @param {T[]} list
     */
    const open = (list) => list.map((value, i) => (shut[i] ? 0 : value));

    for (const pane of panes) if (!this.#restores.has(pane)) this.#restores.set(pane, pane.size ?? 0);
    this.#show(normalize(open(wanted), open(mins), open(maxes)));
  };

  /**
   * @param {number} count
   * @returns {number[] | null}
   */
  #saved(count) {
    try {
      const saved = this.autosave ? JSON.parse(localStorage.getItem(this.#key) ?? 'null') : null;

      return saved?.length === count && saved.every((/** @type {number} */ n) => n >= 0) ? saved : null;
    } catch {
      return null;
    }
  }

  #save() {
    try {
      if (this.autosave) localStorage.setItem(this.#key, JSON.stringify(this.#sizes));
    } catch {
      // Storage can be full or blocked; the layout still works for this visit.
    }
  }

  /** @param {number[]} sizes */
  #show(sizes) {
    this.#sizes = sizes;

    for (const [i, pane] of this.#panes.entries()) {
      pane.size = sizes[i];
      pane.collapsed = sizes[i] === 0;
    }

    this.requestUpdate();
  }

  /**
   * Shows new sizes, rounded to 2 decimals with the rounding left on the first pane that changed (one of the moved pair),
   * so they add up to 100, and fires `focsd-resize`. A keyboard change is saved at once; a drag on
   * pointerup.
   * @param {number[]} sizes
   * @param {boolean} save
   */
  #commit(sizes, save) {
    const rounded = sizes.map((size) => Math.round(size * 100) / 100);
    const changed = rounded.flatMap((size, i) => (size === this.#sizes[i] ? [] : [i]));

    if (!changed.length) return;
    const first = /** @type {number} */ (changed[0]);

    const off = 100 - rounded.reduce((a, b) => a + b, 0);

    rounded[first] = Math.round(((rounded[first] ?? 0) + off) * 100) / 100;
    this.#show(rounded);

    if (save) this.#save();
    /** @type {SplitterResizeDetail} */
    const detail = { sizes: [...rounded] };

    this.dispatchEvent(new CustomEvent('focsd-resize', { bubbles: true, detail }));
  }

  /** Collapses or restores the collapsible pane beside separator `index`. @param {number} index */
  #toggle(index) {
    const [mins, maxes] = this.#limits;
    const sides = [index, index + 1].filter((i) => this.#panes[i]?.collapsible);
    const target = sides.find((i) => this.#sizes[i] === 0) ?? sides[0];

    const pane = target === undefined ? undefined : this.#panes[target];

    if (target === undefined || !pane) return;

    if (this.#sizes[target] === 0) {
      const restore = this.#restores.get(pane) || mins[target] || 100 / this.#panes.length;

      this.#commit(expand(this.#sizes, target, restore, mins, maxes), true);
    } else {
      const { sizes, restore } = collapse(this.#sizes, target, mins, maxes);

      if (restore) this.#restores.set(pane, restore);
      this.#commit(sizes, true);
    }
  }

  /** @param {KeyboardEvent} event @param {number} index */
  #onPaneKey(event, index) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    const [mins, maxes] = this.#limits;
    const vertical = this.orientation === 'vertical';
    const sign = this.#sign;
    const step = event.shiftKey ? 10 : 1;
    const size = /** @type {number} */ (this.#sizes[index]);
    /** @type {Record<string, number>} */
    const deltas = vertical ? { ArrowDown: step, ArrowUp: -step } : { ArrowRight: step * sign, ArrowLeft: -step * sign };

    Object.assign(deltas, { Home: /** @type {number} */ (mins[index]) - size, End: /** @type {number} */ (maxes[index]) - size });

    if (event.key === 'Enter') this.#toggle(index);
    else if (event.key in deltas) this.#commit(resize(this.#sizes, index, /** @type {number} */ (deltas[event.key]), mins, maxes), true);
    else return;
    event.preventDefault();
  }

  /** @param {PointerEvent} event @param {number} index */
  #onPanePointerDown(event, index) {
    if (event.button !== 0) return;
    // Without this a drag starts a text selection in Safari; focus is moved by hand below.
    event.preventDefault();
    const separator = /** @type {HTMLElement} */ (event.currentTarget);
    const vertical = this.orientation === 'vertical';
    const total = this.#panes.reduce((sum, pane) => sum + pane.getBoundingClientRect()[vertical ? 'height' : 'width'], 0);

    this.#drag = { index, from: vertical ? event.clientY : event.clientX, sizes: this.#sizes, total: total || 1 };
    separator.setPointerCapture(event.pointerId);
    separator.focus();
  }

  /** @param {PointerEvent} event */
  #onPanePointerMove = (event) => {
    const drag = this.#drag;

    if (!drag) return;
    const vertical = this.orientation === 'vertical';
    const sign = this.#sign;
    const moved = ((vertical ? event.clientY : event.clientX) - drag.from) * sign;
    const [mins, maxes] = this.#limits;

    this.#commit(resize(drag.sizes, drag.index, (moved / drag.total) * 100, mins, maxes), false);
  };

  #onPanePointerUp = () => {
    if (this.#drag && this.#drag.sizes !== this.#sizes) this.#save();
    this.#drag = null;
  };

  /** @param {number} index */
  #separator(index) {
    const pane = /** @type {FocsdSplitterPaneBase} */ (this.#panes[index]);

    return html`<div part="separator" class="bar" role="separator" tabindex="0"
      aria-orientation=${this.orientation === 'vertical' ? 'horizontal' : 'vertical'}
      aria-label=${this.localize.term('resizeNamed', pane.label || this.localize.term('paneNumber', index + 1))}
      aria-controls=${`${this.#paneId}-${index}`} aria-valuenow=${Math.round(/** @type {number} */ (this.#sizes[index]))}
      aria-valuemin=${pane.collapsible ? 0 : (pane.min ?? 0)} aria-valuemax=${pane.max ?? 100}
      @keydown=${(/** @type {KeyboardEvent} */ e) => this.#onPaneKey(e, index)}
      @pointerdown=${(/** @type {PointerEvent} */ e) => this.#onPanePointerDown(e, index)}
      @pointermove=${this.#onPanePointerMove} @pointerup=${this.#onPanePointerUp} @pointercancel=${this.#onPanePointerUp}
    ></div>`;
  }

  #renderPanes() {
    const last = this.#panes.length - 1;

    return html`<div part="panes" class=${this.orientation === 'vertical' ? 'vertical' : nothing}>
        ${this.#panes.map(
          (_, i) =>
            html`<div part="pane" id=${`${this.#paneId}-${i}`}><slot name=${`pane-${i}`} @slotchange=${this.#sync}></slot></div>${i < last ? this.#separator(i) : nothing}`,
        )}
      </div>
      <slot hidden @slotchange=${this.#sync}></slot>`;
  }

  /** @override */
  render() {
    if (this.#panes.length) return this.#renderPanes();
    const shown = this.#shown;

    return html`<div part="start" id=${this.#startId} style=${cssomStyle({ 'flex-basis': `${shown}%` })}><slot name="start"></slot></div>
      <div part="separator" role="separator" tabindex="0" aria-orientation="vertical" aria-label=${this.label || nothing}
        aria-controls=${this.#startId} aria-valuenow=${shown} aria-valuemin="0" aria-valuemax=${this.max}
        @keydown=${this.#onKeyDown}
        @pointerdown=${(/** @type {PointerEvent} */ e) => {
          if (e.button !== 0) return;
          // Without this a drag starts a text selection in Safari; focus is moved by hand below.
          e.preventDefault();
          const separator = /** @type {HTMLElement} */ (e.currentTarget);
          this.#dragging = true;
          separator.setPointerCapture(e.pointerId);
          separator.focus();
        }}
        @pointermove=${(/** @type {PointerEvent} */ e) => {
          if (this.#dragging) this.#set(this.#valueAt(e.clientX));
        }}
        @pointerup=${() => {
          this.#dragging = false;
        }}
        @pointercancel=${() => {
          this.#dragging = false;
        }}
      ></div>
      <div part="end"><slot name="end"></slot></div>
      <slot hidden @slotchange=${this.#sync}></slot>`;
  }
}
