import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { FocsdElement } from '@focsd-dev/primitives';
import { cssomStyle } from '@focsd-dev/primitives/internal';
import { announce } from '@focsd-dev/primitives/utils';
import '@focsd-dev/components/focsd-pagination.js';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { createColumnState, displayColumns, normalizeColumns } from './engine/columns.js';
import { ColumnsMixin } from './mixins/columns.js';
import { FiltersMixin } from './mixins/filters.js';
import { GroupingMixin } from './mixins/grouping.js';
import { EditingMixin } from './mixins/editing.js';
import { ApiMixin } from './mixins/api.js';
import { renderFilterPopover } from './view/filter-popover.js';
import { renderChips, renderColumnPanel, renderToolbar } from './view/toolbar.js';
import { createPipeline } from './engine/pipeline.js';
import { computeLayout, cellText, renderDataRow, renderGroupRow, renderHeaderRow } from './view/body.js';
import { navigate, rangeIds } from './view/keyboard.js';
import { renderColumnMenu } from './view/column-menu.js';
import { gridStyles } from './view/styles.js';

/**
 * @typedef {import('./events.js').SortChangeDetail} SortChangeDetail
 * @typedef {import('./events.js').FilterChangeDetail} FilterChangeDetail
 * @typedef {import('./events.js').SearchChangeDetail} SearchChangeDetail
 * @typedef {import('./events.js').ColumnChangeDetail} ColumnChangeDetail
 * @typedef {import('./events.js').GroupChangeDetail} GroupChangeDetail
 * @typedef {import('./events.js').SelectionChangeDetail} SelectionChangeDetail
 * @typedef {import('./events.js').PageChangeDetail} PageChangeDetail
 * @typedef {import('./events.js').CellEditDetail} CellEditDetail
 * @typedef {import('./events.js').StateChangeDetail} StateChangeDetail
 * @typedef {import('./events.js').RowActivateDetail} RowActivateDetail
 * @typedef {import('./engine/model.js').Column} Column
 * @typedef {import('./engine/model.js').ColumnState} ColumnState
 * @typedef {import('./mixins/host.js').GridRow} GridRow
 * @typedef {import('./mixins/host.js').DisplayRow} DisplayRow
 */

const WINDOW_THRESHOLD = 200;
const OVERSCAN = 8;

/** Row height (px) until the header row is measured; matches `--_row-height`. */
const ROW_HEIGHT = 44;

/** Grid height (px) assumed for Page Up/Down before the grid has a size. */
const FALLBACK_PAGE_HEIGHT = 440;

/** Viewport height (px) assumed for windowing before the grid has a size. */
const FALLBACK_WINDOW_HEIGHT = 512;
let instances = 0;

/** The mixins' host contract (see mixins/host.ts): FocsdDataGrid and the mixins together provide it. */
const GridBase = /** @type {new (...args: any[]) => FocsdElement & import('./mixins/host.js').GridHost} */ (
  /** @type {unknown} */ (FocsdElement)
);

