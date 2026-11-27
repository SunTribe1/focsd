import { html } from 'lit';
import { createColumnState, moveColumn } from '../engine/columns.js';
import { describeFilter } from '../engine/filter.js';
import { draftToFilter, filterDraft } from '../view/filter-popover.js';
import { placePopup, popupEdge, showPlaced } from '../view/position.js';

const SEARCH_ANNOUNCE_DELAY = 400;

/**
 * @typedef {import('../events.js').SearchChangeDetail} SearchChangeDetail
 * @typedef {import('../events.js').FilterChangeDetail} FilterChangeDetail
 */

/**
 * @typedef {import('../engine/model.js').Column} Column
 * @typedef {import('../engine/model.js').Filter} Filter
 * @typedef {import('./host.js').FilterDraft} FilterDraft
 *
 * @typedef {object} GridFiltersApi
 * @property {boolean} quickSearch
 * @property {boolean} toolbar
 * @property {(text: string) => void} setSearch
 * @property {(colId: string, filter: Filter | null) => void} setFilter
 * @property {(colId: string) => void} clearFilter
 * @property {() => void} clearAllFilters
 * @property {() => void} clearSearchAndFilters
 * @property {(colId: string) => void} openFilter
 */

/**
 * Filtering for focsd-data-grid: quick search, per-column filter dialogs, chips, and the column
 * panel. Expects the host to provide `_filters`, `_search`, `_colState`, `_cols`, `view`,
 * `columnById`, `focusActive`, `showColumn`, `hideColumn` and `_announce`.
 *
 * @template {new (...args: any[]) => import('lit').LitElement & import('./host.js').GridHost} T
 * @param {T} Base
 * @returns {T & (new (...args: any[]) => GridFiltersApi & import('./host.js').GridHost)}
 */
