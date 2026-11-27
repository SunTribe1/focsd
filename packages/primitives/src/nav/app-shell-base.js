import { html, nothing } from 'lit';
import { iconSvg } from '../internal/icons.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { warnOnce } from '../internal/warn.js';

/**
 * App shell: lays out the author's header, sidebar, main content and footer in a grid, with a skip
 * link to the main region; below `collapse-below` the sidebar becomes a drawer.
 *
 * The shell renders the page's one `main` landmark around the default slot, so slotted content
 * should not hold another `main`. Below `collapse-below` a menu button ("Open navigation") sits
 * before the header and opens the sidebar in a modal dialog; Escape, the close button or following
 * a link closes it and focus returns to the menu button.
 *
 * @slot header - The page header, usually a focsd-header.
 * @slot sidebar - The navigation, usually a focsd-sidebar. It moves into the drawer when compact.
 * @slot - The main content.
 * @slot footer - The page footer, usually a focsd-footer.
 * @csspart skip-link - The "Skip to main content" link, visible only while focused.
 * @csspart grid - The grid holding header, sidebar, main and footer.
 * @csspart header - The header row (menu button and header slot).
 * @csspart sidebar - The sidebar column (wide only).
 * @csspart main - The scrolling main region.
 * @csspart footer - The footer row.
 * @csspart nav-toggle - The menu button that opens the drawer (compact only).
 * @csspart drawer - The navigation drawer, a modal dialog (compact only).
 * @csspart drawer-close - The drawer's close button.
 */
export class FocsdAppShellBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    collapseBelow: { type: Number, attribute: 'collapse-below' },
    navLabel: { attribute: 'nav-label' },
    compact: { type: Boolean, reflect: true },
    _open: { state: true },
  };

  /** Created on connect, not at construction, so server rendering needs no ResizeObserver. */
  /** @type {ResizeObserver | undefined} */
  #observer;
  /** Whether focus was on the drawer's close button when the drawer was removed. */
  #refocus = false;

  constructor() {
    super();
    /** The shell's own width in CSS pixels below which the sidebar collapses into a drawer. */
    this.collapseBelow = 768;
    /** Accessible name of the navigation drawer; defaults to "Navigation". */
    this.navLabel = '';
    /** Whether the shell is narrower than `collapse-below` and shows the sidebar in a drawer. Set by the shell. */
    this.compact = false;
    /** @internal Whether the drawer is open (for the menu button's aria-expanded). */
    this._open = false;
    this.addEventListener('click', this.#onClick);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#observer ??= new ResizeObserver(([entry]) => entry && this.#measure(entry.contentRect.width));
    this.#observer.observe(this);
    this.#checkMain();
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** @param {number} width */
  #measure(width) {
    const compact = width < this.collapseBelow;

    if (compact !== this.compact) this.compact = compact;
  }

  #checkMain = () => {
    if (this.querySelector(':scope > main, :scope > [role="main"]')) {
      warnOnce('app-shell:main', 'focsd-app-shell renders the main landmark; slot the content without a <main> or role="main".');
    }
  };

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // A new collapse-below applies at once; the observer only fires when the size changes.
    if (changed.has('collapseBelow') && changed.get('collapseBelow') !== undefined && this.isConnected) {
      this.#measure(this.getBoundingClientRect().width);
    }

    // Growing past collapse-below removes the drawer, open or not, with no close event; focus on its
    // close button would fall to the body, so it moves to main.
    if (changed.has('compact') && !this.compact) {
      this.#refocus = this.hasUpdated && this.#drawer?.open === true && this.shadowRoot?.activeElement != null;
      this._open = false;
    }
  }

  /** @override */
  updated() {
    if (!this.#refocus) return;
    this.#refocus = false;
    /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('main'))?.focus();
  }

  get #drawer() {
    return /** @type {HTMLDialogElement | null} */ (this.renderRoot.querySelector('[part~="drawer"]'));
  }

  /**
   * Fragment navigation cannot reach an id inside the shadow root, so focus main directly. Main is
   * itself a tab stop (tabindex 0) because it is the page's scroller: keyboard users must be able
   * to reach it to scroll it even when it holds nothing focusable.
   * @param {Event} event
   */
  #focusMain = (event) => {
    event.preventDefault();
    /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('main'))?.focus();
  };

  #openDrawer = () => {
    this.#drawer?.showModal();
    this._open = true;
  };

  #closeDrawer = () => this.#drawer?.close();

  #onDrawerClose = () => {
    this._open = false;
    /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="nav-toggle"]'))?.focus();
  };

  /**
   * Following a link inside the open drawer closes it (Enter on a link fires click too).
   * @param {MouseEvent} event
   */
  #onClick = (event) => {
    const path = event.composedPath();
    const drawer = this.#drawer;

    if (drawer?.open && path.includes(drawer) && path.some((n) => n instanceof Element && n.matches('a[href]'))) this.#closeDrawer();
  };

  #renderDrawer() {
    const term = (/** @type {string} */ key) => this.localize.term(key);

    return html`<dialog part="drawer" id="drawer" aria-label=${this.navLabel || term('navigation')} @close=${this.#onDrawerClose}>
      <button part="drawer-close" type="button" aria-label=${term('closeNavigation')} @click=${this.#closeDrawer}>${iconSvg('x')}</button>
      <slot name="sidebar"></slot>
    </dialog>`;
  }

  /** @override */
  render() {
    const toggle = html`<button part="nav-toggle" type="button" aria-label=${this.localize.term('openNavigation')} aria-haspopup="dialog" aria-expanded=${String(this._open)} aria-controls="drawer" @click=${this.#openDrawer}>${iconSvg('menu')}</button>`;

    return html`<a part="skip-link" href="#main" @click=${this.#focusMain}>${this.localize.term('skipToContent')}</a>
      <div part="grid">
        <div part="header">${this.compact ? toggle : nothing}<slot name="header"></slot></div>
        ${this.compact ? nothing : html`<div part="sidebar"><slot name="sidebar"></slot></div>`}
        <main part="main" id="main" tabindex="0"><slot @slotchange=${this.#checkMain}></slot></main>
        <div part="footer"><slot name="footer"></slot></div>
      </div>
      ${this.compact ? this.#renderDrawer() : nothing}`;
  }
}
