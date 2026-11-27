import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { ViewportWindow } from '../internal/viewport-window.js';
import { uid } from '../internal/id.js';

/** Padding and border on both block edges. */
const BLOCK_EDGES = ['padding-block-start', 'padding-block-end', 'border-block-start-width', 'border-block-end-width'];

/**
 * A row's border-box block size in layout pixels, as ResizeObserver's borderBoxSize reports it.
 * Not getBoundingClientRect(): it includes the transform of any ancestor (a dialog scaling in).
 * @param {HTMLElement} row
 */
function borderBlockSize(row) {
  const style = getComputedStyle(row);
  const size = Number.parseFloat(style.blockSize);

  if (Number.isNaN(size)) return row.offsetHeight;

  if (style.boxSizing === 'border-box') return size;

  return BLOCK_EDGES.reduce((sum, edge) => sum + (Number.parseFloat(style.getPropertyValue(edge)) || 0), size);
}

/**
 * `detail` of `focsd-range-change`: the indexes of the first and last rendered rows.
 * @typedef {{ first: number, last: number }} RangeChangeDetail
 */

/**
 * Virtual list: renders only the rows in view (plus `overscan`), so 100,000 items scroll smoothly.
 * Rows announce their position ("item 4,051 of 100,000") with aria-setsize and aria-posinset. With
 * `selectable` it is an APG listbox (single or multiple selection, with aria-activedescendant).
 * Set `items` and `renderItem(item, index)` (returning text, a Node or a Lit template). Give it a
 * height. Rows are measured unless `item-height` fixes them; rows that grow above the view keep
 * what you are reading in place.
 *
 * @fires {CustomEvent<RangeChangeDetail>} focsd-range-change - Fired when the rendered rows change; `detail.first` and `detail.last`.
 * @fires {Event} change - Fired when the selection changes.
 * @csspart viewport - The scrolling area (the list or listbox).
 * @csspart spacer - The full-height content.
 * @csspart window - The rendered rows, positioned at their offset.
 * @csspart row - A row.
 * @template [T=any] The item type: `FocsdVirtualListBase<Person>` types `items`, `renderItem` and
 *   `keyOf`. Without it any item is accepted.
 */
