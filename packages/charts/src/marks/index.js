import { areaMarks } from './area.js';
import { barMarks } from './bar.js';
import { drawCartesian } from './cartesian.js';
import { drawDonut } from './donut.js';
import { lineMarks } from './line.js';
import { drawScatter } from './scatter.js';

/**
 * The drawing of each chart `type`: a function from the render context to a drawing. A new cartesian
 * type is one more entry using `drawCartesian` with its own marks; a new frame is a function of its own.
 * @typedef {(ctx: import('../types.js').ChartContext) => import('../types.js').ChartDrawing} Drawing
 * @type {{ bar: Drawing } & Record<string, Drawing>}
 */
export const DRAWINGS = {
  bar: (ctx) => drawCartesian(ctx, barMarks),
  line: (ctx) => drawCartesian(ctx, lineMarks),
  donut: drawDonut,
  area: (ctx) => drawCartesian(ctx, areaMarks),
  scatter: drawScatter,
};

/**
 * @param {import('../types.js').ChartContext} ctx
 * @returns {import('../types.js').ChartDrawing}
 */
export const draw = (ctx) => (DRAWINGS[ctx.type] ?? DRAWINGS.bar)(ctx);
