/**
 * The contract the data grid's mixins and view functions rely on: members provided by FocsdDataGrid
 * itself (src/grid.js) or by another mixin. Mixins declare their base as `LitElement & GridHost`,
 * so each one type-checks on its own, and the composed grid provides every member. Types only.
 */
import type { LitElement, TemplateResult } from 'lit';
import type { Column, ColumnDef, ColumnState, Filter, IndexedDisplayRow, PipelineResult, Row, SortKey } from '../engine/model.js';

/** A data row as passed in `rows`. */
export type GridRow = Row;

/** A display row (group header or data row) with its position in the display list. */
export type DisplayRow = IndexedDisplayRow;

/** A group header row in the display list. */
export type GroupDisplayRow = Extract<IndexedDisplayRow, { type: 'group' }>;

/** The pipeline result: rows, counts and paging. */
export type GridView = PipelineResult;

/** Sticky offset of a pinned column. */
export interface StickyPlacement {
  side: 'start' | 'end';
  offset: number;
  edge: boolean;
}

/** Column layout: rendered keys, CSS grid template and pinned offsets. */
export interface GridLayout {
  keys: string[];
  sticky: Map<string, StickyPlacement>;
  template: string;
  startWidth: number;
  endWidth: number;
}

/** A sort key with its position in the sort model. */
export interface ColumnSort extends SortKey {
  index: number;
}

export interface MenuAction {
  id: string;
  label: string;
  disabled?: boolean;
  separator?: undefined;
  run(): void;
}

export interface MenuSeparator {
  separator: true;
}

/** A column menu entry. */
export type MenuItem = MenuAction | MenuSeparator;

interface FilterDraftBase {
  colId: string;
  op: string;
  error: string;
  errorField?: 'value' | 'value2';
  /** Popover position. */
  x?: number;
  y?: number;
}

/** Filter dialog draft for an enum column (a checklist). */
export interface EnumFilterDraft extends FilterDraftBase {
  list: Set<unknown>;
  search: string;
}

/** Filter dialog draft for other columns (one or two text inputs). */
export interface ValueFilterDraft extends FilterDraftBase {
  value: string;
  value2: string;
}

export type FilterDraft = EnumFilterDraft | ValueFilterDraft;

/** Fields a filter dialog control may update. */
export type FilterDraftPatch = Partial<Omit<EnumFilterDraft, 'colId'> & Omit<ValueFilterDraft, 'colId'>>;

/** The cell being edited. `text` is the option value itself for enum and boolean editors. */
export interface EditDraft {
  key: string;
  colId: string;
  text: unknown;
  error: string;
}

/** Popover position. */
export interface PopoverPosition {
  x: number;
  y: number;
}

export interface GridHost {
  localize: { term(key: string, ...args: unknown[]): string; termOr(key: string, fallback: string, ...args: unknown[]): string };
  label: string;
  columns: ColumnDef[];
  rows: GridRow[];
  pageSize: number;
  selection: 'none' | 'single' | 'multiple';
  density: import('../engine/model.js').GridDensity;
  idPrefix: string;
  external: boolean;
  loading: boolean;
  toolbar: boolean;
  quickSearch: boolean;
  /** undefined: the browser's locale. */
  resolvedLocale: string | undefined;
  readonly treegrid: boolean;
  /** Live-region message. @internal */
  _announce: string;
  /** The current pipeline result (rows, counts, groups) for rendering. */
  view: GridView;
  /** Column layout: widths, pinned offsets, visible columns. */
  layout: GridLayout;
  /** Rows keyboard navigation moves through. */
  navRows: DisplayRow[];
  /** @internal */
  _cols: Column[];
  /** @internal */
  _colState: ColumnState;
  /** @internal */
  _sort: SortKey[];
  /** @internal */
  _filters: Record<string, Filter>;
  /** @internal */
  _search: string;
  /** @internal */
  _groupBy: string[];
  /** @internal */
  _expanded: Set<string> | 'all';
  /** @internal */
  _page: number;
  /** @internal */
  _active: { key: string; col: number; pos: number };
  /** @internal */
  _selected: Set<unknown>;
  /** @internal */
  _menu: (PopoverPosition & { colId: string }) | null;
  /** @internal */
  _panel: PopoverPosition | null;
  /** @internal */
  _filterDraft: FilterDraft | null;
  /** @internal */
  _editing: EditDraft | null;
  /** Inline-start offset of the column drop indicator while dragging a header. @internal */
  _drop: number | null;
  /** Set after a header drag so the click that ends it does not sort. */
  suppressNextClick: boolean;
  getRowId(row: GridRow): unknown;
  columnById(id: string): Column | undefined;
  headerId(column: Column): string;
  ensureColumns(): void;
  keyOf(displayRow: DisplayRow): string;
  rowIndexFor(displayRow: DisplayRow): number;
  rowName(row: GridRow): unknown;
  isSelected(id: unknown): boolean;
  selectAll(checked: boolean): void;
  selectAllState(): 'none' | 'some' | 'all';
  onSelectClick(event: MouseEvent, displayRow: DisplayRow, pos: number): void;
  tabindexFor(pos: number, col: number): string;
  activate(pos: number, col: number, options?: { focus?: boolean }): void;
  focusActive(): void;
  goToPage(page: number, options?: { keepPos?: number }): void;
  scrollToRow(id: unknown): boolean;
  sortBy(colId: string, options?: { multi?: boolean }): void;
  sortFor(colId: string): ColumnSort | null;
  setSortDirection(colId: string, direction: 'asc' | 'desc' | null): void;
  renderHeaderContent(column: Column, sort: ColumnSort | null): TemplateResult;
  onHeaderClick(event: MouseEvent, column: Column): void;
  onHeaderPointerDown(event: PointerEvent, column: Column): void;
  hideColumn(colId: string): void;
  showColumn(colId: string): void;
  pinColumn(colId: string, side: 'start' | 'end' | null): void;
  resizeColumn(colId: string, width: number, options?: { commit?: boolean }): void;
  autosizeColumn(colId: string): void;
  moveColumnTo(colId: string, index: number): void;
  showDropIndicator(target: { index: number; x: number } | null): void;
  openMenu(colId: string, trigger?: Element | null): void;
  closeMenu(options?: { restoreFocus?: boolean }): void;
  setSearch(text: string): void;
  describeFilter(filter: Filter, column: Column): string;
  clearFilter(colId: string): void;
  clearAllFilters(): void;
  updateFilterDraft(patch: FilterDraftPatch): void;
  applyFilterDraft(): void;
  closeFilter(options?: { restoreFocus?: boolean }): void;
  closePanel(options?: { restoreFocus?: boolean }): void;
  moveInPanel(colId: string, delta: number): void;
  showAllColumns(): void;
  resetColumns(): void;
  setGroupBy(colIds: string[]): void;
  groupLabel(displayRow: GroupDisplayRow): string;
  toggleGroup(displayRow: GroupDisplayRow, open?: boolean): void;
  announceFilterResult(): void;
  trackStateChange(changed: Map<PropertyKey, unknown>): void;
  handleGridKey(event: KeyboardEvent, displayRow: DisplayRow | undefined, pos: number, col: number): boolean;
  renderCell(column: Column, row: GridRow, pos?: number, col?: number): TemplateResult;
  renderToolbarActions(): TemplateResult;
  extraMenuItems(column: Column): MenuItem[];
  /** @internal */
  _updateColumns(next: ColumnState, message: string): void;
}

/** The composed grid as the view functions see it. */
export type Grid = LitElement & GridHost;
