import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { warnOnce } from '../internal/warn.js';
import { FocsdBottomNavItemBase } from './bottom-nav-item-base.js';

/** The width (px) at and above which the bar hides by default: wider screens use a sidebar or header. */
const HIDE_ABOVE = 768;
const MIN_ITEMS = 3;
const MAX_ITEMS = 5;

/**
 * Bottom navigation: a `nav` landmark (named "Main" by default) with a list of 3 to 5 links for an
 * app's top-level sections on small screens. Fixed (default) or sticky to the block end, padded for
 * the device's safe area, and hidden at `hide-above` px and wider. Clicks go through the app's
 * link handler (`setLinkHandler`). A click on an item makes it the current one (a modifier click, which
 * opens a new tab or window, does not); set `current` yourself to choose another. When fixed, the element keeps the bar's height in the page flow,
 * so placed last in the page (after all other content) it never covers the last content. Give the page `scroll-padding-block-end` the bar's height so a focused element is never hidden behind it.
 *
 * @slot - The `focsd-bottom-nav-item` elements.
 * @csspart nav - The nav element.
 * @csspart list - The list element.
 */
export class FocsdBottomNavBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, position: { reflect: true }, hideAbove: { type: Number, attribute: 'hide-above', reflect: true } };

  /** @type {MediaQueryList | null} */
  #media = null;

  #onMedia = () => this.toggleAttribute('data-wide', Boolean(this.hideAbove > 0 && this.#media?.matches));

  constructor() {
    super();
    /** The accessible name of the navigation (default "Main"). */
    this.label = '';
    /** @type {'fixed' | 'sticky' | 'static'} How the bar sits: fixed to the viewport's block end (default), sticky, or in the flow. */
    this.position = 'fixed';
    /** Hidden at this viewport width (px) and wider; 0 never hides. Reflected, so the stylesheet can tell the default from a custom width. */
    this.hideAbove = HIDE_ABOVE;
    this.addEventListener('click', this.#onClick);
  }

  /** The clicked item becomes the current one, unless the click opens a new tab or window. */
  #onClick = (/** @type {MouseEvent} */ event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const item = event.composedPath().find((node) => node instanceof FocsdBottomNavItemBase);

    if (!item || !this.items.includes(/** @type {FocsdBottomNavItemBase} */ (item))) return;

    for (const other of this.items) other.current = other === item;
  };

  /** The items, in order. */
  get items() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdBottomNavItemBase);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#watch();
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#media?.removeEventListener('change', this.#onMedia);
    this.#media = null;
  }

  /** @override */
  firstUpdated() {
    this.#onSlotChange();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('hideAbove') && this.hideAbove !== this.#watched) this.#watch();
  }

  /** The `hideAbove` the media query was made for (the property may be set between connecting and the first render). */
  #watched = NaN;

  #watch() {
    this.#watched = this.hideAbove;
    this.#media?.removeEventListener('change', this.#onMedia);
    this.#media = this.hideAbove > 0 ? (globalThis.matchMedia?.(`(min-width: ${this.hideAbove}px)`) ?? null) : null;
    this.#media?.addEventListener('change', this.#onMedia);
    this.#onMedia();
  }

  #onSlotChange = () => {
    const count = this.items.length;

    if (count < MIN_ITEMS || count > MAX_ITEMS)
      warnOnce('bottom-nav:count', `a bottom navigation works best with 3 to 5 items (this one has ${count}).`, this);
  };

  /** @override */
  render() {
    /* eslint-disable lit-a11y/list -- slotted items carry role=listitem */
    return html`<nav part="nav" aria-label=${this.label || this.localize.term('bottomNav')}>
      <ul part="list"><slot @slotchange=${this.#onSlotChange}></slot></ul>
    </nav>`;
    /* eslint-enable lit-a11y/list */
  }
}
