import { html, nothing } from 'lit';
import { uid } from '../internal/id.js';
import { iconSvg } from '../internal/icons.js';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * App header: a banner landmark with brand, navigation and actions. Below `collapse-below` pixels
 * it becomes compact: a menu button (aria-expanded, aria-controls) shows and hides the navigation,
 * and slotted focsd-nav-menu elements switch to vertical orientation.
 *
 * @slot brand - Logo or product name.
 * @slot - Navigation, usually a focsd-nav-menu.
 * @slot actions - Buttons such as "Sign in".
 * @csspart header - The header element.
 * @csspart bar - The row holding brand, menu button and actions.
 * @csspart brand - The brand container.
 * @csspart toggle - The menu button (compact only).
 * @csspart main - The navigation container (a panel when compact).
 * @csspart actions - The actions container.
 */
export class FocsdHeaderBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    sticky: { type: Boolean, reflect: true },
    collapseBelow: { type: Number, attribute: 'collapse-below' },
    menuLabel: { attribute: 'menu-label' },
    compact: { type: Boolean, reflect: true },
    _open: { state: true },
  };

  #panelId = uid('focsd-header-panel');

  /** Created on connect, not at construction, so server rendering needs no ResizeObserver. */
  /** @type {ResizeObserver | undefined} */
  #observer;

  constructor() {
    super();
    /** Keeps the header at the top of the viewport while the page scrolls. */
    this.sticky = false;
    /** Below this width in pixels the header is compact: the navigation moves behind a menu button. */
    this.collapseBelow = 768;
    /** The accessible name of the menu button; defaults to the translated "Menu". */
    this.menuLabel = '';
    /** Whether the header is compact. Set by the header from `collapse-below`; reflected for styling. */
    this.compact = false;
    this._open = false;
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('click', this.#onClick);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#observer ??= new ResizeObserver(([entry]) => entry && this.#measure(entry.contentRect.width));
    this.#observer.observe(this);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** @param {number} width */
  #measure(width) {
    const compact = width < this.collapseBelow;

    if (compact !== this.compact) {
      this.compact = compact;

      if (!compact) this._open = false;
    }
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // A new collapse-below applies at once; the observer only fires when the size changes.
    if (changed.has('collapseBelow') && changed.get('collapseBelow') !== undefined && this.isConnected) {
      this.#measure(this.#contentWidth());
    }
  }

  /** The content-box width, the same box the ResizeObserver reports (`contentRect`). */
  #contentWidth() {
    const { paddingLeft, paddingRight, borderLeftWidth, borderRightWidth } = getComputedStyle(this);
    const edges = [paddingLeft, paddingRight, borderLeftWidth, borderRightWidth].reduce((sum, v) => sum + (Number.parseFloat(v) || 0), 0);

    return this.getBoundingClientRect().width - edges;
  }

  get #toggle() {
    return this.renderRoot.querySelector('[part~="toggle"]');
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('compact')) {
      for (const nav of this.querySelectorAll(':scope > focsd-nav-menu, :scope > [data-focsd-nav]')) {
        nav.setAttribute('orientation', this.compact ? 'vertical' : 'horizontal');
      }
    }
  }

  /**
   * Close the compact navigation panel; optionally move focus back to the menu button.
   * @param {{ focus?: boolean }} [options]
   */
  closeMenu({ focus = false } = {}) {
    if (!this._open) return;
    this._open = false;

    if (focus) this.updateComplete.then(() => /** @type {HTMLElement} */ (this.#toggle)?.focus());
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (event.key === 'Escape' && this.compact && this._open) {
      event.stopPropagation();
      this.closeMenu({ focus: true });
    }
  };

  /**
   * Following a link inside the panel closes it.
   * @param {MouseEvent} event
   */
  #onClick = (event) => {
    if (!this.compact || !this._open) return;
    const link = /** @type {Element | undefined} */ (event.composedPath().find((n) => n instanceof Element && n.matches?.('a[href]')));
    const root = /** @type {Partial<ShadowRoot>} */ (link?.getRootNode());

    if (link && this.contains(root.host ?? link)) this.closeMenu();
  };

  /** @override */
  render() {
    const hidden = this.compact && !this._open;

    return html`<header part="header" role="banner">
      <div part="bar">
        <div part="brand"><slot name="brand"></slot></div>
        ${
          this.compact
            ? html`<button part="toggle" type="button" aria-expanded=${String(this._open)} aria-controls=${this.#panelId} @click=${() => {
                this._open = !this._open;
              }}>${iconSvg(this._open ? 'x' : 'menu', 'icon')}<span part="toggle-label">${this.menuLabel || this.localize.term('menu')}</span></button>`
            : nothing
        }
        <div part="actions"><slot name="actions"></slot></div>
      </div>
      <div part="main" id=${this.#panelId} ?hidden=${hidden}><slot></slot></div>
    </header>`;
  }
}
