/**
 * Column header content and pointer gestures (resize by dragging the edge, reorder by dragging
 * the header). Every gesture has a keyboard path in the column menu or the column panel.
 */
import { html, nothing } from 'lit';
import { iconSvg } from '@focsd/primitives';

/**
 * @typedef {import('../engine/model.js').Column} Column
 * @typedef {import('../mixins/host.js').Grid} Grid
 */

const DRAG_THRESHOLD = 6;

/**
 * Header label, sort indicator (with priority when multi-sorting), menu button and resize edge.
 * @param {Grid} g
 * @param {Column} column
 * @param {import('../mixins/host.js').ColumnSort | null} sort
 */
export function renderHeaderContent(g, column, sort) {
  const multi = g._sort.length > 1;
  const sortText = sort ? g.localize.term('headerSortState', sort.direction === 'asc', multi ? sort.index + 1 : 0) : '';
  const filtered = Boolean(g._filters?.[column.id]);
  const stateText = `${filtered ? g.localize.term('headerFiltered') : ''}${sortText}`;
  const labelId = g.headerId(column);

  return html`<span part="header-label" id=${labelId}>${column.header}</span>
    <span part="sort-indicator" aria-hidden="true"
      >${sort ? iconSvg(sort.direction === 'asc' ? 'arrow-up' : 'arrow-down') : nothing}${
        sort && multi ? html`<span part="sort-priority">${sort.index + 1}</span>` : nothing
      }</span
    >
    ${filtered ? html`<span part="filter-indicator" aria-hidden="true">${iconSvg('search')}</span>` : nothing}
    <span class="focsd-visually-hidden" id="${labelId}-sort">${stateText}</span>
    <button
      part="menu-button"
      type="button"
      tabindex="-1"
      aria-label=${g.localize.term('columnOptions', column.header)}
      aria-haspopup="menu"
      aria-expanded=${String(g._menu?.colId === column.id)}
      @click=${(/** @type {MouseEvent & { currentTarget: HTMLElement }} */ e) => {
        e.stopPropagation();
        g.openMenu(column.id, e.currentTarget);
      }}
    >
      ${iconSvg('more')}
    </button>
    ${
      column.resizable
        ? html`<span
          part="resize-handle"
          aria-hidden="true"
          @pointerdown=${(/** @type {PointerEvent} */ e) => startResize(g, column, e)}
          @dblclick=${(/** @type {MouseEvent} */ e) => {
            e.stopPropagation();
            g.autosizeColumn(column.id);
          }}
        ></span>`
        : nothing
    }`;
}

/**
 * @param {Grid} g
 * @param {Column} column
 * @param {PointerEvent} event
 */
function startResize(g, column, event) {
  if (event.button !== 0) return;
  event.preventDefault();
  event.stopPropagation();
  const handle = /** @type {HTMLElement} */ (event.currentTarget);
  handle.setPointerCapture(event.pointerId);
  const startX = event.clientX;
  const startWidth = g._colState.widths[column.id] ?? column.width;
  const dir = getComputedStyle(g).direction === 'rtl' ? -1 : 1;
  /** @param {PointerEvent} e */
  const width = (e) => startWidth + (e.clientX - startX) * dir;
  /** @param {PointerEvent} e */
  const move = (e) => g.resizeColumn(column.id, width(e), { commit: false });

  /**
   * @param {PointerEvent} e
   * @param {boolean} commit
   */
  const finish = (e, commit) => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', cancel);
    handle.removeEventListener('lostpointercapture', cancel);
    g.resizeColumn(column.id, commit ? width(e) : startWidth, { commit: true });
  };

  /** @param {PointerEvent} e */
  const up = (e) => finish(e, true);
  /** @param {PointerEvent} e */
  const cancel = (e) => finish(e, false);
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', cancel);
  handle.addEventListener('lostpointercapture', cancel);
}

/**
 * Pointer down on a header cell: a click sorts (Shift adds to the sort); a drag reorders.
 * @param {Grid} g
 * @param {Column} column
 * @param {PointerEvent} event
 */
export function startHeaderPointer(g, column, event) {
  if (
    event.button !== 0 ||
    event.composedPath().some((n) => /** @type {Element} */ (n).matches?.('button, input, [part~="resize-handle"]'))
  )
    return;
  const cell = /** @type {HTMLElement} */ (event.currentTarget);
  const startX = event.clientX;
  let dragging = false;

  // Capture the pointer so every move and the release (or a cancel) come back to this header.
  try {
    cell.setPointerCapture(event.pointerId);
  } catch {
    /* synthetic or already-released pointer: capture is best effort */
  }

  /** @param {PointerEvent} e */
  const move = (e) => {
    if (!dragging && Math.abs(e.clientX - startX) > DRAG_THRESHOLD) dragging = true;

    if (dragging) g.showDropIndicator(dropTarget(g, column.id, e.clientX));
  };

  const cleanup = () => {
    cell.removeEventListener('pointermove', move);
    cell.removeEventListener('pointerup', up);
    cell.removeEventListener('pointercancel', cleanup);
    cell.removeEventListener('lostpointercapture', lost);
    g.showDropIndicator(null);
  };

  /** @param {PointerEvent} e */
  const up = (e) => {
    cleanup();

    if (!dragging) return;
    g.suppressNextClick = true;
    const target = dropTarget(g, column.id, e.clientX);

    if (target) g.moveColumnTo(column.id, target.index);
  };

  // Capture lost before pointerup (pointerup arrives first when the gesture completes normally).
  const lost = () =>
    queueMicrotask(() => {
      if (cell.hasPointerCapture?.(event.pointerId)) return;
      cleanup();
    });

  cell.addEventListener('pointermove', move);
  cell.addEventListener('pointerup', up);
  cell.addEventListener('pointercancel', cleanup);
  cell.addEventListener('lostpointercapture', lost);
}

/**
 * Where a dragged column would land: index in the column order and indicator x position.
 * @param {Grid} g
 * @param {string} draggedId
 * @param {number} clientX
 * @returns {{ index: number, x: number } | null}
 */
function dropTarget(g, draggedId, clientX) {
  const cells = /** @type {HTMLElement[]} */ ([
    ...g.renderRoot.querySelectorAll('[part~="header-row"] [role="columnheader"][data-col-id]'),
  ]);

  for (const cell of cells) {
    const rect = cell.getBoundingClientRect();

    if (clientX < rect.left || clientX > rect.right) continue;
    const targetId = /** @type {string} */ (cell.dataset.colId);
    // "Before" means earlier in reading order: the left half in LTR, the right half in RTL.
    const rtl = getComputedStyle(g).direction === 'rtl';
    const leftHalf = clientX < rect.left + rect.width / 2;
    const before = rtl ? !leftHalf : leftHalf;
    const order = g._colState.order.filter((id) => id !== draggedId);
    const index = order.indexOf(targetId) + (before ? 0 : 1);
    // The grid element is always rendered while its header is.
    const gridRect = /** @type {Element} */ (g.renderRoot.querySelector('[part~="grid"]')).getBoundingClientRect();
    // The indicator is placed with inset-inline-start, so measure from the inline-start edge.
    const edge = leftHalf ? rect.left : rect.right;

    return { index, x: rtl ? gridRect.right - edge : edge - gridRect.left };
  }

  return null;
}
