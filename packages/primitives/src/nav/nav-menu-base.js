import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FocsdNavItemBase } from './nav-item-base.js';

/**
 * Disclosure navigation menu: a labeled nav; opening one group closes the others.
 *
 * @slot - Default content.
 * @csspart list - The list element.
 * @csspart nav - The nav element.
 */
export class FocsdNavMenuBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, orientation: { reflect: true } };

  constructor() {
    super();
    /** The accessible name of the navigation. */
    this.label = '';
    /** @type {'horizontal' | 'vertical'} The direction the items are laid out in. */
    this.orientation = 'horizontal';
    // `toggle` does not bubble (as on <details>), so the menu hears its items in the capture phase.
    this.addEventListener(
      'toggle',
      (event) => {
        const item = event.target;

        if (!(item instanceof FocsdNavItemBase) || item.parentElement !== this || !item.open) return;

        for (const other of this.querySelectorAll(':scope > *'))
          if (other !== item && other instanceof FocsdNavItemBase) other.open = false;
      },
      { capture: true },
    );
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('orientation')) this.#syncItems();
  }

  /** Items render vertically (groups open in place) when the menu is vertical. */
  #syncItems = () => {
    for (const item of this.querySelectorAll(':scope > *')) {
      if (item instanceof FocsdNavItemBase) item.toggleAttribute('vertical', this.orientation === 'vertical');
    }
  };

  /** @override */
  render() {
    /* eslint-disable lit-a11y/list -- slotted items carry role=listitem */
    return html`<nav part="nav" aria-label=${this.label || nothing}><ul part="list"><slot @slotchange=${this.#syncItems}></slot></ul></nav>`;
  }
  /* eslint-enable lit-a11y/list */
}
