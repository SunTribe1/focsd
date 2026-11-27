import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { SortableController, sortableTerms } from '../internal/sortable.js';
import { FocsdListItemBase } from './list-item-base.js';

/**
 * `detail` of `focsd-reorder` on a list: the moved item and its old and new indexes.
 * @typedef {{ from: number, to: number, item: FocsdListItemBase }} ListReorderDetail
 */

/**
 * List: static list, or a single-select listbox (`selectable`) with roving focus. Fires `change`.
 * With `sortable`, each item gets a reorder handle: Space or Enter grabs, the arrow keys move,
 * Space or Enter drops and Escape cancels; the handle can also be dragged with a pointer or touch.
 * A list that is both `selectable` and `sortable` keeps buttons out of its options: the handle is
 * for pointer and touch only, and Alt+ArrowUp or Alt+ArrowDown moves the focused option one place
 * (announced, with `focsd-reorder`). Disabled items cannot be moved.
 *
 * @fires change - Fired when the user commits a change to the value or state.
 * @fires {CustomEvent<ListReorderDetail>} focsd-reorder - Fired when the user drops an item at a new position; cancel it to put the item back.
 * @slot - Default content.
 * @csspart list - The list element.
 */
export class FocsdListBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, selectable: { type: Boolean, reflect: true }, value: {}, sortable: { type: Boolean, reflect: true } };

  #sortable = new SortableController(this, {
    axis: 'vertical',
    items: () => this.items,
    handleOf: (item) => (/** @type {FocsdListItemBase} */ (item).disabled ? null : /** @type {FocsdListItemBase} */ (item).handle),
    labelOf: (item) => /** @type {FocsdListItemBase} */ (item).itemName,
    announce: (text) => this.#announce(text),
    place: (item, index) => this.#place(item, index),
    commit: (from, to, item) =>
      this.dispatchEvent(
        new CustomEvent('focsd-reorder', {
          bubbles: true,
          cancelable: true,
          detail: /** @type {ListReorderDetail} */ ({ from, to, item: /** @type {FocsdListItemBase} */ (item) }),
        }),
      ),
    terms: sortableTerms(this.localize),
  });

  constructor() {
    super();
    /** The accessible name of the list. */
    this.label = '';
    /** Makes the list a listbox where one item can be selected. */
    this.selectable = false;
    /** The value of the selected item. */
    this.value = '';
    /** Whether each item gets a reorder handle (keyboard, pointer and touch). */
    this.sortable = false;
    this.addEventListener('keydown', this.#onHandlePress);
    this.addEventListener('pointerdown', this.#onHandlePress);
    this.addEventListener('keydown', this.#onMoveKey);
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('click', this.#onClick);
  }

  /**
   * The list items, in order.
   * @returns {FocsdListItemBase[]}
   */
  get items() {
    return [...(this.children ?? [])].filter((c) => c instanceof FocsdListItemBase);
  }

  /** @param {number} i */
  #isDisabled = (i) => this.items[i]?.disabled ?? true;

  #sync = () => {
    const items = this.items;

    for (const item of items) {
      item.sortable = this.sortable;
      item._option = this.selectable;
    }

    if (!this.selectable) {
      items.forEach((item) => {
        item.setAttribute('role', 'listitem');
        item.removeAttribute('tabindex');
        item.removeAttribute('aria-selected');
      });

      return;
    }

    let stop = items.findIndex((i) => i.value === this.value && !i.disabled);

    if (stop < 0) stop = edgeIndex('first', items.length, this.#isDisabled);
    items.forEach((item, i) => {
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(item.value === this.value));
      item.setAttribute('tabindex', i === stop ? '0' : '-1');
    });
  };

  /** @override */
  updated() {
    this.setAttribute('role', this.selectable ? 'listbox' : 'list');

    if (this.label) this.setAttribute('aria-label', this.label);
    this.#sync();
  }

  /**
   * Move an item so that it ends at `index` among the items.
   * @param {HTMLElement} item
   * @param {number} index
   */
  #place(item, index) {
    const others = this.items.filter((other) => other !== item);
    const next = others[index];

    if (next) next.before(item);
    else others.at(-1)?.after(item);
  }

  /** @type {FocsdListItemBase | undefined} The item whose handle was last pressed. */
  #current;

  /**
   * Announce in an item's status region (a list may own only list items: axe
   * aria-required-children). Never the moving item's: a region removed and reinserted by a move
   * can lose its pending announcement, and only the moving item leaves the DOM.
   * @param {string} text
   */
  #announce(text) {
    const items = this.items;
    const item = items.find((other) => other !== this.#current) ?? items[0];
    const status = item?.renderRoot.querySelector('[part~="status"]');

    if (status) status.textContent = text;
  }

  /** @param {Event} event Remember the item of a pressed handle (runs before the sortable controller). */
  #onHandlePress = (event) => {
    if (this.#fromHandle(event) && event.target instanceof FocsdListItemBase) this.#current = event.target;
  };

  /**
   * Whether the event comes from inside an item (its reorder handle), not from the item itself.
   * @param {Event} event
   */
  #fromHandle = (event) => event.composedPath()[0] !== event.target;

  /** @param {number} index */
  #select(index) {
    const item = this.items[index];

    if (!item || item.disabled || item.value === this.value) return;
    this.value = item.value;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    if (!this.selectable || this.#fromHandle(event)) return;
    const item = event.composedPath().find((n) => n instanceof FocsdListItemBase);

    if (item) {
      this.#select(this.items.indexOf(item));
      item.focus();
    }
  };

  /**
   * Selectable and sortable: Alt+ArrowUp or Alt+ArrowDown moves the focused option one place.
   * @param {KeyboardEvent} event
   */
  #onMoveKey = (event) => {
    const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    const items = this.items;
    const item = /** @type {FocsdListItemBase} */ (event.target);
    const from = items.indexOf(item);

    if (!this.selectable || !this.sortable || !event.altKey || !step || from < 0 || item.disabled) return;
    event.preventDefault();
    const to = from + step;

    if (to < 0 || to >= items.length) return;
    const detail = /** @type {ListReorderDetail} */ ({ from, to, item });

    if (!this.dispatchEvent(new CustomEvent('focsd-reorder', { bubbles: true, cancelable: true, detail }))) return;
    this.#current = item;
    this.#place(item, to);
    item.focus();
    this.#announce(this.localize.term('movedTo', to + 1, items.length));
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    // Keys on a reorder handle belong to the sortable controller; an option move is already done.
    if (!this.selectable || event.defaultPrevented || this.#fromHandle(event) || this.#sortable.active) return;
    const items = this.items;
    const current = items.indexOf(/** @type {FocsdListItemBase} */ (event.target));

    if (current < 0) return;
    let next = -1;

    if (event.key === 'ArrowDown') next = Math.max(current, nextIndex(current, 1, items.length, this.#isDisabled));
    else if (event.key === 'ArrowUp') next = Math.min(current, nextIndex(current, -1, items.length, this.#isDisabled));
    else if (event.key === 'Home') next = edgeIndex('first', items.length, this.#isDisabled);
    else if (event.key === 'End') next = edgeIndex('last', items.length, this.#isDisabled);
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.#select(current);

      return;
    } else return;
    event.preventDefault();
    items.forEach((item, i) => item.setAttribute('tabindex', i === next ? '0' : '-1'));
    items[next]?.focus();
  };

  /** @override */
  render() {
    return html`<div part="list"><slot @slotchange=${this.#sync}></slot></div>`;
  }
}
