import { html, nothing } from 'lit';
import { displayColumns } from '../engine/columns.js';
import { toCsv } from '../engine/csv.js';
import { sanitizeState } from '../engine/state.js';

const STATE_DEBOUNCE = 250;
const TRACKED = ['_colState', '_sort', '_filters', '_search', '_groupBy', '_expanded', '_page', 'pageSize', 'density'];

/**
 * @typedef {import('../events.js').StateChangeDetail} StateChangeDetail
 */

/**
 * @typedef {object} GridApi
 * @property {boolean} external Server mode: rows are one page from the server.
 * @property {number} rowCount Total rows on the server (server mode).
 * @property {boolean} loading
 * @property {number} pageSize
 * @property {import('../engine/model.js').GridDensity} density
 * @property {() => import('../engine/model.js').GridState} getState The view state (columns, sort, filters, grouping, page).
 * @property {(state: Partial<import('../engine/model.js').GridState>) => void} setState
 * @property {(options?: { selectedOnly?: boolean, raw?: boolean }) => string} exportCsv
 * @property {(filename?: string, options?: { selectedOnly?: boolean, raw?: boolean }) => void} downloadCsv
 * @property {(id: unknown) => boolean} scrollToRow
 */

/**
 * Public API for focsd-data-grid: view state (get/set and a debounced `focsd-state-change` event), CSV
 * export, server mode (`external` with `rowCount`), loading state, and toolbar extras.
 *
 * @template {new (...args: any[]) => import('lit').LitElement & import('./host.js').GridHost} T
 * @param {T} Base
 * @returns {T & (new (...args: any[]) => GridApi & import('./host.js').GridHost)}
 */
