import { html, nothing } from 'lit';
import { FocsdSegmentBase } from './segment-base.js';
import { icon } from '../internal/icons.js';
import { HoverIntent } from '../internal/popup.js';

/** Hover before the label shows, and the grace before it hides once the pointer has left (WCAG 1.4.13). */
const SHOW_DELAY = 300;

const HIDE_GRACE = 150;

/**
 * An item of a dock: an icon above a short label. It is a radio like a segment; the bar
 * manages its checked state, tab stop and its `item` / `item-selected` parts. The label always
 * names the item. When the bar hides labels (`label-display="hidden"`), the label shows as a small
 * tip on hover and keyboard focus instead; Escape hides it.
 *
 * @slot - The item's label.
 * @slot icon - A custom icon (an `svg` or `focsd-icon`), used instead of the `icon` attribute.
 * @csspart icon - The icon (decorative; the label names the item).
 * @csspart label - The label element.
 * @csspart tip - The label shown on hover and focus while labels are hidden.
 */
export class FocsdDockItemBase extends FocsdSegmentBase {
  #intent = new HoverIntent(this, { show: () => this.#tip(true), hide: () => this.#tip(false) });

  constructor() {
    super();
    this.addEventListener('pointerenter', () => this.#hover(true));
    this.addEventListener('pointerleave', () => this.#hover(false));
    this.addEventListener('focusin', () => this.#focus(true));
    this.addEventListener('focusout', () => this.#focus(false));
    this.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.#tip(false)) event.stopPropagation();
    });
  }

  get #labelsHidden() {
    return this.hasAttribute('data-labels-hidden');
  }

  /** @param {boolean} on */
  #hover(on) {
    this.#intent.setHovered(on);

    if (on && this.#labelsHidden) this.#intent.showAfter(SHOW_DELAY);
    else if (!on) this.#intent.hideAfter(HIDE_GRACE);
  }

  /** @param {boolean} on */
  #focus(on) {
    this.#intent.setFocused(on);

    if (on && this.#labelsHidden && this.matches(':focus-visible')) this.#tip(true);
    else if (!on) this.#intent.hideAfter(HIDE_GRACE);
  }

  /**
   * Show or hide the tip; true when that changed it.
   * @param {boolean} show
   */
  #tip(show) {
    const tip = /** @type {HTMLElement | null} */ (this.renderRoot?.querySelector('[part~="tip"]'));

    // No Popover API (an old engine, or a test DOM): no tip; the label still names the item.
    if (!tip || !('showPopover' in tip)) return false;

    if (tip.matches(':popover-open') === show || (show && !this.#labelsHidden)) return false;

    if (show) {
      tip.textContent = this.textContent?.replaceAll(/\s+/g, ' ').trim() ?? '';
      tip.showPopover();
    } else tip.hidePopover();

    return true;
  }

  /** @override */
  render() {
    return html`<span part="icon" aria-hidden="true"
        >${this.icon ? icon({ name: this.icon, library: this.iconLibrary || undefined }, 'svg') : nothing}<slot name="icon"></slot></span
      ><span part="label"><slot></slot></span><span part="tip" popover="manual" aria-hidden="true"></span>`;
  }
}