/**
 * Data grid with typed columns, sorting, filtering, grouping, pinning, selection, editing.
 * Configure with the `columns` and `rows` properties.
 *
 * @fires {CustomEvent<SortChangeDetail>} focsd-sort-change - The sort changed. `detail.sortModel` is `[{ colId, direction }]`.
 * @fires {CustomEvent<FilterChangeDetail>} focsd-filter-change - Column filters changed. `detail.filterModel` maps column ids to `{ op, value, value2 }`.
 * @fires {CustomEvent<SearchChangeDetail>} focsd-search-change - Quick search text changed. `detail.quickSearch` is the text.
 * @fires {CustomEvent<ColumnChangeDetail>} focsd-column-change - Column order, visibility, width or pinning changed. `detail.columnState` has them all.
 * @fires {CustomEvent<GroupChangeDetail>} focsd-group-change - Grouping changed. `detail.groupBy` lists column ids, outermost first.
 * @fires {CustomEvent<SelectionChangeDetail>} focsd-selection-change - Selected rows changed. `detail.ids` lists their ids.
 * @fires {CustomEvent<PageChangeDetail>} focsd-page-change - The page changed. `detail.page` is the new page.
 * @fires {CustomEvent<CellEditDetail>} focsd-cell-edit - A cell edit is about to be applied (cancelable). `detail` has `rowId`, `colId`, `oldValue`, `newValue` and `row`.
 * @fires {CustomEvent<StateChangeDetail>} focsd-state-change - The view changed (debounced). `detail.state` is the same object `getState()` returns.
 * @fires {CustomEvent<RowActivateDetail>} focsd-row-activate - Enter on a read-only cell. `detail.id` and `detail.row` identify the row.
 * @csspart grid - The scrolling grid element.
 * @csspart row - A data row.
 * @csspart cell - A data cell.
 * @csspart pagination-page - Pagination parts, re-exported with a `pagination-` prefix (pagination-nav, pagination-list, pagination-page, pagination-previous, pagination-next, pagination-gap).
 * @csspart header-row - The header row.
 * @csspart header-cell - A column header.
 * @csspart footer - The footer with paging and counts.
 * @cssprop --focsd-data-grid-max-block-size - The tallest the grid grows before it scrolls (default none; 32rem when only the rows in view render).
 * @cssprop --focsd-data-grid-indent - Indent per level of a grouped row (default `--focsd-space-4`).
 */
export class FocsdDataGrid extends EditingMixin(ApiMixin(GroupingMixin(FiltersMixin(ColumnsMixin(GridBase))))) {
  /** @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, hostStyles, gridStyles];

  /** @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    columns: { attribute: false },
    rows: { attribute: false },
    rowId: { attribute: false },
    pageSize: { type: Number, attribute: 'page-size' },
    selection: { reflect: true },
    density: { reflect: true },
    locale: {},
    _colState: { state: true },
    _sort: { state: true },
    _filters: { state: true },
    _search: { state: true },
    _groupBy: { state: true },
    _expanded: { state: true },
    _page: { state: true },
    _selected: { state: true },
    _active: { state: true },
    _scrollTop: { state: true },
    _menu: { state: true },
    _drop: { state: true },
  };

  #pipeline = createPipeline();

  /** @type {WeakMap<GridRow, number>} */
  #indexOf = new WeakMap();

  /** @type {number | null} */
  #anchor = null;

  #rowHeight = ROW_HEIGHT;

  #hadFocus = false;

  /** @type {number | null} */
  #pendingScroll = null;

  constructor() {
    super();
    /** The accessible name of the grid. */
    this.label = '';
    /** @type {import('./engine/model.js').ColumnDef[]} The column definitions. */
    this.columns = [];
    /** @type {GridRow[]} The rows, as objects keyed by the column fields. */
    this.rows = [];
    /** @type {string | ((row: GridRow) => unknown)} Row property holding the id, or a function returning it. */
    this.rowId = 'id';
    /** The rows per page; 0 shows every row. */
    this.pageSize = 25;
    /** @type {'none' | 'single' | 'multiple'} Whether rows can be selected, and how many. */
    this.selection = 'none';
    /**
     * @type {import('./engine/model.js').GridDensity}
     * The row height: `compact`, or `comfortable` (the tokens' `default` density is the same size).
     */
    this.density = 'comfortable';
    /** A BCP 47 locale tag for numbers, dates and sorting; defaults to the page's language. */
    this.locale = '';
    // Set by ensureColumns() before first use.
    this._colState = /** @type {ColumnState} */ (/** @type {unknown} */ (null));
    /** @type {import('./engine/model.js').SortKey[]} */
    this._sort = [];
    /** @type {Record<string, import('./engine/model.js').Filter>} */
    this._filters = {};
    this._search = '';
    /** @type {string[]} */
    this._groupBy = [];
    /** @type {Set<string> | 'all'} */
    this._expanded = new Set();
    this._page = 1;
    /** @type {Set<unknown>} */
    this._selected = new Set();
    this._active = { key: 'h', col: 0, pos: 0 };
    this._scrollTop = 0;
    /** @type {import('./mixins/host.js').GridHost['_menu']} */
    this._menu = null;
    /** @type {number | null} */
    this._drop = null;
    /** For the grid's templates: the prefix of the IDs in the shadow root. */
    this.idPrefix = `focsd-grid-${(instances += 1)}`;
    /** For the grid's mixins: ignores the click that ends a drag. */
    this.suppressNextClick = false;
  }