export const ApiMixin = (Base) =>
  class extends Base {
    /** @type {import('lit').PropertyDeclarations} */
    static properties = {
      external: { type: Boolean, reflect: true },
      rowCount: { type: Number, attribute: 'row-count' },
      loading: { type: Boolean, reflect: true },
    };

    _stateTimer = 0;

    /** @param {any[]} args */
    constructor(...args) {
      super(...args);
      /** Server mode: `rows` is one page from the server, and sorting, filtering and paging fire events instead. */
      this.external = false;
      /** In server mode, the total number of rows on the server. */
      this.rowCount = 0;
      /** Shows the loading state and marks the grid busy. */
      this.loading = false;
    }

    /** @override */
    disconnectedCallback() {
      super.disconnectedCallback();
      clearTimeout(this._stateTimer);
    }

    // ---- view state -----------------------------------------------------------------------------

    /**
     * The current view as JSON-safe state (see sanitizeState for the shape).
     * @returns {import('../engine/model.js').GridState}
     */
    getState() {
      return {
        columnState: this._colState,
        sortModel: this._sort,
        filterModel: this._filters,
        quickSearch: this._search,
        groupBy: this._groupBy,
        expanded: this._expanded === 'all' ? 'all' : [...this._expanded],
        page: this._page,
        pageSize: this.pageSize,
        density: this.density,
      };
    }

    /**
     * Apply saved state. Unknown columns, operators and invalid values are dropped.
     * @param {Partial<import('../engine/model.js').GridState>} state
     */
    setState(state) {
      this.ensureColumns();
      const s = sanitizeState(state, this._cols);
      this._colState = s.columnState;
      this._sort = s.sortModel;
      this._filters = s.filterModel;
      this._search = s.quickSearch;
      this._groupBy = s.groupBy;
      this._expanded = s.expanded === 'all' ? 'all' : new Set(s.expanded);
      this._page = s.page;

      if (s.pageSize !== null) this.pageSize = s.pageSize;
      this.density = s.density;
    }

    /**
     * Called by the grid after each update: emit a debounced focsd-state-change when the view changed.
     * @param {Map<PropertyKey, unknown>} changed
     * @override
     */
    trackStateChange(changed) {
      if (!this.hasUpdated || !TRACKED.some((k) => changed.has(k))) return;
      clearTimeout(this._stateTimer);
      this._stateTimer = setTimeout(() => {
        /** @type {CustomEvent<StateChangeDetail>} */
        this.dispatchEvent(new CustomEvent('focsd-state-change', { bubbles: true, detail: { state: this.getState() } }));
      }, STATE_DEBOUNCE);
    }

    // ---- export ---------------------------------------------------------------------------------

    /**
     * CSV of the filtered, sorted, visible view; `selectedOnly` limits it to selected rows.
     * @param {{ selectedOnly?: boolean, raw?: boolean }} [options]
     * @returns {string}
     */
    exportCsv({ selectedOnly = false, raw = false } = {}) {
      const columns = displayColumns(this._cols, this._colState);
      const rows = selectedOnly ? this.view.sortedRows.filter((r) => this._selected.has(this.getRowId(r))) : this.view.sortedRows;

      return toCsv(rows, columns, { locale: this.resolvedLocale, raw });
    }

    /**
     * Downloads the rows as a CSV file, in the current sort and filter; `selectedOnly` limits it to the selected rows.
     * @param {string} [filename]
     * @param {{ selectedOnly?: boolean, raw?: boolean }} [options]
     */
    downloadCsv(filename = `${this.label || 'data'}.csv`, options) {
      const url = URL.createObjectURL(new Blob([this.exportCsv(options)], { type: 'text/csv;charset=utf-8' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: filename });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    // ---- navigation from code -------------------------------------------------------------------

    /**
     * Bring a row into view (changing page if needed) and focus it in the active column.
     * @param {unknown} id
     * @returns {boolean}
     * @override
     */
    scrollToRow(id) {
      const key = `r:${id}`;
      const index = this.view.displayRows.findIndex((r) => this.keyOf(r) === key);

      if (index < 0) return false;
      const col = this._active.col;

      if (this.pageSize && !this.external) {
        const page = Math.floor(index / this.pageSize) + 1;

        if (page !== this._page) this.goToPage(page);
        this.updateComplete.then(() => this.activate(index - (page - 1) * this.pageSize + 1, col));
      } else {
        this.activate(index + 1, col);
      }

      return true;
    }

    // ---- toolbar extras -------------------------------------------------------------------------

    /** @override @returns {import('lit').TemplateResult} */
    renderToolbarActions() {
      const groupable = this._cols.filter((c) => c.groupable);
      const groupId = `${this.idPrefix}-group`;

      // Server mode renders one page at a time, so local grouping would group that page only.
      const grouping = this.external
        ? nothing
        : html`<label class="focsd-visually-hidden" for=${groupId}>${this.localize.term('groupBy')}</label>
        <select
          part="toolbar-select"
          id=${groupId}
          @change=${(/** @type {Event & { target: HTMLSelectElement }} */ e) => this.setGroupBy(e.target.value ? [e.target.value] : [])}
        >
          <option value="" ?selected=${!this._groupBy.length}>${this.localize.term('noGrouping')}</option>
          ${groupable.map((c) => html`<option value=${c.id} ?selected=${this._groupBy[0] === c.id}>${this.localize.term('groupByColumn', c.header)}</option>`)}
        </select>`;

      return html`${grouping}
        <button
          part="toolbar-button"
          type="button"
          aria-pressed=${String(this.density === 'compact')}
          @click=${() => {
            this.density = this.density === 'compact' ? 'comfortable' : 'compact';
            this._announce = this.localize.term(this.density === 'compact' ? 'compactRowsOn' : 'compactRowsOff');
          }}
        >
          ${this.localize.term('compactRows')}
        </button>
        <button part="toolbar-button" type="button" @click=${() => this.downloadCsv()}>${this.localize.term('exportCsv')}</button>
        ${super.renderToolbarActions?.() ?? nothing}`;
    }
  };
