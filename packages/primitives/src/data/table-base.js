import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';
import { nextDirection, sortTableRows } from './sorting.js';

/**
 * A table column. `key` names the row field and `label` is the header text. `key`/`label` is the
 * house shape for column and series definitions (`TableColumn`, `ChartSeries`); the data grid's
 * `ColumnDef` predates it and uses `id`/`field`/`header`.
 * @typedef {{ key: string, label: string, numeric?: boolean, sortable?: boolean }} TableColumn
 */

/**
 * `detail` of `focsd-sort`: the sorted column's key and the new direction.
 * @typedef {{ key: string, direction: 'ascending' | 'descending' }} TableSortDetail
 */

/**
 * Captioned native table with sortable headers (aria-sort) in a focusable scroll region.
 *
 * @fires {CustomEvent<TableSortDetail>} focsd-sort - Fired when a column is sorted. `detail.key` and `detail.direction` describe the sort.
 * @csspart caption - The caption element.
 * @csspart cell - The cell element.
 * @csspart header - The header element.
 * @csspart numeric - Added to header and cells of numeric columns.
 * @csspart sort - The sort button in a sortable column header.
 * @csspart sort-icon - The sort direction arrow.
 * @csspart table - The table element.
 * @csspart viewport - The viewport element.
 */
export class FocsdTableBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    caption: {},
    columns: { attribute: false },
    rows: { attribute: false },
    sortKey: { attribute: 'sort-key' },
    sortDirection: { attribute: 'sort-direction' },
    _scrolls: { state: true },
  };

  constructor() {
    super();
    /** The table's caption, which also names it. */
    this.caption = '';
    /** @type {TableColumn[]} The columns: each a `key` into the rows, a `label`, and whether it is `numeric` or `sortable`. */
    this.columns = [];
    /** @type {Record<string, unknown>[]} The rows, as objects keyed by the column keys. */
    this.rows = [];
    /** The key of the column the rows are sorted by. */
    this.sortKey = '';
    /** @type {import('./sorting.js').SortDirection} The sort direction of `sort-key`. */
    this.sortDirection = 'none';
    /** @internal */
    this._scrolls = false;
  }

  /** The viewport is a tab stop only when it scrolls (WCAG 2.1.1); otherwise it would be an empty stop. */
  /** Created on first render (and on reconnect), not at construction, so server rendering needs no ResizeObserver. */
  /** @type {ResizeObserver | undefined} */
  #resize;

  #measure() {
    const viewport = this.renderRoot.querySelector('[part~="viewport"]');

    if (viewport) this._scrolls = viewport.scrollWidth > viewport.clientWidth + 1 || viewport.scrollHeight > viewport.clientHeight + 1;
  }

  /** @override */
  firstUpdated() {
    this.#resize = new ResizeObserver(() => this.#measure());
    this.#resize.observe(/** @type {Element} */ (this.renderRoot.querySelector('[part~="viewport"]')));
    this.#resize.observe(/** @type {Element} */ (this.renderRoot.querySelector('[part~="table"]')));
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resize?.disconnect();
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    if (this.hasUpdated) this.firstUpdated();
  }

  /** @param {string} key */
  #sort(key) {
    const direction = nextDirection(this.sortKey, key, this.sortDirection);

    this.sortDirection = direction;
    this.sortKey = key;
    /** @type {TableSortDetail} */
    const detail = { key, direction };

    this.dispatchEvent(new CustomEvent('focsd-sort', { bubbles: true, detail }));
  }

  /** @override */
  render() {
    const rows = sortTableRows(this.rows, this.sortKey, this.sortDirection);

    return html`<div part="viewport" role="region" aria-label=${this.caption || nothing} tabindex=${this._scrolls ? '0' : nothing}>
      <table part="table">
        <caption part="caption">${this.caption}</caption>
        <thead><tr>${this.columns.map((col) => {
          const sorted = col.key === this.sortKey ? this.sortDirection : 'none';

          return html`<th part="header ${col.numeric ? 'numeric' : ''}" scope="col" aria-sort=${col.sortable ? sorted : nothing}>${
            col.sortable
              ? html`<button part="sort" type="button" @click=${() => this.#sort(col.key)}>${col.label}<span part="sort-icon" aria-hidden="true">${iconSvg(sorted === 'descending' ? 'arrow-down' : sorted === 'ascending' ? 'arrow-up' : 'chevron-down')}</span></button>`
              : col.label
          }</th>`;
        })}</tr></thead>
        <tbody>${rows.map((row) => html`<tr>${this.columns.map((col) => html`<td part="cell ${col.numeric ? 'numeric' : ''}">${row[col.key]}</td>`)}</tr>`)}</tbody>
      </table>
    </div>`;
  }
}
