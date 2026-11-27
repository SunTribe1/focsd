import { moveColumn, setHidden, setPinned, setWidth } from '../engine/columns.js';
import { setSort, toggleSort } from '../engine/sort.js';
import { html } from 'lit';
import { cellContent } from '../view/body.js';
import { renderHeaderContent, startHeaderPointer } from '../view/header.js';
import { placePopup, popupEdge, showPlaced } from '../view/position.js';

/**
 * @typedef {import('../events.js').SortChangeDetail} SortChangeDetail
 * @typedef {import('../events.js').ColumnChangeDetail} ColumnChangeDetail
 */

/**
 * @typedef {import('../engine/model.js').Column} Column
 * @typedef {import('../engine/model.js').ColumnState} ColumnState
 * @typedef {import('./host.js').ColumnSort} ColumnSort
 *
 * @typedef {object} GridColumnsApi
 * @property {(colId: string, options?: { multi?: boolean }) => void} sortBy
 * @property {(colId: string, direction: 'asc' | 'desc' | null) => void} setSortDirection
 * @property {(colId: string) => void} hideColumn
 * @property {(colId: string) => void} showColumn
 * @property {(colId: string, side: 'start' | 'end' | null) => void} pinColumn
 * @property {(colId: string, width: number, options?: { commit?: boolean }) => void} resizeColumn
 * @property {(colId: string) => void} autosizeColumn
 * @property {(colId: string, index: number) => void} moveColumnTo
 */

/**
 * Column behavior for focsd-data-grid: sorting, hiding, pinning, resizing, reordering and the
 * column menu. Expects the host to provide `_sort`, `_colState`, `_cols`, `layout`, `columnById`,
 * `focusActive` and the `_announce` live-region text.
 *
 * @template {new (...args: any[]) => import('lit').LitElement & import('./host.js').GridHost} T
 * @param {T} Base
 * @returns {T & (new (...args: any[]) => GridColumnsApi & import('./host.js').GridHost)}
 */
