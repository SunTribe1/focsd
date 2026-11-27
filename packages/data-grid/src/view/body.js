/**
 * Row and cell rendering for focsd-data-grid. Functions receive the element (`g`) and read its
 * computed layout and view; they never mutate state, only bind event handlers on it.
 */
import { html, nothing } from 'lit';
import { cssomStyle } from '@focsd/primitives/internal';
import { cellValue } from '../engine/columns.js';
import { getType } from '../engine/types.js';
import { builtInCell } from './cells.js';
import { iconSvg } from '@focsd/primitives';

/**
 * @typedef {import('../engine/model.js').Column} Column
 * @typedef {import('../mixins/host.js').Grid} Grid
 * @typedef {import('../mixins/host.js').GridLayout} GridLayout
 * @typedef {import('../mixins/host.js').GridRow} GridRow
 * @typedef {import('../mixins/host.js').DisplayRow} DisplayRow
 */

const SELECT_WIDTH = 48;

/**
 * Column layout: rendered keys, CSS grid template, and sticky offsets for pinned columns.
 * @param {import('../engine/model.js').Column[]} columns display columns (pinned start, center, pinned end)
 * @param {Record<string, string|null>} pinned
 * @param {Record<string, number>} widths
 * @param {boolean} withSelect
 * @returns {GridLayout}
 */
export function computeLayout(columns, pinned, widths, withSelect) {
  const keys = [...(withSelect ? ['select'] : []), ...columns.map((c) => c.id)];
  // A column without a recorded width (not yet in the column state) has its declared one.
  const widthOf = new Map(columns.map((c) => [c.id, widths[c.id] ?? c.width]));
  /** @param {string} key */
  const width = (key) => (key === 'select' ? SELECT_WIDTH : (widthOf.get(key) ?? 0));
  /** @param {string} key */
  const side = (key) => (key === 'select' ? 'start' : (pinned[key] ?? null));
  /** @type {GridLayout['sticky']} */
  const sticky = new Map();
  let left = 0;
  const startKeys = keys.filter((k) => side(k) === 'start');

  for (const key of startKeys) {
    sticky.set(key, { side: 'start', offset: left, edge: key === startKeys.at(-1) });
    left += width(key);
  }

  let right = 0;
  const endKeys = keys.filter((k) => side(k) === 'end');

  for (const key of [...endKeys].reverse()) {
    sticky.set(key, { side: 'end', offset: right, edge: key === endKeys[0] });
    right += width(key);
  }

  // startWidth/endWidth: pinned areas, used as scroll-padding so focus never lands under them (WCAG 2.4.11).
  return { keys, sticky, template: keys.map((k) => `${width(k)}px`).join(' '), startWidth: left, endWidth: right };
}

/**
 * part names and sticky offset for a (possibly pinned) cell. The offset is set through the CSSOM
 * (cssomStyle), which a strict `style-src` policy does not block.
 * @param {GridLayout} layout
 * @param {string} key
 */
function placement(layout, key) {
  const pin = layout.sticky.get(key);

  // Always the directive (never `nothing`), so unpinning removes the offset it wrote.
  if (!pin) return { parts: '', style: cssomStyle({}) };
  const parts = ` pinned ${pin.edge ? `pinned-${pin.side}-edge` : ''}`;

  return { parts, style: cssomStyle({ [`inset-inline-${pin.side}`]: `${pin.offset}px` }) };
}

/**
 * What a cell shows: the column's render(), else a built-in display (status chip, avatar), else the
 * type's formatted value.
 * @param {Grid} g
 * @param {Column} column
 * @param {GridRow} row
 * @returns {unknown}
 */
export function cellContent(g, column, row) {
  const value = cellValue(row, column);

  if (column.render) return column.render(value, row);
  const text = formattedText(g, column, value);

  return builtInCell(column, value, text) ?? text;
}

/**
 * A cell value as text in the grid's language. Booleans read Yes/No unless the column names its own
 * labels.
 * @param {Grid} g
 * @param {Column} column
 * @param {unknown} value
 * @returns {string}
 */
function formattedText(g, column, value) {
  /** @type {Column} */
  const labeled =
    column.type === 'boolean' && !column.labels ? { ...column, labels: [g.localize.term('no'), g.localize.term('yes')] } : column;

  return String(getType(column.type).format(value, labeled, g.resolvedLocale) ?? '');
}

/**
 * A cell as plain text, for labels such as a row's name: what `render()` returns when that is text,
 * otherwise the formatted value (never a chip or a template).
 * @param {Grid} g
 * @param {Column} column
 * @param {GridRow} row
 * @returns {string}
 */
export function cellText(g, column, row) {
  const value = cellValue(row, column);
  const rendered = column.render?.(value, row);

  // A template (an object) has no text of its own: fall back to the formatted value.
  return rendered === undefined || rendered instanceof Object ? formattedText(g, column, value) : String(rendered);
}

