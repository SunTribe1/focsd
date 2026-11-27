/**
 * Internal chart types (JSDoc only). The public ones (`ChartRow`, `ChartSeries`, `PointFocusDetail`)
 * live in chart.js, which is what the package exports.
 */

/** A point by series and row; hovered points also carry the tooltip position. */
/** @typedef {{ s: number, r: number, x?: number, y?: number }} ChartPoint */
/** @typedef {{ x: number, y: number, text: string }} ChartAnchor */
/** @typedef {{ body: import('lit').SVGTemplateResult, width: number, height: number, anchor: ChartAnchor | null, centered?: boolean }} ChartDrawing */
/** @typedef {{ d?: string, x?: number, y?: number, width?: number, height?: number, rx?: number, fill: string, stroke?: string, strokeWidth?: number }} PointMark */
/** @typedef {{ top: number, right: number, bottom: number, left: number }} Padding */
/** @typedef {{ rows: import('./chart.js').ChartRow[], series: import('./chart.js').ChartSeries[], band: number, cx: (i: number) => number, y: (v: number) => number, pad: Padding }} CartesianPlot */
/** @typedef {{ min: number, max: number, ticks: number[] }} Domain A nice axis domain (scale.js `niceTicks`). */
/** @typedef {{ marks: unknown[], ring: PointMark | null }} MarkSet What a mark module draws, and the ring for the active point. */

/**
 * Everything a mark, legend, table or keyboard module needs from the element, built fresh for each
 * render. Modules take this instead of the element, so they stay pure and testable.
 * @typedef {object} ChartContext
 * @property {string} type
 * @property {import('./chart.js').ChartRow[]} rows
 * @property {import('./chart.js').ChartSeries[]} series
 * @property {string} x The key of the category label (scatter: of the numeric x).
 * @property {boolean} mirror The plot runs right to left, with the value axis on the right.
 * @property {import('./stack.js').Stack | null} stack The stacking of `stacked` bar and area charts, else null.
 * @property {string} label
 * @property {{ caption: string, summary: string, table: string }} ids
 * @property {number} width
 * @property {number} height
 * @property {number} labelWidth Widest value-axis label measured after the last render.
 * @property {ChartPoint | null} active
 * @property {ChartPoint | null} hover
 * @property {(s: number, r: number) => number | null} valueAt
 * @property {(s: number, r: number) => boolean} hasPoint
 * @property {() => { s: number, r: number } | null} firstPoint
 * @property {(row: import('./chart.js').ChartRow | undefined) => string} category
 * @property {(v: number) => string} number Formats a value (`format`).
 * @property {(v: number) => string} xNumber Formats a scatter x (`xFormat`).
 * @property {string} yLabel The y column heading of a scatter table: `y`, else "y".
 * @property {(key: string, ...args: unknown[]) => string} term A localized term.
 * @property {(s: number, r: number) => string} pointName
 * @property {(s: number, r: number) => { active: boolean, tabindex: string, name: string }} pointAttrs
 * @property {(i: number) => string} color
 * @property {(i: number) => string} fill
 * @property {(s: number, r: number) => void} focus A point received focus (sets the active point).
 * @property {(point: ChartPoint | null) => void} setHover
 * @property {boolean} hasRenderedPoints Whether the last render drew focusable points.
 */
export {};
