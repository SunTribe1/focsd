import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FocsdMenuItemBase } from '../overlays/menu-item-base.js';
import { nextIndex } from '../internal/roving.js';
import { FocsdMenubarItemBase } from './menubar-item-base.js';

/**
 * APG menubar: Left/Right move between items (roving), and between open menus.
 *
 * @slot - Default content.
 */
export class FocsdMenubarBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {} };

  constructor() {
    super();
    /** The accessible name of the menubar. */
    this.label = '';
    this.addEventListener('keydown', this.#onKeyDown);
  }

  /**
   * The menubar items, in order.
   * @returns {FocsdMenubarItemBase[]}
   */
  get items() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdMenubarItemBase);
  }

  #sync = () => {
    const items = this.items;

    const stop = Math.max(
      0,
      items.findIndex((i) => i.tabStop),
    );

    items.forEach((item, i) => {
      item.tabStop = i === stop;
    });
  };

  /** @override */
  updated() {
    this.setAttribute('role', 'menubar');

    if (this.label) this.setAttribute('aria-label', this.label);
    this.#sync();
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const rtl = getComputedStyle(this).direction === 'rtl';
    /** @type {Record<string, -1 | 1>} */
    const deltas = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };
    const delta = deltas[event.key];

    if (!delta) return;
    const items = this.items;
    const target = /** @type {FocsdMenubarItemBase} */ (event.composedPath().find((n) => n instanceof FocsdMenubarItemBase));
    const current = items.indexOf(target);

    if (current < 0) return;
    event.preventDefault();
    const next = nextIndex(current, delta, items.length, () => false);
    const inMenu = event.composedPath().some((n) => n instanceof FocsdMenuItemBase);

    if (inMenu) items[current]?.closeMenu();
    items.forEach((item, i) => {
      item.tabStop = i === next;
    });
    const item = items[next];

    item?.updateComplete.then(() => {
      if (inMenu) item.openMenu('first');
      else /** @type {HTMLElement} */ (item.trigger).focus();
    });
  };

  /** @override */
  render() {
    return html`<slot @slotchange=${this.#sync}></slot>`;
  }
}
