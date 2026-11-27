import { getType } from '../engine/types.js';

/**
 * @typedef {import('../events.js').GroupChangeDetail} GroupChangeDetail
 */

/**
 * @typedef {import('../engine/model.js').Column} Column
 * @typedef {import('./host.js').GroupDisplayRow} GroupDisplayRow
 *
 * @typedef {object} GridGroupingApi
 * @property {(colIds: string[]) => void} setGroupBy
 * @property {() => void} expandAll
 * @property {() => void} collapseAll
 */

/**
 * Row grouping for focsd-data-grid. Grouping turns the grid into a treegrid: group rows carry
 * aria-level and aria-expanded; Enter/Space toggle them, and ArrowRight/ArrowLeft expand and
 * collapse when focus is at the start of a group row.
 *
 * @template {new (...args: any[]) => import('lit').LitElement & import('./host.js').GridHost} T
 * @param {T} Base
 * @returns {T & (new (...args: any[]) => GridGroupingApi & import('./host.js').GridHost)}
 */
export const GroupingMixin = (Base) =>
  class extends Base {
    /**
     * For the grid's templates: the text of a group row.
     * @param {GroupDisplayRow} displayRow
     * @returns {string}
     * @override
     */
    groupLabel(displayRow) {
      const column = /** @type {Column} */ (this.columnById(displayRow.colId));

      const text =
        displayRow.value === null
          ? this.localize.term('emptyGroup')
          : getType(column.type).format(displayRow.value, column, this.resolvedLocale);

      return text;
    }

    /**
     * Group by these column ids (outermost first).
     * @param {string[]} colIds
     * @override
     */
    setGroupBy(colIds) {
      // Unknown column ids are ignored, as in setState().
      const known = colIds.filter((id) => this.columnById(id));
      this._groupBy = known;
      this._page = 1;
      const headers = known.map((id) => /** @type {Column} */ (this.columnById(id)).header);
      this._announce = headers.length ? this.localize.term('groupedBy', headers) : this.localize.term('groupingRemoved');
      /** @type {CustomEvent<GroupChangeDetail>} */
      this.dispatchEvent(new CustomEvent('focsd-group-change', { bubbles: true, detail: { groupBy: known } }));
    }

    /**
     * Expands or collapses a group row.
     * @param {GroupDisplayRow} displayRow
     * @param {boolean} [open]
     * @override
     */
    toggleGroup(displayRow, open = !displayRow.expanded) {
      // Read through the host type: this first assignment would otherwise count as the declaration.
      const expanded = /** @type {import('./host.js').GridHost} */ (this)._expanded;

      const next = new Set(
        expanded === 'all'
          ? this.view.displayRows.filter((r) => r.type === 'group').map((r) => /** @type {GroupDisplayRow} */ (r).key)
          : expanded,
      );

      if (open) next.add(displayRow.key);
      else next.delete(displayRow.key);
      this._expanded = next;
      this._announce = this.localize.term('groupToggled', this.groupLabel(displayRow), open);
    }

    /** Expands every group. */
    expandAll() {
      this._expanded = 'all';
      this._announce = this.localize.term('allGroupsExpanded');
    }

    /** Collapses every group. */
    collapseAll() {
      this._expanded = new Set();
      this._announce = this.localize.term('allGroupsCollapsed');
    }

    /**
     * @param {Column} column
     * @returns {import('./host.js').MenuItem[]}
     * @override
     */
    extraMenuItems(column) {
      const items = super.extraMenuItems?.(column) ?? [];

      if (!column.groupable || this.external) return items;
      const grouped = this._groupBy.includes(column.id);

      return [
        ...items,
        grouped
          ? {
              id: 'ungroup',
              label: this.localize.term('ungroup'),
              run: () => this.setGroupBy(this._groupBy.filter((id) => id !== column.id)),
            }
          : { id: 'group', label: this.localize.term('groupByThisColumn'), run: () => this.setGroupBy([...this._groupBy, column.id]) },
        { separator: true },
      ];
    }

    /**
     * Keys on a group row. Returns true when handled.
     * @param {KeyboardEvent} event
     * @param {import('./host.js').DisplayRow | undefined} displayRow
     * @param {number} pos
     * @param {number} col
     * @returns {boolean}
     * @override
     */
    handleGridKey(event, displayRow, pos, col) {
      if (displayRow?.type === 'group') {
        const firstDataCol = this.layout.keys.findIndex((k) => k !== 'select');
        const atStart = col <= firstDataCol;
        const rtl = getComputedStyle(this).direction === 'rtl';
        const expandKey = rtl ? 'ArrowLeft' : 'ArrowRight';
        const collapseKey = rtl ? 'ArrowRight' : 'ArrowLeft';

        if (event.key === 'Enter' || event.key === ' ') {
          this.toggleGroup(displayRow);

          return true;
        }

        if (atStart && event.key === expandKey && !displayRow.expanded) {
          this.toggleGroup(displayRow, true);

          return true;
        }

        if (atStart && event.key === collapseKey && displayRow.expanded) {
          this.toggleGroup(displayRow, false);

          return true;
        }
      }

      return super.handleGridKey?.(event, displayRow, pos, col) ?? false;
    }
  };
