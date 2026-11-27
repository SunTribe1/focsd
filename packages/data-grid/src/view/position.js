import { cssomStyle } from '@focsd-dev/primitives/internal';

/**
 * Style binding that places a grid popup (column menu, filter, column panel) at viewport `x`/`y`.
 * `x` is physical (from the left in either direction), so it is written as `left`. Written through
 * the CSSOM, so a strict `style-src` policy does not block it; the popup's stylesheet resets the
 * popover's UA `inset`.
 * @param {{ x?: number, y?: number }} at an unset coordinate leaves that inset to the stylesheet
 */
export const popupAt = ({ x, y }) =>
  cssomStyle({ 'inset-block-start': y === undefined ? undefined : `${y}px`, left: x === undefined ? undefined : `${x}px` });

/** Space between a popup and the control that opened it (px). */
const POPUP_GAP = 4;

/** Least distance between a popup and the viewport's left or right edge (px). */
const POPUP_GUTTER = 8;

/**
 * The physical edge a popup lines up with: the opener's inline start (left in LTR, right in RTL),
 * or its inline end (the column panel, whose toolbar button sits at the end).
 * @param {Element} host
 * @param {'start' | 'end'} [side]
 * @returns {'left' | 'right'}
 */
export const popupEdge = (host, side = 'start') => (host.matches(':dir(rtl)') === (side === 'start') ? 'right' : 'left');

/**
 * Where a popup `width` px wide opens under `rect` (viewport px): its `edge` lined up with the same
 * edge of `rect`, then kept POPUP_GUTTER px inside the viewport.
 * @param {DOMRect} rect
 * @param {number} width The popup's measured width (0 before it is shown).
 * @param {'left' | 'right'} edge
 * @returns {{ x: number, y: number }}
 */
export function placePopup(rect, width, edge) {
  const want = edge === 'right' ? rect.right - width : rect.left;

  return { x: Math.max(POPUP_GUTTER, Math.min(want, innerWidth - width - POPUP_GUTTER)), y: rect.bottom + POPUP_GAP };
}

/**
 * Show `popover` if it is hidden, then place it under `rect` now that its width can be measured.
 * @param {HTMLElement} popover
 * @param {DOMRect} rect
 * @param {'left' | 'right'} edge
 * @returns {{ x: number, y: number }}
 */
export function showPlaced(popover, rect, edge) {
  if (!popover.matches(':popover-open')) popover.showPopover();
  // Measure at the left edge: at the provisional spot a popup without a fixed width (the column
  // menu) would shrink to the little room left before the viewport edge. The re-render that
  // follows writes the real position.
  popover.style.setProperty('left', '0px');

  return placePopup(rect, popover.offsetWidth, edge);
}