export const ColumnsMixin = (Base) =>
  class extends Base {
    /** @type {HTMLCanvasElement | null} */
    _measureCanvas = null;

    /**
     * Default cell content; EditingMixin swaps in an editor for the cell being edited.
     * @param {Column} column
     * @param {import('./host.js').GridRow} row
     * @returns {import('lit').TemplateResult}
     * @override
     */
    renderCell(column, row) {
      return html`<span part="cell-text">${cellContent(this, column, row)}</span>`;
    }

    /**
     * A column's sort direction and its position among the sort keys.
     * @param {string} colId
     * @returns {ColumnSort | null}
     * @override
     */
    sortFor(colId) {
      const key = this._sort.find((s) => s.colId === colId);

      return key ? { ...key, index: this._sort.indexOf(key) } : null;
    }

    /**
     * For the grid's templates: renders a header's label and sort indicator.
     * @param {Column} column
     * @param {ColumnSort | null} sort
     * @returns {import('lit').TemplateResult}
     * @override
     */
    renderHeaderContent(column, sort) {
      return renderHeaderContent(this, column, sort);
    }

    // ---- columns: sort, pin, hide, resize, reorder --------------------------------------------

    /** @param {string} message */
    _emitSort(message) {
      this._announce = message;
      /** @type {CustomEvent<SortChangeDetail>} */
      this.dispatchEvent(new CustomEvent('focsd-sort-change', { bubbles: true, detail: { sortModel: this._sort } }));
    }

    _sortMessage() {
      if (!this._sort.length) return this.localize.term('sortCleared');

      return this.localize.term(
        'sortedBy',
        this._sort.map((s) => [/** @type {Column} */ (this.columnById(s.colId)).header, s.direction === 'asc']),
      );
    }

    /**
     * Header activation: ascending → descending → off. `multi` keeps the other sort keys.
     * @param {string} colId
     * @param {{ multi?: boolean }} [options]
     * @override
     */
    sortBy(colId, { multi = false } = {}) {
      if (!this.columnById(colId)?.sortable) return;
      // Read through the host type: this first assignment would otherwise count as the declaration.
      this._sort = toggleSort(/** @type {import('./host.js').GridHost} */ (this)._sort, colId, { multi });
      this._page = 1;
      this._emitSort(this._sortMessage());
    }

    /**
     * Sorts by a column in a direction, or removes it from the sort.
     * @param {string} colId
     * @param {'asc' | 'desc' | null} direction
     * @override
     */
    setSortDirection(colId, direction) {
      this._sort = setSort(this._sort, colId, direction, { multi: this._sort.length > 1 && direction !== null });
      this._page = 1;
      this._emitSort(this._sortMessage());
    }

    /**
     * For the grid's templates: handles a click on a column header (sorts it).
     * @param {MouseEvent} event
     * @param {Column} column
     * @override
     */
    onHeaderClick(event, column) {
      if (/** @type {import('./host.js').GridHost} */ (this).suppressNextClick) {
        this.suppressNextClick = false;

        return;
      }

      if (event.composedPath().some((n) => /** @type {Element} */ (n).matches?.('button, input, [part~="resize-handle"]'))) return;
      this.sortBy(column.id, { multi: event.shiftKey });
    }

    /**
     * For the grid's templates: starts dragging a column header to reorder it.
     * @param {PointerEvent} event
     * @param {Column} column
     * @override
     */
    onHeaderPointerDown(event, column) {
      startHeaderPointer(this, column, event);
    }

    /**
     * @param {ColumnState} next
     * @param {string} message
     * @override
     */
    _updateColumns(next, message) {
      this._colState = next;
      this._announce = message;
      /** @type {CustomEvent<ColumnChangeDetail>} */
      this.dispatchEvent(new CustomEvent('focsd-column-change', { bubbles: true, detail: { columnState: next } }));
    }

    /**
     * Hides a column.
     * @param {string} colId
     * @override
     */
    hideColumn(colId) {
      const column = /** @type {Column} */ (this.columnById(colId));
      this._updateColumns(setHidden(this._colState, colId, true), this.localize.term('columnHidden', column.header));
    }

    /**
     * Shows a hidden column.
     * @param {string} colId
     * @override
     */
    showColumn(colId) {
      const column = /** @type {Column} */ (this.columnById(colId));
      this._updateColumns(setHidden(this._colState, colId, false), this.localize.term('columnShown', column.header));
    }

    /**
     * Pins a column to the start or end edge, or unpins it.
     * @param {string} colId
     * @param {'start' | 'end' | null} side
     * @override
     */
    pinColumn(colId, side) {
      const column = /** @type {Column} */ (this.columnById(colId));
      const message = side ? this.localize.term('columnPinned', column.header, side) : this.localize.term('columnUnpinned', column.header);
      this._updateColumns(setPinned(this._colState, colId, side), message);
    }

    /**
     * Sets a column's width in pixels; `commit: false` previews it without firing a state change.
     * @param {string} colId
     * @param {number} width
     * @param {{ commit?: boolean }} [options]
     * @override
     */
    resizeColumn(colId, width, { commit = true } = {}) {
      const next = setWidth(this._colState, this._cols, colId, width);

      if (!commit) {
        this._colState = next;

        return;
      }

      this._updateColumns(
        next,
        this.localize.term('columnWidth', /** @type {Column} */ (this.columnById(colId)).header, next.widths[colId]),
      );
    }

    /**
     * Fit a column to its header and the rendered cells.
     * @param {string} colId
     * @override
     */
    autosizeColumn(colId) {
      const col = this.layout.keys.indexOf(colId);

      if (col < 0) return;

      // Measure text, not boxes: the header label stretches to fill its cell.
      /** @param {Element} node */
      const measure = (node) => {
        // A 2d context is always available on a fresh canvas.
        const context = /** @type {CanvasRenderingContext2D} */ (
          (this._measureCanvas ??= document.createElement('canvas')).getContext('2d')
        );

        const style = getComputedStyle(node);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

        return context.measureText(/** @type {string} */ (node.textContent).trim()).width;
      };

      const header = this.renderRoot.querySelector(`[data-pos="0:${col}"] [part~="header-label"]`);
      let widest = header ? measure(header) + 80 : 0;

      for (const node of this.renderRoot.querySelectorAll(`[data-pos$=":${col}"] [part~="cell-text"]`))
        widest = Math.max(widest, measure(node) + 32);
      this.resizeColumn(colId, Math.ceil(widest), { commit: true });
    }

    /**
     * Moves a column to an index among the columns.
     * @param {string} colId
     * @param {number} index
     * @override
     */
    moveColumnTo(colId, index) {
      const column = /** @type {Column} */ (this.columnById(colId));
      this._updateColumns(moveColumn(this._colState, colId, index), this.localize.term('columnMoved', column.header));
    }

    /**
     * For the grid's templates: shows where a dragged column would land.
     * @param {{ index: number, x: number } | null} target
     * @override
     */
    showDropIndicator(target) {
      this._drop = target ? target.x : null;
    }

    // ---- column menu ----------------------------------------------------------------------------

    /**
     * Opens a column's menu, anchored to a trigger.
     * @param {string} colId
     * @param {Element | null} [trigger]
     * @override
     */
    openMenu(colId, trigger) {
      const rect = (trigger ?? this).getBoundingClientRect();
      const col = this.layout.keys.indexOf(colId);
      this._active = { key: 'h', col, pos: 0 };
      this._menu = { colId, ...placePopup(rect, 0, popupEdge(this)) };
      this.updateComplete.then(() => {
        const menu = /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="column-menu"]'));

        if (!menu || !this._menu) return;

        this._menu = { ...this._menu, ...showPlaced(menu, rect, popupEdge(this)) };
        /** @type {HTMLElement} */ (menu.querySelector('[role="menuitem"]:not([aria-disabled="true"])'))?.focus();
      });
    }

    /**
     * Closes the column menu; `restoreFocus` moves focus back to its header.
     * @param {{ restoreFocus?: boolean }} [options]
     * @override
     */
    closeMenu({ restoreFocus = false } = {}) {
      if (!this._menu) return;
      const menu = this.renderRoot.querySelector('[part~="column-menu"]');
      this._menu = null;

      if (menu?.matches(':popover-open')) /** @type {HTMLElement} */ (menu).hidePopover();

      if (restoreFocus) this.focusActive();
    }
  };
