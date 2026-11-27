/** Series markers and fill patterns, so series never differ by color alone (WCAG 1.4.1). */
export const MARKERS = /** @type {const} */ (['circle', 'square', 'triangle', 'diamond', 'cross', 'ring']);
export const PATTERNS = /** @type {const} */ (['solid', 'hatch', 'dots', 'lines', 'cross-hatch', 'grid']);

/**
 * Pattern (or marker) for series `i`. Colors repeat every six series; shifting the pattern by one
 * each lap keeps series 7 apart from series 1 (unique color + pattern pairs for 36 series).
 * @template T
 * @param {readonly [T, ...T[]]} list non-empty, so the fallback (never reached) is typed T
 * @param {number} i
 * @returns {T}
 */
export const shifted = (list, i) => list[(i + Math.floor(i / list.length)) % list.length] ?? list[0];

/** The color token of series (or slice) `index`; the six colors repeat. @param {number} index */
export const seriesColor = (index) => `var(--_chart-${(index % 6) + 1})`;

/**
 * @param {string} marker
 * @param {number} x
 * @param {number} y
 * @param {number} [r]
 */
export function markerPath(marker, x, y, r = 4.5) {
  switch (marker) {
    case 'square':
      return `M${x - r} ${y - r}h${2 * r}v${2 * r}h${-2 * r}Z`;
    case 'triangle':
      return `M${x} ${y - r * 1.15}L${x + r * 1.1} ${y + r * 0.85}L${x - r * 1.1} ${y + r * 0.85}Z`;
    case 'diamond':
      return `M${x} ${y - r * 1.25}L${x + r * 1.25} ${y}L${x} ${y + r * 1.25}L${x - r * 1.25} ${y}Z`;
    case 'cross':
      return `M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`;
    default: // 'circle', and 'ring' (filled with the surface color)
      return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  }
}
