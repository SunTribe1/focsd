/**
 * Pure helpers for chart geometry: nice axis ticks, linear scales and donut arcs. No DOM.
 */

/**
 * A "nice" step (1, 2 or 5 times a power of ten) for about `count` ticks across `span`.
 * @param {number} span
 * @param {number} [count]
 * @returns {number}
 */
export function niceStep(span, count = 5) {
  if (!(span > 0)) return 1;
  const raw = span / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return nice * power;
}

/**
 * Axis domain and ticks covering [min, max]. Value axes of bars and areas include zero; scatter
 * axes pass `zero = false` and get a nice domain around the data only.
 * @param {number} min
 * @param {number} max
 * @param {number} [count]
 * @param {boolean} [zero] include zero in the domain (default true)
 * @returns {{ min: number, max: number, ticks: number[] }}
 */
export function niceTicks(min, max, count = 5, zero = true) {
  const lo = zero ? Math.min(0, min) : min;
  const hi = zero ? Math.max(0, max) : max;

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { min: 0, max: 1, ticks: [0, 1] };

  if (lo === hi)
    return zero || lo === 0 ? { min: 0, max: 1, ticks: [0, 1] } : niceTicks(lo - Math.abs(lo) / 2, hi + Math.abs(hi) / 2, count, false);
  const step = niceStep(hi - lo, count);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks = [];

  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));

  return { min: start, max: end, ticks };
}

/**
 * Map a value in [d0, d1] to [r0, r1].
 * @param {number} d0
 * @param {number} d1
 * @param {number} r0
 * @param {number} r1
 * @returns {(v: number) => number}
 */
export const linear = (d0, d1, r0, r1) => (v) => (d1 === d0 ? r0 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0));

/**
 * SVG path for a donut slice between two angles (radians, 0 = 12 o'clock, clockwise).
 * @param {number} cx
 * @param {number} cy
 * @param {number} outer
 * @param {number} inner
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
export function arcPath(cx, cy, outer, inner, start, end) {
  // A full circle cannot be drawn as one arc: stop just short of it.
  const sweep = Math.min(end - start, Math.PI * 2 - 1e-6);
  const stop = start + sweep;
  /** @type {(r: number, a: number) => [number, number]} */
  const point = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = point(outer, start);
  const [x1, y1] = point(outer, stop);
  const [x2, y2] = point(inner, stop);
  const [x3, y3] = point(inner, start);
  const large = sweep > Math.PI ? 1 : 0;
  /** @param {number} n */
  const f = (n) => n.toFixed(2);

  return `M${f(x0)} ${f(y0)}A${outer} ${outer} 0 ${large} 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${inner} ${inner} 0 ${large} 0 ${f(x3)} ${f(y3)}Z`;
}
