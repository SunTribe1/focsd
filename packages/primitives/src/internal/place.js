/** Gap between the target and the panel, and the margin kept from the viewport edges (CSS px). */
const GAP = 8;

/** @typedef {import('./types.js').Placement} Placement */
/** @typedef {{ top: number, left: number, width: number, height: number, bottom: number, right: number }} Rect */
/** @typedef {{ width: number, height: number, rtl?: boolean }} Viewport */

/** @type {Record<Placement, Placement>} */
const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

const clamp = (/** @type {number} */ value, /** @type {number} */ max) => Math.max(GAP, Math.min(value, max - GAP));

/**
 * Where the panel's top left goes for one side, before clamping. Above or below, the panel lines
 * up with the target's inline-start edge: its left edge, or its right edge in right-to-left text.
 * @param {Rect} target
 * @param {{ width: number, height: number }} panel
 * @param {Placement} side
 * @param {boolean} [rtl]
 */
function sideOf(target, panel, side, rtl = false) {
  const start = rtl ? target.right - panel.width : target.left;

  if (side === 'top') return { top: target.top - GAP - panel.height, left: start };

  if (side === 'left') return { top: target.top, left: target.left - GAP - panel.width };

  if (side === 'right') return { top: target.top, left: target.right + GAP };

  return { top: target.bottom + GAP, left: start };
}

/**
 * Whether a panel at `pos` fits inside the viewport along the side's axis.
 * @param {{ top: number, left: number }} pos
 * @param {{ width: number, height: number }} panel
 * @param {Viewport} viewport
 * @param {Placement} side
 */
function fits(pos, panel, viewport, side) {
  if (side === 'left' || side === 'right') return pos.left >= GAP && pos.left + panel.width <= viewport.width - GAP;

  return pos.top >= GAP && pos.top + panel.height <= viewport.height - GAP;
}

/**
 * Fixed-position placement for a panel next to a target, for engines without CSS anchor
 * positioning: on the requested side with an 8 px gap, flipped to the opposite side
 * when it would overflow there and fit there, then clamped inside the viewport with an 8 px margin.
 * `top` and `bottom` align with the target's inline-start edge (`viewport.rtl` for right-to-left);
 * `left` and `right` are physical sides.
 * @param {Rect} targetRect the target's `getBoundingClientRect()`
 * @param {{ width: number, height: number }} panelSize
 * @param {Viewport} viewport
 * @param {string} [placement] `top`, `bottom` (default), `left` or `right`
 * @returns {{ top: number, left: number, placement: string }}
 */
export function place(targetRect, panelSize, viewport, placement = 'bottom') {
  const side = /** @type {Placement} */ (Object.hasOwn(OPPOSITE, placement) ? placement : 'bottom');
  const wanted = sideOf(targetRect, panelSize, side, viewport.rtl);
  const flipped = sideOf(targetRect, panelSize, OPPOSITE[side], viewport.rtl);
  const flip = !fits(wanted, panelSize, viewport, side) && fits(flipped, panelSize, viewport, OPPOSITE[side]);
  const pos = flip ? flipped : wanted;

  return {
    top: clamp(pos.top, viewport.height - panelSize.height),
    left: clamp(pos.left, viewport.width - panelSize.width),
    placement: flip ? OPPOSITE[side] : side,
  };
}
