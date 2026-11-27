// Pane sizes of a splitter, as percentages that add up to 100. Every function returns a new array.

/** @param {number | undefined} size @returns {size is number} */
const isSet = (size) => size !== undefined && Number.isFinite(size);

/**
 * The entry at `i`. Callers index within the array (sizes, minimums and maximums have one entry per pane).
 * @param {number[]} list
 * @param {number} i
 * @returns {number}
 */
const at = (list, i) => /** @type {number} */ (list[i]);

/** @param {number[]} sizes */
const sum = (sizes) => sizes.reduce((total, size) => total + size, 0);

/**
 * @param {number} value
 * @param {number} low
 * @param {number} high
 */
const within = (value, low, high) => Math.min(Math.max(value, low), high);

/** Scales `values` to add up to 100 (equal shares when they are all 0). @param {number[]} values */
const scale = (values) => {
  const total = sum(values);

  return values.map((size) => (total > 0 ? (size * 100) / total : 100 / values.length));
};

/**
 * Scales `values` to add up to 100, then keeps each within its limits: a pane that hits a limit
 * keeps it, and the difference goes to the others in proportion, until the total is 100 again.
 * @param {number[]} values
 * @param {number[]} lo
 * @param {number[]} hi
 */
function fit(values, lo, hi) {
  let next = scale(values);
  const pinned = new Set();

  for (let round = 0; round <= values.length; round += 1) {
    next = next.map((size, i) => {
      const kept = within(size, at(lo, i), at(hi, i));

      if (kept !== size) pinned.add(i);

      return kept;
    });
    const gap = 100 - sum(next);
    const count = values.length - pinned.size;

    if (Math.abs(gap) < 1e-9 || !count) break;
    const weight = sum(next.map((size, i) => (pinned.has(i) ? 0 : size)));

    next = next.map((size, i) => (pinned.has(i) ? size : size + gap * (weight > 0 ? size / weight : 1 / count)));
  }

  return next;
}

/**
 * Fills the unset sizes with equal shares of what is left, then scales the sizes to add up to 100
 * with each within its limits. When the limits cannot all hold, the minimums (or the maximums) are
 * scaled to 100 instead.
 * @param {(number | undefined)[]} sizes
 * @param {number[]} mins
 * @param {number[]} maxes
 * @returns {number[]}
 */
export function normalize(sizes, mins, maxes) {
  const set = sizes.filter(isSet);
  const share = Math.max(0, 100 - sum(set)) / (sizes.length - set.length || 1);
  const lo = sizes.map((_, i) => Math.max(0, at(mins, i)));
  const hi = sizes.map((_, i) => Math.max(at(lo, i), at(maxes, i)));

  if (sum(lo) > 100) return scale(lo);

  if (sum(hi) < 100) return scale(hi);

  return fit(
    sizes.map((size) => (isSet(size) ? size : share)),
    lo,
    hi,
  );
}

/**
 * Moves the boundary after pane `index` by `delta` percentage points. Only the panes on either side
 * of it change, and each stays within its limits (a pane already below its minimum does not shrink).
 * @param {number[]} sizes
 * @param {number} index
 * @param {number} delta
 * @param {...number[]} limits The minimum sizes, then the maximum sizes.
 * @returns {number[]}
 */
export function resize(sizes, index, delta, ...limits) {
  const [mins = [], maxes = []] = limits;
  const [a, b] = [index, index + 1];
  const grow = Math.max(0, Math.min(at(maxes, a) - at(sizes, a), at(sizes, b) - at(mins, b)));
  const shrink = Math.max(0, Math.min(at(sizes, a) - at(mins, a), at(maxes, b) - at(sizes, b)));
  let moved = within(delta, -shrink, grow);

  // A collapsed pane that starts to grow comes back at its minimum.
  if (sizes[a] === 0 && moved > 0) moved = Math.min(grow, Math.max(moved, at(mins, a)));

  if (sizes[b] === 0 && moved < 0) moved = Math.max(-shrink, Math.min(moved, -at(mins, b)));

  return sizes.map((size, i) => (i === a ? size + moved : i === b ? size - moved : size));
}

/**
 * Moves `amount` into pane `index` (out of it when negative) from the other panes, nearest first (of
 * two at the same distance, the one before), each by no more than `room(i)`.
 * @param {number[]} sizes
 * @param {number} index
 * @param {number} amount
 * @param {(i: number) => number} room
 * @returns {{ next: number[], left: number }} The new sizes and what could not move.
 */
function pour(sizes, index, amount, room) {
  const next = [...sizes];
  const sign = Math.sign(amount);
  let left = Math.abs(amount);

  const order = sizes
    .map((_, i) => i)
    .filter((i) => i !== index)
    .toSorted((x, y) => Math.abs(x - index) - Math.abs(y - index) || x - y);

  for (const i of order) {
    const moved = Math.min(left, Math.max(0, room(i)));

    next[i] = at(next, i) - moved * sign;
    next[index] = at(next, index) + moved * sign;
    left -= moved;
  }

  return { next, left };
}

/**
 * Collapses pane `index` to 0. The open panes take its space, nearest first (the one before it
 * first), each up to its maximum. When they cannot take all of it, nothing changes.
 * @param {number[]} sizes
 * @param {number} index
 * @param {...number[]} limits The minimum sizes (a collapsed pane may go below its own), then the maximum sizes.
 * @returns {{ sizes: number[], restore: number }} The new sizes and the size to restore (0 when nothing changed).
 */
export function collapse(sizes, index, ...limits) {
  const maxes = limits[1] ?? [];
  const { next, left } = pour(sizes, index, -at(sizes, index), (i) => (at(sizes, i) > 0 ? (maxes[i] ?? 100) - at(sizes, i) : 0));

  if (left > 1e-9 || !sizes[index]) return { sizes: [...sizes], restore: 0 };

  return { sizes: next.map((size, i) => (i === index ? 0 : size)), restore: at(sizes, index) };
}

/**
 * Gives pane `index` its `restore` size back (within its maximum), taken from the other panes,
 * nearest first, each down to its minimum.
 * @param {number[]} sizes
 * @param {number} index
 * @param {number} restore
 * @param {...number[]} limits The minimum sizes, then the maximum sizes.
 * @returns {number[]}
 */
export function expand(sizes, index, restore, ...limits) {
  const [mins = [], maxes = []] = limits;

  return pour(sizes, index, within(restore, 0, at(maxes, index)) - at(sizes, index), (i) => at(sizes, i) - at(mins, i)).next;
}
