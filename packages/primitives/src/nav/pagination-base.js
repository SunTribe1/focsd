import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { routeLinks } from '../internal/links.js';
import { iconSvg } from '../internal/icons.js';

/**
 * Page numbers to show: first, last, current ± siblings, with 'gap' markers.
 * @param {number} page
 * @param {number} total
 * @param {number} [siblings]
 * @returns {(number | 'gap')[]}
 */
export function pageItems(page, total, siblings = 1) {
  /** @type {(number | 'gap')[]} */
  const items = [];
  const start = Math.max(2, page - siblings);
  const end = Math.min(total - 1, page + siblings);
  items.push(1);

  if (start > 2) items.push('gap');

  for (let p = start; p <= end; p += 1) items.push(p);

  if (end < total - 1) items.push('gap');

  if (total > 1) items.push(total);

  return items;
}

/**
 * `detail` of `focsd-page-change`: the page the person asked for.
 * @typedef {{ page: number }} PageChangeDetail
 */

/**
 * Pagination: labeled nav; links when `href` (with {page}) is set, otherwise buttons firing
 * `focsd-page-change`. The element does not change `page` itself: set it from the event.
 *
 * @fires {CustomEvent<PageChangeDetail>} focsd-page-change - Fired when the person picks another page; `detail.page` is it.
 * @csspart disabled - Added to the previous or next control on the first or last page (with `href`).
 * @csspart gap - The ellipsis between page numbers.
 * @csspart list - The list element.
 * @csspart nav - The nav element.
 * @csspart page - Each page button or link (with `current` page via aria-current).
 * @csspart previous - The previous-page control.
 * @csspart next - The next-page control.
 */
export class FocsdPaginationBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { page: { type: Number }, total: { type: Number }, label: {}, siblings: { type: Number }, href: {} };

  constructor() {
    super();
    // Plain same-origin link clicks go to the app's link handler (setLinkHandler), if any.
    routeLinks(this);
    /** The current page, from 1. The element does not change it: set it from `focsd-page-change`. */
    this.page = 1;
    /** The number of pages. */
    this.total = 1;
    /** The accessible name of the navigation. */
    this.label = '';
    /** How many page numbers show on each side of the current page. */
    this.siblings = 1;
    /** A URL pattern with `{page}`, such as `?page={page}`. With it the pages are links; without it, buttons. */
    this.href = '';
  }

  /** @param {number} page */
  #go(page) {
    if (page < 1 || page > this.total || page === this.page) return;
    /** @type {PageChangeDetail} */
    const detail = { page };

    this.dispatchEvent(new CustomEvent('focsd-page-change', { bubbles: true, detail }));
  }

  /**
   * @param {number} page
   * @param {unknown} content
   * @param {string} label
   * @param {{ current?: boolean, disabled?: boolean, part?: string }} [options]
   */
  #control(page, content, label, { current = false, disabled = false, part = 'page' } = {}) {
    if (this.href) {
      if (disabled) return html`<span part="${part} disabled" aria-hidden="true">${content}</span>`;

      return html`<a part=${part} href=${this.href.replaceAll('{page}', String(page))} aria-label=${label} aria-current=${current ? 'page' : nothing}>${content}</a>`;
    }

    // aria-disabled (not disabled) so focus stays on Previous/Next when the end is reached.
    return html`<button part=${part} type="button" aria-label=${label} aria-current=${current ? 'page' : nothing} aria-disabled=${disabled ? 'true' : nothing} @click=${() => {
      if (!disabled) this.#go(page);
    }}>${content}</button>`;
  }

  /** @override */
  render() {
    const page = Math.min(Math.max(1, this.page), Math.max(1, this.total));

    return html`<nav part="nav" aria-label=${this.label || this.localize.term('pagination')}>
      <ul part="list">
        <li>${this.#control(page - 1, iconSvg('chevron-left'), this.localize.term('previousPage'), { disabled: page <= 1, part: 'previous' })}</li>
        ${pageItems(page, this.total, this.siblings).map((item) =>
          item === 'gap'
            ? html`<li part="gap" aria-hidden="true">…</li>`
            : html`<li>${this.#control(item, item, this.localize.term('pageNumber', item), { current: item === page })}</li>`,
        )}
        <li>${this.#control(page + 1, iconSvg('chevron-right'), this.localize.term('nextPage'), { disabled: page >= this.total, part: 'next' })}</li>
      </ul>
    </nav>`;
  }
}
