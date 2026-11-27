import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { FocsdAccordionItemBase } from './accordion-item-base.js';

/**
 * Accordion: items close each other unless `multiple`; ArrowUp/Down/Home/End move between headers.
 *
 * @slot - Default content.
 */
export class FocsdAccordionBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { multiple: { type: Boolean, reflect: true } };

  constructor() {
    super();
    /** Lets more than one item be open at a time. */
    this.multiple = false;
    // `toggle` does not bubble (as on <details>), so the accordion hears its items in the capture phase.
    this.addEventListener('toggle', this.#onToggle, { capture: true });
    this.addEventListener('keydown', this.#onKeyDown);
  }

  /**
   * The accordion items, in order.
   * @returns {FocsdAccordionItemBase[]}
   */
  get items() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdAccordionItemBase);
  }

  /** @param {number} i */
  #isDisabled = (i) => this.items[i]?.disabled ?? true;

  /** @param {Event} event */
  #onToggle = (event) => {
    const item = event.target;

    // Only this accordion's own items: a nested accordion's toggle passes through here too.
    if (this.multiple || !(item instanceof FocsdAccordionItemBase) || item.parentElement !== this || !item.open) return;

    for (const other of this.items) if (other !== item) other.open = false;
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const items = this.items;
    const target = /** @type {FocsdAccordionItemBase} */ (event.composedPath().find((n) => n instanceof FocsdAccordionItemBase));
    const current = items.indexOf(target);
    const origin = /** @type {Partial<Element> | undefined} */ (event.composedPath()[0]);

    if (current < 0 || !origin?.matches?.('[part~="trigger"]')) return;
    let next;

    if (event.key === 'ArrowDown') next = nextIndex(current, 1, items.length, this.#isDisabled);
    else if (event.key === 'ArrowUp') next = nextIndex(current, -1, items.length, this.#isDisabled);
    else if (event.key === 'Home') next = edgeIndex('first', items.length, this.#isDisabled);
    else if (event.key === 'End') next = edgeIndex('last', items.length, this.#isDisabled);
    else return;
    event.preventDefault();
    items[next]?.focus();
  };

  /** @override */
  render() {
    return html`<slot></slot>`;
  }
}