  #announceText = '';

  /**
   * The last message announced. Setting it announces the text through the shared document
   * announcer, which repeats a repeated message ("Saved" twice) and is heard inside a modal dialog.
   * @override
   */
  get _announce() {
    return this.#announceText;
  }

  /** @override */
  set _announce(message) {
    this.#announceText = message;

    if (message) announce(message, { from: this });
  }

  // ---- data -------------------------------------------------------------------------------

  /** Row id from `rowId` (field name or function), else the row's index in `rows`. */
  /**
   * @param {GridRow} row
   * @returns {unknown}
   * @override
   */
  getRowId = (row) => {
    if (typeof this.rowId === 'function') return this.rowId(row);
    const value = row?.[this.rowId || 'id'];

    return value ?? this.#indexOf.get(row);
  };

  /**
   * DOM id for a header label (column ids may contain spaces, which ids cannot).
   * @param {Column} column
   * @override
   */
  headerId(column) {
    return `${this.idPrefix}-h-${this._cols.indexOf(column)}`;
  }

  /**
   * The column with an ID, from the current column state.
   * @param {string} id
   * @returns {Column | undefined}
   * @override
   */
  columnById(id) {
    // Methods may run right after `columns` is set, before the first render normalized them.
    this.ensureColumns();

    return /** @type {Map<string, Column>} */ (this._byId).get(id);
  }

  /**
   * Whether the grid is a treegrid (it has grouped rows).
   * @override
   */
  get treegrid() {
    return this._groupBy.length > 0;
  }

  /** Whether only the rows in view are rendered (no paging and many rows). */
  get windowed() {
    return !this.pageSize && this.view.displayRows.length > WINDOW_THRESHOLD;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // Only rescue focus that was in the grid itself (not in the toolbar, menus or panels).
    this.#hadFocus = Boolean(/** @type {ShadowRoot | undefined} */ (this.renderRoot)?.activeElement?.closest?.('[part~="grid"]'));
    this.ensureColumns();

    if (changed.has('rows')) this.rows.forEach((row, i) => this.#indexOf.set(row, i));
    this.view = this.#pipeline({
      rows: this.rows ?? [],
      columns: this._cols,
      columnState: this._colState,
      sortModel: this._sort,
      filterModel: this._filters,
      quickSearch: this._search,
      groupBy: this.external ? [] : this._groupBy,
      expanded: this._expanded,
      page: this._page,
      pageSize: this.pageSize,
      locale: this.resolvedLocale,
      external: this.external,
    });

    if (!this.external) this._page = this.view.page;

    if (changed.has('loading') && this.loading) this._announce = this.localize.term('gridLoading');
    this.announceFilterResult();
    const display = displayColumns(this._cols, this._colState);
    this.layout = computeLayout(display, this._colState.pinned, this._colState.widths, this.selection === 'multiple');
    this.navRows = this.pageSize ? this.view.pageRows : this.view.displayRows;
    // An edit draft whose row is gone (rows replaced, filtered, paged away) is dropped.
    const editing = this._editing;
    // Assigned through the host type so this class does not redeclare EditingMixin's property.
    const host = /** @type {import('./mixins/host.js').GridHost} */ (this);