/* eslint-disable lit-a11y/click-events-have-key-events -- cells use roving tabindex (APG grid): the grid's delegated keydown in grid.js handles every cell's keys */
/** @param {Grid} g */
export function renderHeaderRow(g) {
  const { layout } = g;
  const allState = g.selectAllState();

  return html`<div role="row" part="header-row" aria-rowindex="1">
    ${layout.keys.map((key, colIndex) => {
      const { parts, style } = placement(layout, key);
      const tabindex = g.tabindexFor(0, colIndex);

      if (key === 'select') {
        return html`<div role="columnheader" part="header-cell select${parts}" style=${style} aria-colindex=${colIndex + 1} data-pos="0:${colIndex}">
          <input
            type="checkbox"
            aria-label=${g.localize.term('selectAllRows')}
            tabindex=${tabindex}
            .checked=${allState === 'all'}
            .indeterminate=${allState === 'some'}
            @change=${(/** @type {Event & { target: HTMLInputElement }} */ e) => g.selectAll(e.target.checked)}
          />
        </div>`;
      }

      const column = /** @type {Column} */ (g.columnById(key));
      const sort = g.sortFor(key);
      const labelId = g.headerId(column);

      return html`<div
        role="columnheader"
        part="header-cell${column.type === 'number' ? ' numeric' : ''}${column.sortable ? ' sortable' : ''}${parts}"
        style=${style}
        aria-colindex=${colIndex + 1}
        aria-sort=${sort?.index === 0 ? (sort.direction === 'asc' ? 'ascending' : 'descending') : nothing}
        aria-labelledby="${labelId} ${labelId}-sort"
        tabindex=${tabindex}
        data-pos="0:${colIndex}"
        data-col-id=${column.id}
        @pointerdown=${(/** @type {PointerEvent} */ e) => g.onHeaderPointerDown(e, column)}
        @click=${(/** @type {MouseEvent} */ e) => g.onHeaderClick(e, column)}
      >
        ${g.renderHeaderContent(column, sort)}
      </div>`;
    })}
  </div>`;
}

/**
 * @param {Grid} g
 * @param {Extract<DisplayRow, { type: 'row' }>} displayRow
 * @param {number} rowPos
 */
export function renderDataRow(g, displayRow, rowPos) {
  const { layout } = g;
  const { row } = displayRow;
  const id = g.getRowId(row);
  const selected = g.isSelected(id);
  const ariaRow = g.rowIndexFor(displayRow);

  return html`<div
    role="row"
    part="row"
    aria-rowindex=${ariaRow}
    aria-selected=${g.selection === 'none' ? nothing : String(selected)}
    aria-level=${g.treegrid ? displayRow.level : nothing}
  >
    ${layout.keys.map((key, colIndex) => {
      const { parts, style } = placement(layout, key);
      const tabindex = g.tabindexFor(rowPos, colIndex);

      if (key === 'select') {
        return html`<div role="gridcell" part="cell select${parts}" style=${style} aria-colindex=${colIndex + 1} data-pos="${rowPos}:${colIndex}">
          <input
            type="checkbox"
            aria-label=${g.localize.term('selectRow', g.rowName(row))}
            tabindex=${tabindex}
            .checked=${selected}
            @click=${(/** @type {MouseEvent} */ e) => g.onSelectClick(e, displayRow, rowPos)}
          />
        </div>`;
      }

      const column = /** @type {Column} */ (g.columnById(key));

      return html`<div
        role="gridcell"
        part="cell${column.type === 'number' ? ' numeric' : ''}${parts}"
        style=${style}
        aria-colindex=${colIndex + 1}
        tabindex=${tabindex}
        data-pos="${rowPos}:${colIndex}"
        @click=${() => g.activate(rowPos, colIndex)}
        >${g.renderCell(column, row, rowPos, colIndex)}</div
      >`;
    })}
  </div>`;
}

/**
 * A group row: toggle and label in the first data column, aggregates in their columns.
 * @param {Grid} g
 * @param {import('../mixins/host.js').GroupDisplayRow} displayRow
 * @param {number} rowPos
 */
export function renderGroupRow(g, displayRow, rowPos) {
  const { layout } = g;
  const firstData = layout.keys.findIndex((k) => k !== 'select');
  const groupColumn = /** @type {Column} */ (g.columnById(displayRow.colId));

  return html`<div
    role="row"
    part="row group-row"
    aria-rowindex=${g.rowIndexFor(displayRow)}
    aria-level=${displayRow.level}
    aria-expanded=${String(displayRow.expanded)}
  >
    ${layout.keys.map((key, colIndex) => {
      const { parts, style } = placement(layout, key);
      const tabindex = g.tabindexFor(rowPos, colIndex);
      const column = key === 'select' ? null : g.columnById(key);
      /** @type {unknown} */
      let content = nothing;

      if (colIndex === firstData) {
        content = html`<span part="group-toggle" aria-hidden="true">${iconSvg(displayRow.expanded ? 'chevron-down' : 'chevron-right')}</span>
          <span part="cell-text group-label" style=${cssomStyle({ '--_group-level': String(displayRow.level - 1) })}
            >${groupColumn.header}: ${g.groupLabel(displayRow)} (${displayRow.count})</span
          >`;
      } else if (column?.aggregate && displayRow.aggregates[key] !== undefined && displayRow.aggregates[key] !== null) {
        const value = displayRow.aggregates[key];
        const text = column.aggregate === 'count' ? String(value) : getType(column.type).format(value, column, g.resolvedLocale);
        content = html`<span part="cell-text aggregate">${text}</span>`;
      }

      return html`<div
        role="gridcell"
        part="cell group-cell${column?.type === 'number' ? ' numeric' : ''}${parts}"
        style=${style}
        aria-colindex=${colIndex + 1}
        tabindex=${tabindex}
        data-pos="${rowPos}:${colIndex}"
        @click=${(/** @type {MouseEvent} */ e) => {
          g.activate(rowPos, colIndex);

          if (e.composedPath().some((n) => /** @type {Element} */ (n).getAttribute?.('part') === 'group-toggle')) g.toggleGroup(displayRow);
        }}
      >
        ${content}
      </div>`;
    })}
  </div>`;
}
/* eslint-enable lit-a11y/click-events-have-key-events */