export class FocsdVirtualListBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    items: { attribute: false },
    renderItem: { attribute: false },
    keyOf: { attribute: false },
    itemHeight: { type: Number, attribute: 'item-height' },
    overscan: { type: Number },
    label: {},
    selectable: { reflect: true },
    value: { attribute: false },
    _scrollTop: { state: true },
    _viewport: { state: true },
    _active: { state: true },
  };

  #ids = uid('focsd-virtual-list');
  /** @type {ViewportWindow | null} */
  #window = null;
  /** @type {ResizeObserver | null} */
  #resize = null;
  /** @type {ResizeObserver | null} */
  #rowObserver = null;
  #range = { first: 0, last: -1 };
  #anchor = -1;

  constructor() {
    super();
    /** @type {T[]} The items. Rows render through `renderItem`. */
    this.items = [];
    /** @type {(item: T, index: number) => unknown} Renders a row: returns text, a Node or a Lit template. */
    this.renderItem = (item) => String(item ?? '');
    /** @type {(item: T, index: number) => unknown} Returns a stable key per item, so rows keep their state when items move. */
    this.keyOf = (_item, index) => index;
    /** @type {number | undefined} A fixed row height in pixels; without it rows are measured. */
    this.itemHeight = undefined;
    /** How many rows render beyond the view on each side. */
    this.overscan = 5;
    /** The accessible name of the list. */
    this.label = '';
    /**
     * @type {'none' | 'single' | 'multiple'}
     * Makes the list a listbox where one (`single`) or several (`multiple`) items can be selected.
     */
    this.selectable = 'none';
    /** @type {unknown} The selected item's key; with `selectable="multiple"`, an array of keys. */
    this.value = undefined;
    /** @internal */
    this._scrollTop = 0;
    /** @internal */
    this._viewport = 0;
    /** @internal */
    this._active = -1;
  }

  get #selecting() {
    return this.selectable === 'single' || this.selectable === 'multiple';
  }

  get #multiple() {
    return this.selectable === 'multiple';
  }

  /** The viewport, always rendered. */
  get #scroller() {
    return /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="viewport"]'));
  }

  /**
   * Selected keys as an array (whatever the mode).
   * @returns {unknown[]}
   */
  get #selected() {
    if (this.value === undefined || this.value === null || this.value === '') return [];

    return Array.isArray(this.value) ? this.value : [this.value];
  }

  /** @param {number} index */
  #key(index) {
    return this.keyOf(/** @type {T} */ (this.items[index]), index);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    const count = this.items?.length ?? 0;
    let win = this.#window;

    if (!win || changed.has('itemHeight')) {
      win = new ViewportWindow({ count, itemHeight: this.itemHeight || undefined, overscan: this.overscan });
      this.#window = win;
    } else if (changed.has('items')) win.setCount(count);

    if (changed.has('overscan')) win.overscan = this.overscan;

    if (changed.has('selectable') && this.value === undefined) this.value = this.#multiple ? [] : '';

    if (this._active >= count) this._active = count - 1;
  }

  /** @override */
  firstUpdated() {
    const scroller = this.#scroller;
    // The observer's first callback (after layout, before paint) reports the starting height.
    const resize = new ResizeObserver(() => (this._viewport = scroller.clientHeight));
    this.#resize = resize;
    resize.observe(scroller);
    this.#rowObserver = new ResizeObserver((entries) => this.#onRowsResized(entries));
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resize?.disconnect();
    this.#rowObserver?.disconnect();
  }

  /** Measured rows: keep the row at the top of the view where it is when rows above it change size. */
  /** @param {ResizeObserverEntry[]} entries */
  #onRowsResized(entries) {
    if (this.itemHeight) return;
    const scroller = this.#scroller;
    const win = /** @type {ViewportWindow} */ (this.#window);
    const topRow = win.indexAt(scroller.scrollTop);
    let shift = 0;
    let changed = false;

    for (const entry of entries) {
      const target = /** @type {HTMLElement} */ (entry.target);
      const index = Number(target.dataset.index);
      const height = entry.borderBoxSize?.[0]?.blockSize ?? target.offsetHeight;
      const delta = win.measure(index, height);

      if (delta) changed = true;

      if (delta && index < topRow) shift += delta;
    }

    if (!changed) return;
    // Grow the spacer first, so a shift near the end is not clamped to the old height.
    this.#applyLayout();

    if (shift) scroller.scrollTop += shift;
    this._scrollTop = scroller.scrollTop;
    this.requestUpdate();
  }

  #frame = 0;

  #onScroll = () => {
    if (this.#frame) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this._scrollTop = this.#scroller.scrollTop;
    });
  };

  /**
   * Scroll so row `index` is visible (`align`: start, center, end or nearest).
   * @param {number} index
   * @param {{ align?: 'start' | 'center' | 'end' | 'nearest' }} [options]
   */
  scrollToIndex(index, { align = 'nearest' } = {}) {
    const scroller = this.#scroller;

    if (!scroller || !this.items?.length) return;
    const win = /** @type {ViewportWindow} */ (this.#window);

    const go = () => {
      scroller.scrollTop = win.scrollTopFor(index, scroller.clientHeight, align, scroller.scrollTop);
      this._scrollTop = scroller.scrollTop;
    };

    go();

    if (!this.itemHeight) this.#settle(go);
  }

  /**
   * Measured rows: once the rows around the target render, measure them (a tall row may be far
   * taller than the estimate) and scroll again, until nothing changes.
   * @param {() => void} go
   */
  async #settle(go) {
    for (let pass = 0; pass < 3; pass += 1) {
      await this.updateComplete;

      if (!this.#measureRows()) return;
      this.#applyLayout();
      go();
    }
  }

  /** Measure the rendered rows now; true when any height changed. */
  #measureRows() {
    const win = /** @type {ViewportWindow} */ (this.#window);
    let changed = false;

    for (const row of this.renderRoot.querySelectorAll('[part~="row"]')) {
      const el = /** @type {HTMLElement} */ (row);

      if (win.measure(Number(el.dataset.index), borderBlockSize(el))) changed = true;
    }

    return changed;
  }

  /** Size the spacer and place the window from the heights known now. */
  #applyLayout() {
    const vw = /** @type {ViewportWindow} */ (this.#window);
    /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="spacer"]'))?.style.setProperty('block-size', `${vw.total}px`);
    /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="window"]'))?.style.setProperty(
      'transform',
      `translateY(${vw.offsetOf(this.#range.first)}px)`,
    );
  }

  /** @param {number} index */
  #rowId(index) {
    return `${this.#ids}-row-${index}`;
  }

  /** @param {unknown} next */
  #emitChange(next) {
    this.value = next;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {number} index */
  #toggle(index) {
    const key = this.#key(index);

    if (!this.#multiple) {
      if (this.value !== key) this.#emitChange(key);

      return;
    }

    const selected = new Set(this.#selected);

    if (selected.has(key)) selected.delete(key);
    else selected.add(key);
    this.#emitChange([...selected]);
  }

  /**
   * Select from the anchor to `to`. APG: the range replaces the previous range from the same
   * anchor, added to what was selected when the anchor was set. Sets keep it linear at 100k rows.
   * @param {number} from
   * @param {number} to
   */
  #selectRange(from, to) {
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    const next = new Set(this.#rangeBase ?? this.#selected);

    for (let i = lo; i <= hi; i += 1) next.add(this.#key(i));
    this.#emitChange([...next]);
  }

  /** Selection when the anchor was set: Shift ranges add to this. */
  /** @type {unknown[] | null} */
  #rangeBase = null;

  /** @param {number} index */
  #setAnchor(index) {
    this.#anchor = index;
    this.#rangeBase = this.#selected;
  }

  /** @param {number} index */
  #activate(index) {
    const count = this.items.length;

    if (!count) return;
    this._active = Math.max(0, Math.min(count - 1, index));
    this.scrollToIndex(this._active);
  }

  #onFocus = () => {
    if (!this.#selecting || this._active >= 0 || !this.items.length) return;
    const first = this.#selected[0];
    const index = first === undefined ? 0 : this.items.findIndex((item, i) => this.keyOf(item, i) === first);
    this._active = Math.max(0, index);
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (!this.#selecting) return;
    const count = this.items.length;

    if (!count) return;
    const win = /** @type {ViewportWindow} */ (this.#window);
    const page = Math.max(1, Math.floor(this.#scroller.clientHeight / (this.itemHeight || win.estimate)) - 1);

    /** @type {Record<string, number>} */
    const moves = {
      ArrowDown: this._active + 1,
      ArrowUp: this._active - 1,
      Home: 0,
      End: count - 1,
      PageDown: this._active + page,
      PageUp: this._active - page,
    };

    if (event.key in moves) {
      event.preventDefault();
      const from = Math.max(this._active, 0);
      this.#activate(/** @type {number} */ (moves[event.key]));

      if (event.shiftKey && this.#multiple) this.#selectRange(this.#anchor >= 0 ? this.#anchor : from, this._active);
      else if (!this.#multiple && this.selectable === 'single') this.#toggle(this._active);

      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();

      if (this._active < 0) this._active = 0;
      this.#toggle(this._active);
      this.#setAnchor(this._active);

      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && this.#multiple) {
      event.preventDefault();
      const all = this.#selected.length === count ? [] : this.items.map((item, i) => this.keyOf(item, i));
      this.#emitChange(all);
      this.#rangeBase = null;
    }
  };

  /**
   * @param {number} index
   * @param {MouseEvent} event
   */
  #onRowClick(index, event) {
    if (!this.#selecting) return;
    this._active = index;

    if (event.shiftKey && this.#multiple && this.#anchor >= 0) this.#selectRange(this.#anchor, index);
    else {
      this.#toggle(index);
      this.#setAnchor(index);
    }
  }

  /** @override */
  updated() {
    this.#applyLayout();
    const rowObserver = this.#rowObserver;

    if (rowObserver && !this.itemHeight) {
      rowObserver.disconnect();

      for (const row of this.renderRoot.querySelectorAll('[part~="row"]')) rowObserver.observe(row);
    }

    const { first, last } = this.#range;

    if (first !== this.#lastRange.first || last !== this.#lastRange.last) {
      this.#lastRange = { first, last };
      /** @type {RangeChangeDetail} */
      const detail = { first, last };

      this.dispatchEvent(new CustomEvent('focsd-range-change', { bubbles: true, detail }));
    }
  }

  #lastRange = { first: -1, last: -1 };

  /** @override */
  render() {
    const count = this.items?.length ?? 0;
    this.#range = /** @type {ViewportWindow} */ (this.#window).range(this._scrollTop, this._viewport || 400);
    const { first, last } = this.#range;
    const indexes = [];

    for (let i = first; i <= last; i += 1) indexes.push(i);
    const selecting = this.#selecting;
    const selected = new Set(this.#selected);
    const activeRendered = selecting && this._active >= first && this._active <= last;

    /* eslint-disable lit-a11y/click-events-have-key-events -- the listbox handles keys; rows are not focusable (aria-activedescendant) */
    return html`<div
      part="viewport"
      role=${selecting ? 'listbox' : 'list'}
      aria-label=${this.label || nothing}
      aria-multiselectable=${this.#multiple ? 'true' : nothing}
      aria-activedescendant=${activeRendered ? this.#rowId(this._active) : nothing}
      tabindex="0"
      @scroll=${this.#onScroll}
      @keydown=${this.#onKeyDown}
      @focus=${this.#onFocus}
    >
      <div part="spacer">
        <div part="window">
          ${repeat(
            indexes,
            (i) => i,
            (i) => {
              const key = selecting ? this.#key(i) : i;

              return html`<div
                part="row${selecting && i === this._active ? ' active' : ''}"
                id=${this.#rowId(i)}
                data-index=${i}
                role=${selecting ? 'option' : 'listitem'}
                aria-setsize=${count}
                aria-posinset=${i + 1}
                aria-selected=${selecting ? String(selected.has(key)) : nothing}
                @click=${(/** @type {MouseEvent} */ e) => this.#onRowClick(i, e)}
              >${this.renderItem(/** @type {T} */ (this.items[i]), i)}</div>`;
            },
          )}
        </div>
      </div>
    </div>`;
    /* eslint-enable lit-a11y/click-events-have-key-events */
  }
}