export const FiltersMixin = (Base) =>
  class extends Base {
    /** @type {import('lit').PropertyDeclarations} */
    static properties = {
      quickSearch: { type: Boolean, attribute: 'quick-search' },
      toolbar: { type: Boolean },
      _filterDraft: { state: true },
      _panel: { state: true },
    };

    _searchTimer = 0;

    /** @type {string | null} */
    _pendingFilterMessage = null;

    /** @param {any[]} args */
    constructor(...args) {
      super(...args);
      /** Adds a quick search box that filters every column. */
      this.quickSearch = false;
      /** Shows the toolbar: quick search (with `quick-search`), the columns panel and export. */
      this.toolbar = false;
      /** @type {FilterDraft | null} */
      this._filterDraft = null;
      /** @type {import('./host.js').PopoverPosition | null} */
      this._panel = null;
    }

    /** @override */
    disconnectedCallback() {
      super.disconnectedCallback();
      clearTimeout(this._searchTimer);
    }

    /**
     * Called after the pipeline runs: announce filter results with the new counts.
     * @override
     */
    announceFilterResult() {
      if (this._pendingFilterMessage === null) return;
      const { matched, total } = this.view;
      this._announce = `${this._pendingFilterMessage}${this.localize.term('matchedOfTotal', matched, total)}`;
      this._pendingFilterMessage = null;
    }

    // ---- quick search ---------------------------------------------------------------------------

    /**
     * Sets the quick search text.
     * @param {string} text
     * @override
     */
    setSearch(text) {
      this._search = text;
      this._page = 1;
      /** @type {CustomEvent<SearchChangeDetail>} */
      this.dispatchEvent(new CustomEvent('focsd-search-change', { bubbles: true, detail: { quickSearch: text } }));
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => {
        this._pendingFilterMessage = '';
        this.requestUpdate();
      }, SEARCH_ANNOUNCE_DELAY);
    }

    // ---- column filters -------------------------------------------------------------------------

    /**
     * @param {Record<string, Filter>} next
     * @param {string} message
     */
    _setFilters(next, message) {
      this._filters = next;
      this._page = 1;
      this._pendingFilterMessage = message;
      /** @type {CustomEvent<FilterChangeDetail>} */
      this.dispatchEvent(new CustomEvent('focsd-filter-change', { bubbles: true, detail: { filterModel: next } }));
    }

    /**
     * Sets a column's filter.
     * @param {string} colId
     * @param {Filter | null} filter
     */
    setFilter(colId, filter) {
      const column = /** @type {Column} */ (this.columnById(colId));
      const rest = Object.fromEntries(Object.entries(this._filters).filter(([id]) => id !== colId));

      if (!filter) {
        this._setFilters(rest, this.localize.term('filterRemoved', column.header));

        return;
      }

      this._setFilters({ ...rest, [colId]: filter }, this.localize.term('filterApplied', this.describeFilter(filter, column)));
    }

    /**
     * Removes a column's filter.
     * @param {string} colId
     * @override
     */
    clearFilter(colId) {
      if (this._filterDraft?.colId === colId) this.closeFilter({ restoreFocus: true });

      if (this._filters[colId]) this.setFilter(colId, null);
    }

    /**
     * Removes every column filter.
     * @override
     */
    clearAllFilters() {
      this._setFilters({}, this.localize.term('allFiltersCleared'));
    }

    /** Clears the quick search and every column filter. */
    clearSearchAndFilters() {
      this.setSearch('');
      this._setFilters({}, this.localize.term('searchAndFiltersCleared'));
    }

    /**
     * For the grid's templates: the filter items added to a column's menu.
     * @param {Column} column
     * @returns {import('./host.js').MenuItem[]}
     * @override
     */
    extraMenuItems(column) {
      if (!column.filterable) return [];

      return [{ id: 'filter', label: this.localize.term('filterMenuItem'), run: () => this.openFilter(column.id) }, { separator: true }];
    }

    /**
     * A filter as a sentence in the grid's language ("Status is Paid or Draft").
     * @param {Filter} filter
     * @param {Column} column
     * @returns {string}
     * @override
     */
    describeFilter(filter, column) {
      const t = this.localize;

      return describeFilter(filter, column, this.resolvedLocale, {
        or: t.term('filterOr'),
        between: (header, from, to) => t.term('filterBetween', header, from, to),
        symbol: (id, op) => t.termOr(`opSymbol.${id}`, /** @type {string} */ (op.symbol)),
        label: (id, op) => t.termOr(`op.${id}`, op.label),
      });
    }

    /**
     * Opens a column's filter popover.
     * @param {string} colId
     */
    openFilter(colId) {
      const col = this.layout.keys.indexOf(colId);
      const anchor = this.renderRoot.querySelector(`[data-pos="0:${col}"]`) ?? this;
      const rect = anchor.getBoundingClientRect();
      this._active = { key: 'h', col, pos: 0 };
      const draft = filterDraft(/** @type {Column} */ (this.columnById(colId)), this._filters[colId], this.resolvedLocale);
      this._filterDraft = { ...draft, ...placePopup(rect, 0, popupEdge(this)) };
      this.updateComplete.then(() => {
        const popover = /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="filter-popover"]'));

        if (!popover || !this._filterDraft) return;

        this._filterDraft = { ...this._filterDraft, ...showPlaced(popover, rect, popupEdge(this)) };
        /** @type {HTMLElement} */ (popover.querySelector('input, select'))?.focus();
      });
    }

    /**
     * Changes the filter being edited in the filter popover, before it is applied.
     * @param {import('./host.js').FilterDraftPatch} patch
     * @override
     */
    updateFilterDraft(patch) {
      this._filterDraft = /** @type {FilterDraft} */ ({ ...this._filterDraft, ...patch });
    }

    /**
     * Applies the filter being edited in the filter popover.
     * @override
     */
    applyFilterDraft() {
      // Only called from the open filter dialog.
      const draft = /** @type {FilterDraft} */ (this._filterDraft);
      const column = /** @type {Column} */ (this.columnById(draft.colId));
      const result = draftToFilter(column, draft, this.resolvedLocale);

      if (result.error) {
        // Parse errors carry a translation code; show them in the grid's language.
        const error = result.code ? this.localize.term(result.code, ...(result.args ?? [])) : result.error;
        this._filterDraft = { ...draft, error, errorField: result.field };
        this.updateComplete.then(() =>
          /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="filter-popover"] [aria-invalid="true"]'))?.focus(),
        );

        return;
      }

      this.closeFilter({ restoreFocus: true });
      // No error: the result carries the filter.
      const { filter } = /** @type {{ filter: Filter | null }} */ (result);
      this.setFilter(column.id, filter);
    }

    /**
     * Closes the filter popover; `restoreFocus` moves focus back to its trigger.
     * @param {{ restoreFocus?: boolean }} [options]
     * @override
     */
    closeFilter({ restoreFocus = false } = {}) {
      if (!this._filterDraft) return;
      const popover = this.renderRoot.querySelector('[part~="filter-popover"]');
      this._filterDraft = null;

      if (popover?.matches(':popover-open')) /** @type {HTMLElement} */ (popover).hidePopover();

      if (restoreFocus) this.focusActive();
    }

    // ---- column panel ---------------------------------------------------------------------------

    /**
     * For the grid's templates: renders the toolbar's buttons.
     * @returns {import('lit').TemplateResult}
     * @override
     */
    renderToolbarActions() {
      return html`<button
        part="toolbar-button"
        type="button"
        aria-haspopup="dialog"
        aria-expanded=${String(Boolean(this._panel))}
        @click=${(/** @type {MouseEvent & { currentTarget: HTMLElement }} */ e) =>
          this._panel ? this.closePanel() : this.openPanel(e.currentTarget)}
      >
        ${this.localize.term('columnsPanel')}
      </button>`;
    }

    /**
     * Opens the columns panel, anchored to a trigger.
     * @param {HTMLElement} trigger
     */
    openPanel(trigger) {
      const rect = trigger.getBoundingClientRect();
      /** @type {HTMLElement | undefined} */
      this._panelTrigger = trigger;
      this._panel = placePopup(rect, 0, popupEdge(this, 'end'));
      this.updateComplete.then(() => {
        const panel = /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="column-panel"]'));

        if (!panel || !this._panel) return;

        this._panel = showPlaced(panel, rect, popupEdge(this, 'end'));
        panel.querySelector('input')?.focus();
      });
    }

    /**
     * Closes the columns panel; `restoreFocus` moves focus back to its trigger.
     * @param {{ restoreFocus?: boolean }} [options]
     * @override
     */
    closePanel({ restoreFocus = false } = {}) {
      if (!this._panel) return;
      const panel = this.renderRoot.querySelector('[part~="column-panel"]');
      this._panel = null;

      if (panel?.matches(':popover-open')) /** @type {HTMLElement} */ (panel).hidePopover();

      if (restoreFocus) this.updateComplete.then(() => this._panelTrigger?.focus());
    }

    /**
     * Moves a column up or down by `delta` places, from the columns panel.
     * @param {string} colId
     * @param {number} delta
     * @override
     */
    moveInPanel(colId, delta) {
      const index = this._colState.order.indexOf(colId);
      const target = Math.max(0, Math.min(this._colState.order.length - 1, index + delta));
      this._updateColumns(
        moveColumn(this._colState, colId, target),
        this.localize.term('columnMovedDirection', /** @type {Column} */ (this.columnById(colId)).header, delta < 0),
      );

      // Keep focus on the same button as the row moves (or its partner when it hits an end).
      // Column ids are app data, so they are escaped before going into a selector.
      /** @param {'up' | 'down'} direction */
      const moveButton = (direction) =>
        /** @type {HTMLButtonElement | null} */ (this.renderRoot.querySelector(`[data-move="${CSS.escape(`${colId}:${direction}`)}"]`));

      this.updateComplete.then(() => {
        const button = moveButton(delta < 0 ? 'up' : 'down');
        (button?.disabled ? moveButton(delta < 0 ? 'down' : 'up') : button)?.focus();
      });
    }

    /**
     * Shows every hidden column.
     * @override
     */
    showAllColumns() {
      const hidden = Object.fromEntries(Object.keys(this._colState.hidden).map((id) => [id, false]));
      this._updateColumns({ ...this._colState, hidden }, this.localize.term('allColumnsShown'));
    }

    /**
     * Restores the columns' order, widths, pins and visibility to their definitions.
     * @override
     */
    resetColumns() {
      this._updateColumns(createColumnState(this._cols), this.localize.term('columnsReset'));
    }
  };
