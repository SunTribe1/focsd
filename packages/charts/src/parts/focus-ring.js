import { nothing, svg } from 'lit';

/**
 * One copy of a point's mark (path or rounded rect) with its own paint.
 * @param {import('../types.js').PointMark} mark
 * @param {string} cls
 * @param {{ fill: string, stroke: string, width: number }} paint
 */
function ringLayer(mark, cls, { fill, stroke, width }) {
  if (mark.d !== undefined) return svg`<path class=${cls} d=${mark.d} fill=${fill} stroke=${stroke} stroke-width=${width}></path>`;

  return svg`<rect class=${cls} x=${mark.x} y=${mark.y} width=${mark.width} height=${mark.height} rx=${mark.rx ?? 0}
    fill=${fill} stroke=${stroke} stroke-width=${width}></rect>`;
}

/**
 * The focus ring around the active point (DESIGN.md: a 1px focus-inner gap inside a 1px
 * focus-outer ring, outside the mark). SVG has no box-shadow, so the ring is two wide strokes of the
 * point's own outline drawn over the marks, with a copy of the point on top that hides their inner
 * halves. It shows only while a point has keyboard focus (the `focus-ring` rule).
 * @param {import('../types.js').PointMark | null} mark
 */
export function focusRing(mark) {
  if (!mark) return nothing;
  const edge = mark.strokeWidth ?? 0;

  return svg`<g part="focus-ring" aria-hidden="true">
    ${ringLayer(mark, 'ring-outer', { fill: 'none', stroke: 'var(--focsd-focus-outer)', width: edge + 4 })}
    ${ringLayer(mark, 'ring-inner', { fill: 'none', stroke: 'var(--focsd-focus-inner)', width: edge + 2 })}
    ${ringLayer(mark, 'ring-cover', { fill: mark.fill, stroke: mark.stroke ?? 'none', width: edge })}
  </g>`;
}
