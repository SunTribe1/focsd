import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { typeaheadIndex } from '../internal/typeahead.js';
import { deepActiveElement } from '../internal/focus.js';
import { FocsdTreeItemBase } from './tree-item-base.js';

/**
 * APG tree view: roving focus over visible items, expand/collapse, selection, typeahead.
 *
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - Default content.
 * @cssprop --focsd-tree-indent - Indent per level of depth for the items inside (default 1.25rem); set it on the tree, the items inherit it.
 */
export class FocsdTreeBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, value: {} };

  constructor() {
    super();
    /** The accessible name of the tree. */
    this.label = '';
    /** The value of the selected item. */
    this.value = '';
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('click', this.#onClick);
    this.addEventListener('focusin', this.#onFocusIn);
    this.addEventListener('focsd-tree-item-change', this.#onItemChange);
  }

  /** Last focused item, so focus can be rescued when its ancestor collapses. */
  /** @type {FocsdTreeItemBase | null} */
  #focused = null;

  /**
   * Visible items in document order (ancestors expanded).
   * @returns {FocsdTreeItemBase[]}
   */
  get visibleItems() {
    /** @type {FocsdTreeItemBase[]} */
    const out = [];

    /** @param {FocsdTreeItemBase[]} items */
    const walk = (items) => {
      for (const item of items) {
        out.push(item);

        if (item.expanded) walk(item.childItems);
      }
    };

    walk([...(this.children ?? [])].filter((c) => c instanceof FocsdTreeItemBase));

    return out;
  }

  get #allItems() {
    return [...this.querySelectorAll('*')].filter((c) => c instanceof FocsdTreeItemBase);
  }

  /** @param {FocsdTreeItemBase} item */
  #setStop(item) {
    for (const i of this.#allItems) i.setAttribute('tabindex', i === item ? '0' : '-1');
  }

  /**
   * Nearest visible item at or above `item`.
   * @param {FocsdTreeItemBase | null} item
   * @param {Set<FocsdTreeItemBase>} visible
   */
  #visibleAncestor(item, visible) {
    let current = item;

    while (current && !visible.has(current)) current = current.parentItem;

    return current;
  }

  #syncQueued = false;

  /** Many items updating at once (mount, expand all) share one selection pass. */
  #sync = () => {
    if (this.#syncQueued) return;
    this.#syncQueued = true;
    queueMicrotask(() => {
      this.#syncQueued = false;
      this.#syncNow();
    });
  };

  #syncNow() {
    const all = this.#allItems;
    const visible = new Set(this.visibleItems);

    for (const i of all) {
      const selected = String(i.value === this.value && this.value !== '');

      if (i.getAttribute('aria-selected') !== selected) i.setAttribute('aria-selected', selected);
    }

    const current = all.find((i) => i.getAttribute('tabindex') === '0');

    const stop =
      (current && this.#visibleAncestor(current, visible)) ??
      all.find((i) => i.value === this.value && visible.has(i)) ??
      this.visibleItems[0];

    if (stop) this.#setStop(stop);
  }

  #onItemChange = () => {
    this.updateComplete.then(() => {
      const visible = new Set(this.visibleItems);
      const lost = this.#focused && !visible.has(this.#focused);
      const active = deepActiveElement();
      const focusGone = !active || active === document.body || active === this.#focused;
      this.#sync();

      if (lost && focusGone) this.#focus(this.#visibleAncestor(this.#focused, visible));
    });
  };

  /** @override */
  updated() {
    this.setAttribute('role', 'tree');

    if (this.label) this.setAttribute('aria-label', this.label);
    this.#sync();
  }

  /** @param {FocsdTreeItemBase | null | undefined} item */
  #focus(item) {
    if (!item) return;
    this.#setStop(item);
    item.focus();
  }

  /** @param {FocsdTreeItemBase} item */
  #select(item) {
    if (!item || item.disabled) return;

    if (item.value !== this.value) {
      this.value = item.value;
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /** @param {FocusEvent} event */
  #onFocusIn = (event) => {
    if (!(event.target instanceof FocsdTreeItemBase)) return;
    this.#focused = event.target;
    this.#setStop(event.target);
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const item = event.composedPath().find((n) => n instanceof FocsdTreeItemBase);

    if (!item) return;
    event.stopPropagation();

    if (item.childItems.length && event.composedPath().some((n) => /** @type {Partial<Element>} */ (n).getAttribute?.('part') === 'toggle'))
      item.expanded = !item.expanded;
    this.#focus(item);
    this.#select(item);
    this.updateComplete.then(this.#sync);
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const item = event.target instanceof FocsdTreeItemBase ? event.target : null;

    if (!item) return;
    const visible = this.visibleItems;
    const index = visible.indexOf(item);
    const rtl = getComputedStyle(this).direction === 'rtl';
    const right = rtl ? 'ArrowLeft' : 'ArrowRight';
    const left = rtl ? 'ArrowRight' : 'ArrowLeft';

    switch (event.key) {
      case 'ArrowDown':
        this.#focus(visible[index + 1]);
        break;
      case 'ArrowUp':
        this.#focus(visible[index - 1]);
        break;
      case 'Home':
        this.#focus(visible[0]);
        break;
      case 'End':
        this.#focus(visible.at(-1));
        break;
      case right:
        if (item.childItems.length && !item.expanded) item.expanded = true;
        else if (item.expanded) this.#focus(item.childItems[0]);
        break;
      case left:
        if (item.expanded) item.expanded = false;
        else this.#focus(item.parentItem);
        break;
      case 'Enter':
      case ' ':
        this.#select(item);
        break;
      default:
        if (!this.#typeahead(event, visible, index)) return;
    }

    event.preventDefault();
    this.updateComplete.then(this.#sync);
  };

  /**
   * Focus the next visible item whose label starts with the typed character.
   * @param {KeyboardEvent} event
   * @param {FocsdTreeItemBase[]} visible
   * @param {number} index
   * @returns {boolean} False when the key is not a printable character.
   */
  #typeahead(event, visible, index) {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return false;

    const next = typeaheadIndex(
      visible.map((v) => v.label),
      index,
      event.key,
      (i) => Boolean(visible[i]?.disabled),
    );

    if (next >= 0) this.#focus(visible[next]);

    return true;
  }

  /** @override */
  render() {
    return html`<slot @slotchange=${this.#sync}></slot>`;
  }
}
