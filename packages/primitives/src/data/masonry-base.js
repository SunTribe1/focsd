import { css, html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { place } from '../internal/masonry.js';

const supportsNative = () =>
  Boolean(globalThis.CSS?.supports?.('display', 'grid-lanes') || globalThis.CSS?.supports?.('grid-template-rows', 'masonry'));

/**
 * Masonry: children in columns of different heights. Uses CSS masonry (`display: grid-lanes`)
 * where the browser has it; otherwise places children itself and re-lays out when they resize or
 * images load. `order="dom"` (default) keeps the visual order close to the reading order;
 * `order="balanced"` packs into the shortest column. Below two columns' width it is one column.
 * Children keep their own semantics; no role is added. Page CSS can set `--focsd-masonry-min`,
 * `--focsd-masonry-gap` and `--focsd-masonry-template`; they win over the attributes, the way CSS
 * wins over HTML presentational attributes. The attributes are written to private `--_masonry-*`
 * properties on the host.
 *
 * @slot - The items.
 * @csspart probe - A hidden element used to measure the minimum column width.
 * @cssprop --focsd-masonry-min - The narrowest a column gets; wins over `min-column-width`.
 * @cssprop --focsd-masonry-gap - The gap between children; wins over `gap`.
 * @cssprop --focsd-masonry-template - The `grid-template-columns` of the columns; wins over `columns` and `min-column-width`.
 */
export class FocsdMasonryBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    columns: { type: Number },
    minColumnWidth: { attribute: 'min-column-width' },
    gap: { type: Number },
    order: { reflect: true },
    nativeMasonry: { attribute: false },
  };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      :host {
        --_min: var(--focsd-masonry-min, var(--_masonry-min));
        --_gap: var(--focsd-masonry-gap, var(--_masonry-gap));
        display: block;
        /* Positioned children give no intrinsic width: take the available width, also as a flex item. */
        inline-size: 100%;
        flex: 1 1 100%;
        min-inline-size: 0;
      }
      :host([data-layout='native']) {
        /* CSS masonry: the older grid syntax first, the current one wins where supported. */
        display: grid;
        grid-template-rows: masonry;
        display: grid-lanes;
        grid-template-columns: var(--focsd-masonry-template, var(--_masonry-template));
        gap: var(--_gap);
      }
      :host([data-layout='fallback']) {
        position: relative;
      }
      :host([data-layout='fallback']) ::slotted(*) {
        position: absolute;
        box-sizing: border-box;
        margin: 0;
      }
      [part~='probe'] {
        position: absolute;
        visibility: hidden;
        inline-size: var(--_min);
        block-size: 0;
        column-gap: var(--_gap);
      }
    `,
  ];

  /** @type {ResizeObserver | null} */
  #resize = null;
  #frame = 0;
  /** @type {Set<HTMLElement>} */
  #styled = new Set();

  constructor() {
    super();
    /** A fixed number of columns; 0 fits as many columns of `min-column-width` as there is room for. */
    this.columns = 0;
    /** The narrowest a column gets, as a CSS length. */
    this.minColumnWidth = '16rem';
    /** The gap between children, in steps of the spacing scale (`4` is the `space-4` token). */
    this.gap = 4;
    /**
     * @type {'dom' | 'balanced'}
     * `dom` keeps the visual order close to the reading order; `balanced` packs each child into the shortest column.
     */
    this.order = 'dom';
    /** Whether the browser lays out the masonry itself (CSS `display: grid-lanes`); otherwise the element places the children. */
    this.nativeMasonry = supportsNative();
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#resize ??= new ResizeObserver(() => this.#schedule());
    this.addEventListener('load', this.#schedule, true);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resize?.disconnect();
    this.removeEventListener('load', this.#schedule, true);
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#clear();
  }

  /** Remove the positions written on children (switching to native layout, or disconnecting). */
  #clear() {
    for (const el of this.#styled)
      for (const p of ['position', 'inset-inline-start', 'inset-block-start', 'inline-size']) el.style.removeProperty(p);
    this.#styled.clear();
    this.style.removeProperty('block-size');
  }

  #schedule = () => {
    if (this.#frame || this.nativeMasonry) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      this.#layout();
    });
  };

  /** @override */
  updated() {
    this.style.setProperty('--_masonry-min', this.minColumnWidth || '16rem');
    this.style.setProperty('--_masonry-gap', `var(--focsd-space-${this.gap ?? 4})`);
    this.style.setProperty(
      '--_masonry-template',
      this.columns > 0 ? `repeat(${this.columns}, 1fr)` : 'repeat(auto-fill, minmax(min(var(--_min), 100%), 1fr))',
    );
    this.dataset.layout = this.nativeMasonry ? 'native' : 'fallback';
    // Created in connectedCallback, which always runs before an update.
    const resize = /** @type {ResizeObserver} */ (this.#resize);
    resize.disconnect();

    if (this.nativeMasonry) {
      this.#clear();

      return;
    }

    resize.observe(this);

    for (const el of this.children) resize.observe(el);
    this.#schedule();
  }

  #onSlotChange = () => this.requestUpdate();

  #layout() {
    const probe = /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="probe"]'));
    const width = this.clientWidth;
    const gap = Number.parseFloat(getComputedStyle(probe).columnGap) || 0;
    const min = /** @type {HTMLElement} */ (probe).offsetWidth || 256;
    const fit = Math.max(1, Math.floor((width + gap) / (min + gap)));
    const count = this.columns > 0 ? Math.min(this.columns, fit) : fit;
    const columnWidth = (width - gap * (count - 1)) / count;
    const items = [...this.children].filter((el) => el.localName !== 'template');

    for (const el of items) {
      const item = /** @type {HTMLElement} */ (el);
      item.style.setProperty('inline-size', `${columnWidth}px`);
      this.#styled.add(item);
    }

    const heights = items.map((el) => el.getBoundingClientRect().height);
    const { items: spots, height } = place(heights, count, gap, this.order === 'balanced' ? 'balanced' : 'dom');
    spots.forEach(({ column, top }, i) => {
      /** @type {HTMLElement} */ (items[i]).style.setProperty('inset-inline-start', `${column * (columnWidth + gap)}px`);
      /** @type {HTMLElement} */ (items[i]).style.setProperty('inset-block-start', `${top}px`);
    });
    this.style.setProperty('block-size', `${height}px`);
  }

  /** @override */
  render() {
    return html`<span part="probe" aria-hidden="true"></span><slot @slotchange=${this.#onSlotChange}></slot>`;
  }
}