    if (editing && !this.navRows.some((r) => this.keyOf(r) === editing.key)) host._editing = null;
    this.#resolveActive();
  }

  /**
   * Locale for numbers and dates: `locale`, else the nearest `lang`, else the browser's (undefined).
   * @returns {string | undefined}
   * @override
   */
  get resolvedLocale() {
    return this.locale || this.localize.locale();
  }

  /**
   * Normalize `columns` (also used by setState before the first render).
   * @override
   */
  ensureColumns() {
    // Boolean columns without labels show Yes/No in the grid's language (cells, groups, search, CSV).
    /** @type {[string, string]} */
    const yesNo = [this.localize.term('no'), this.localize.term('yes')];
    const labelsKey = yesNo.join('|');

    if (this._colsFor === this.columns && this._labelsFor === labelsKey) return;
    /** @type {import('./engine/model.js').ColumnDef[] | undefined} */
    this._colsFor = this.columns;
    /** @type {string | undefined} */
    this._labelsFor = labelsKey;
    this._cols = normalizeColumns(this.columns ?? []).map((c) => (c.type === 'boolean' && !c.labels ? { ...c, labels: yesNo } : c));
    const byId = new Map(this._cols.map((c) => [c.id, c]));
    this._byId = byId;
    // Grouping by a column that the new `columns` dropped would leave an empty treegrid.
    const groupBy = this._groupBy.filter((id) => byId.has(id));

    if (groupBy.length !== this._groupBy.length) this._groupBy = groupBy;
    const fresh = createColumnState(this._cols);
    this._colState = this._colState ? { ...fresh, ...this.#keepKnown(this._colState, fresh) } : fresh;
  }

  /**
   * Keep layout entries for columns that still exist (columns property replaced).
   * @param {ColumnState} previous
   * @param {ColumnState} fresh
   * @returns {ColumnState}
   */
  #keepKnown(previous, fresh) {
    const ids = new Set(fresh.order);
    /**
     * @template T
     * @param {Record<string, T>} obj
     */
    const pick = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => ids.has(k)));
    const order = [...previous.order.filter((id) => ids.has(id)), ...fresh.order.filter((id) => !previous.order.includes(id))];

    return {
      order,
      hidden: { ...fresh.hidden, ...pick(previous.hidden) },
      widths: { ...fresh.widths, ...pick(previous.widths) },
      pinned: { ...fresh.pinned, ...pick(previous.pinned) },
    };
  }

  /**
   * For the grid's templates: the key of a displayed row.
   * @param {DisplayRow} displayRow
   * @override
   */
  keyOf(displayRow) {
    return displayRow.type === 'group' ? `g:${displayRow.key}` : `r:${this.getRowId(displayRow.row)}`;
  }

  /**
   * The active-cell key at a position: 'h' for the header row (position 0, or a row that is gone).
   * @param {number} pos
   */
  #keyAt(pos) {
    const row = pos > 0 ? this.navRows[pos - 1] : undefined;

    return row ? this.keyOf(row) : 'h';
  }

  /** Map the active key to a position; if its row vanished, stay at the same position (clamped). */
  #resolveActive() {
    const { key, pos } = this._active;
    const maxPos = this.navRows.length;
    let next = 0;

    if (key !== 'h') {
      const found = this.navRows.findIndex((r) => this.keyOf(r) === key);
      next = found >= 0 ? found + 1 : Math.min(Math.max(1, pos), maxPos);
    }

    const col = Math.min(this._active.col, this.layout.keys.length - 1);
    const nextKey = this.#keyAt(next);

    if (next !== pos || col !== this._active.col || nextKey !== key) this._active = { key: nextKey, col, pos: next };
  }

  /**
   * For the grid's templates: the `aria-rowindex` of a displayed row.
   * @param {DisplayRow} displayRow
   * @override
   */
  rowIndexFor(displayRow) {
    const offset = this.external && this.pageSize ? (this._page - 1) * this.pageSize : 0;

    return offset + displayRow.index + 2;
  }

  /** Totals and paging, from the pipeline or (server mode) from rowCount. */
  get counts() {
    const { matched, total } = this.view;

    if (!this.external) return { ...this.view, filteredFrom: matched === total ? null : total };
    const all = this.rowCount || this.rows.length;
    const pageSize = this.pageSize;
    const pageCount = pageSize ? Math.max(1, Math.ceil(all / pageSize)) : 1;

    return { matched: all, total: all, page: this._page, pageCount, pageSize, filteredFrom: null };
  }

  /**
   * For the grid's templates: the name of a row, used in selection labels.
   * @param {GridRow} row
   * @override
   */
  rowName(row) {
    const first = this.layout.keys.find((k) => k !== 'select');
    const column = first && this.columnById(first);

    return column ? cellText(this, column, row) : String(this.getRowId(row));
  }

  // ---- selection ----------------------------------------------------------------------------

  /** Ids of the selected rows. */
  get selectedIds() {
    return [...this._selected];
  }

  /**
   * Whether the row with an ID is selected.
   * @param {unknown} id
   * @override
   */
  isSelected(id) {
    return this._selected.has(id);
  }

  /**
   * Whether none, some or all of the filtered rows are selected.
   * @returns {'none' | 'some' | 'all'}
   * @override
   */
  selectAllState() {
    const ids = this.view.sortedRows.map(this.getRowId);
    const count = ids.filter((id) => this._selected.has(id)).length;

    return count === 0 ? 'none' : count === ids.length ? 'all' : 'some';
  }

  /**
   * @param {Set<unknown>} next
   * @param {string} [message]
   */
  #setSelection(next, message) {
    this._selected = next;
    this._announce = message ?? this.localize.term('rowsSelected', next.size);
    /** @type {SelectionChangeDetail} */
    const detail = { ids: [...next] };

    this.dispatchEvent(new CustomEvent('focsd-selection-change', { bubbles: true, detail }));
  }

  /**
   * Selects or deselects every row that passes the filters.
   * @param {boolean} checked
   * @override
   */
  selectAll(checked) {
    const ids = this.view.sortedRows.map(this.getRowId);
    const drop = new Set(ids);
    this.#setSelection(checked ? new Set([...this._selected, ...ids]) : new Set([...this._selected].filter((id) => !drop.has(id))));
  }

  /**
   * Toggle one row, or with Shift select the range from the last anchor.
   * @param {DisplayRow | undefined} displayRow
   * @param {number} pos
   * @param {{ range?: boolean }} [options]
   */
  toggleRow(displayRow, pos, { range = false } = {}) {
    if (this.selection === 'none' || displayRow?.type !== 'row') return;
    const id = this.getRowId(displayRow.row);

    if (this.selection === 'single') {
      this.#setSelection(this._selected.has(id) ? new Set() : new Set([id]));

      return;
    }

    if (range && this.#anchor !== null) {
      const ids = rangeIds(this.navRows, this.#anchor - 1, pos - 1, this.getRowId);
      this.#setSelection(new Set([...this._selected, ...ids]));
    } else {
      const next = new Set(this._selected);

      if (next.has(id)) next.delete(id);
      else next.add(id);
      this.#setSelection(next);
    }

    this.#anchor = pos;
  }

  /**
   * For the grid's templates: handles a click on a row's selection checkbox (Shift selects a range).
   * @param {MouseEvent} event
   * @param {DisplayRow} displayRow
   * @param {number} pos
   * @override
   */
  onSelectClick(event, displayRow, pos) {
    this.activate(pos, 0, { focus: true });
    this.toggleRow(displayRow, pos, { range: event.shiftKey });
  }

  // ---- focus and keyboard -------------------------------------------------------------------

  /** Rendered position that holds the tab stop: the active one, or the nearest rendered row. */
  #stopPos() {
    const { pos } = this._active;

    if (pos === 0 || !this.windowed) return pos;
    const [first, last] = this.#windowRange();

    return pos >= first + 1 && pos <= last ? pos : first + 1;
  }

  /**
   * For the grid's templates: the `tabindex` of a cell (0 for the active cell, -1 otherwise).
   * @param {number} pos
   * @param {number} col
   * @override
   */
  tabindexFor(pos, col) {
    return pos === this.#stopPos() && col === this._active.col ? '0' : '-1';
  }

  /**
   * Move the active cell (and optionally focus it).
   * @param {number} pos
   * @param {number} col
   * @param {{ focus?: boolean }} [options]
   * @override
   */
  activate(pos, col, { focus = true } = {}) {
    const key = this.#keyAt(pos);
    this._active = { key, col, pos };

    if (this.windowed) this.#scrollIntoWindow(pos);

    if (focus) this.focusActive();
  }

  /**
   * Moves focus to the active cell.
   * @override
   */
  focusActive() {
    this.updateComplete.then(() => {
      const { pos, col } = this._active;
      const cell = this.renderRoot.querySelector(`[data-pos="${pos}:${col}"]`);
      const target = cell?.querySelector('input[type="checkbox"]') ?? cell;
      /** @type {HTMLElement} */ (target)?.focus({ preventScroll: true });
      // scrollIntoView honours scroll-padding (pinned columns, sticky header); focus() scrolling does not.
      cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
  }

  /** @param {FocusEvent} event */
  #onFocusIn = (event) => {
    const cell = /** @type {HTMLElement | undefined} */ (event.composedPath().find((n) => n instanceof HTMLElement && n.dataset?.pos));

    if (!cell) return;
    const [pos = 0, col = 0] = /** @type {string} */ (cell.dataset.pos).split(':').map(Number);

    if (pos !== this._active.pos || col !== this._active.col) this._active = { key: this.#keyAt(pos), col, pos };
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (/** @type {Element} */ (event.target).matches?.('input:not([type="checkbox"]), select, textarea')) return;
    const { pos, col } = this._active;
    const displayRow = this.navRows[pos - 1];

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && this.selection === 'multiple') {
      event.preventDefault();
      this.selectAll(true);

      return;
    }

    if (pos > 0 && this.handleGridKey(event, displayRow, pos, col)) {
      event.preventDefault();

      return;
    }

    if (event.key === ' ' && pos > 0) {
      event.preventDefault();
      this.toggleRow(displayRow, pos, { range: event.shiftKey });

      return;
    }

    if (pos === 0 && this.#onHeaderKey(event, col)) return;

    if (event.key === 'Enter' && displayRow?.type === 'row') {
      /** @type {RowActivateDetail} */
      const detail = { id: this.getRowId(displayRow.row), row: displayRow.row };

      this.dispatchEvent(new CustomEvent('focsd-row-activate', { bubbles: true, detail }));

      return;
    }

    this.#navigateKey(event, pos, col);
  };

  /**
   * Header-cell shortcuts: Enter sorts, Alt+ArrowDown / ContextMenu / Shift+F10 open the column menu.
   * @param {KeyboardEvent} event
   * @param {number} col
   * @returns {boolean} Whether the key was handled.
   */
  #onHeaderKey(event, col) {
    const key = this.layout.keys[col];

    if (key === undefined || key === 'select') return false;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.sortBy(key, { multi: event.shiftKey });

      return true;
    }

    if ((event.altKey && event.key === 'ArrowDown') || event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      const cell = this.renderRoot.querySelector(`[data-pos="0:${col}"] [part~="menu-button"]`);
      this.openMenu(key, cell);

      return true;
    }

    return false;
  }

  /**
   * Arrow / Home / End / Page key movement of the active cell (Page keys flip pages when paginated).
   * @param {KeyboardEvent} event
   * @param {number} pos
   * @param {number} col
   */
  #navigateKey(event, pos, col) {
    const rtl = getComputedStyle(this).direction === 'rtl';
    const pageRows = Math.max(1, Math.floor((this.#grid?.clientHeight ?? FALLBACK_PAGE_HEIGHT) / this.#rowHeight) - 1);
    const target = navigate(event, { row: pos, col }, { rows: this.navRows.length, cols: this.layout.keys.length, pageRows, rtl });

    if (!target) return;
    event.preventDefault();

    if (target.page && this.pageSize) {
      const next = this._page + target.page;

      if (next >= 1 && next <= this.view.pageCount) this.goToPage(next, { keepPos: pos });

      return;
    }

    this.activate(target.row, target.col);
  }

  /**
   * Shows a page, from 1.
   * @param {number} page
   * @param {{ keepPos?: number }} [options] Keep the active row position on the new page.
   * @override
   */
  goToPage(page, { keepPos } = {}) {
    this._page = page;
    /** @type {PageChangeDetail} */
    const detail = { page };

    this.dispatchEvent(new CustomEvent('focsd-page-change', { bubbles: true, detail }));

    if (keepPos !== undefined) {
      this.updateComplete.then(() => this.activate(Math.min(keepPos, this.navRows.length), this._active.col));
    }
  }

  // ---- windowing ----------------------------------------------------------------------------

  get #grid() {
    return this.renderRoot?.querySelector('[part~="grid"]');
  }

  /** @returns {[first: number, last: number]} */
  #windowRange() {
    if (!this.windowed) return [0, this.navRows.length];
    const viewport = this.#grid?.clientHeight || FALLBACK_WINDOW_HEIGHT;
    const first = Math.max(0, Math.floor(this._scrollTop / this.#rowHeight) - 1 - OVERSCAN);
    const count = Math.ceil(viewport / this.#rowHeight) + 2 * OVERSCAN;

    return [first, Math.min(this.navRows.length, first + count)];
  }

  /**
   * Scroll so data row `pos` is inside the viewport (and therefore rendered).
   * @param {number} pos
   */
  #scrollIntoWindow(pos) {
    const grid = this.#grid;

    if (!grid || pos === 0) {
      if (pos === 0 && grid) this.#pendingScroll = grid.scrollTop;

      return;
    }

    const h = this.#rowHeight;
    const top = pos * h; // the sticky header occupies the first row height
    let scroll = grid.scrollTop;

    if (top - h < scroll) scroll = top - h;
    else if (top + h > scroll + grid.clientHeight) scroll = top + h - grid.clientHeight;
    scroll = Math.max(0, scroll);

    if (scroll !== grid.scrollTop) {
      this.#pendingScroll = scroll;
      this._scrollTop = scroll;
    }
  }

  /** @param {Event} event */
  #onScroll = (event) => {
    if (this.windowed) this._scrollTop = /** @type {HTMLElement} */ (event.currentTarget).scrollTop;
  };

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    this.trackStateChange(changed);
    const grid = this.#grid;
    const header = this.renderRoot.querySelector('[part~="header-row"]');

    if (/** @type {HTMLElement} */ (header)?.offsetHeight) this.#rowHeight = /** @type {HTMLElement} */ (header).offsetHeight;

    if (grid && this.#pendingScroll !== null) {
      grid.scrollTop = this.#pendingScroll;
      this.#pendingScroll = null;
    }

    // Keep focus in the grid when the focused row or column disappeared (filter, edit, data change).
    // Not when the user scrolled a windowed grid away from the active row: that would jump back.
    const scrolledAway = this.windowed && this._active.pos > 0 && this.#stopPos() !== this._active.pos;

    if (this.#hadFocus && !(/** @type {ShadowRoot} */ (this.renderRoot).activeElement) && !scrolledAway) this.focusActive();
  }

  // ---- rendering ----------------------------------------------------------------------------

  #renderRows() {
    const [first, last] = this.#windowRange();
    const rows = this.navRows.slice(first, last);
    const h = this.#rowHeight;
    const padding = this.windowed ? `${first * h}px ${(this.navRows.length - last) * h}px` : undefined;

    // Rows are keyed so a focused cell is never reused for a different row while scrolling.
    return html`<div role="rowgroup" part="body" style=${cssomStyle({ 'padding-block': padding })}>
      ${repeat(
        rows,
        (dr) => this.keyOf(dr),
        (dr, i) => (dr.type === 'group' ? renderGroupRow(this, dr, first + i + 1) : renderDataRow(this, dr, first + i + 1)),
      )}
    </div>`;
  }

  #renderFooter() {
    const { matched, page, pageCount, pageSize, filteredFrom } = this.counts;
    const from = matched ? (page - 1) * (pageSize || matched) + 1 : 0;
    const to = pageSize ? Math.min(matched, page * pageSize) : matched;
    const groups = this.treegrid ? this.view.displayRows.filter((r) => r.type === 'group' && r.level === 1).length : 0;

    const summary = this.treegrid
      ? this.localize.term('footerGroups', matched, groups, filteredFrom)
      : this.localize.term('footerRange', from, to, matched, filteredFrom);

    return html`<div part="footer">
      <span part="count">${summary}</span>
      ${
        pageSize && pageCount > 1
          ? html`<focsd-pagination
            exportparts="nav: pagination-nav, list: pagination-list, page: pagination-page, previous: pagination-previous, next: pagination-next, gap: pagination-gap, disabled: pagination-disabled"
            label=${this.localize.term('gridPages', this.label)}
            .page=${page}
            .total=${pageCount}
            @focsd-page-change=${(/** @type {CustomEvent<PageChangeDetail>} */ e) => {
              e.stopPropagation();
              this.goToPage(e.detail.page);
            }}
          ></focsd-pagination>`
          : nothing
      }
    </div>`;
  }

  /** @override */
  render() {
    const total = this.external ? this.counts.matched : this.view.displayRows.length;
    const filtering = this._search || Object.keys(this._filters).length;

    return html`${renderToolbar(this)} ${renderChips(this)}
      <div
        part="grid${this.windowed ? ' windowed' : ''}"
        role=${this.treegrid ? 'treegrid' : 'grid'}
        aria-label=${this.label || nothing}
        aria-rowcount=${total + 1}
        aria-colcount=${this.layout.keys.length}
        aria-multiselectable=${this.selection === 'multiple' ? 'true' : nothing}
        aria-busy=${this.loading ? 'true' : nothing}
        style=${cssomStyle({
          '--_template': this.layout.template,
          'scroll-padding-inline': `${this.layout.startWidth}px ${this.layout.endWidth}px`,
        })}
        @keydown=${this.#onKeyDown}
        @focusin=${this.#onFocusIn}
        @scroll=${this.#onScroll}
      >
        <div role="rowgroup" part="header-group">${renderHeaderRow(this)}</div>
        ${this.#renderRows()}
        ${this._drop !== null ? html`<div part="drop-indicator" style=${cssomStyle({ 'inset-inline-start': `${this._drop}px` })}></div>` : nothing}
      </div>
      ${renderColumnMenu(this)} ${renderFilterPopover(this)} ${renderColumnPanel(this)}
      <div part="empty-state">
        <p part="empty" role="status">${total === 0 ? this.localize.term('gridNoMatches') : ''}</p>
        ${
          total === 0 && filtering
            ? html`<button part="toolbar-button" type="button" @click=${() => this.clearSearchAndFilters()}>${this.localize.term('gridClearSearchAndFilters')}</button>`
            : nothing
        }
      </div>
      ${this.#renderFooter()}`;
  }
}
