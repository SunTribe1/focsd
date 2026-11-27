/**
 * Windowing maths for virtual lists: which rows to render for a scroll position, where each row
 * starts, and where to scroll to show a row. Row heights are fixed (`itemHeight`) or measured, with
 * `estimate` used until a row is measured. Offsets are kept in a Fenwick tree, so every query is
 * O(log n) even for a million rows of different heights. No DOM, no Lit.
 */
export class ViewportWindow {
  #count = 0;
  #heights = new Float64Array(0);
  #tree = new Float64Array(1);
  #fallback;

  /**
   * @param {{ count?: number, itemHeight?: number, estimate?: number, overscan?: number }} [options]
   */
  constructor({ count = 0, itemHeight, estimate = 40, overscan = 5 } = {}) {
    this.itemHeight = itemHeight;
    this.estimate = estimate;
    this.overscan = overscan;
    this.#fallback = itemHeight ?? estimate;
    this.setCount(count);
  }

  get count() {
    return this.#count;
  }

  /**
   * Change the number of rows; rows that stay keep their measured heights.
   * @param {number} count
   */
  setCount(count) {
    const next = new Float64Array(Math.max(0, count)).fill(this.itemHeight ?? this.#fallback);

    if (this.itemHeight === undefined) next.set(this.#heights.subarray(0, Math.min(count, this.#count)));
    this.#count = Math.max(0, count);
    this.#heights = next;
    this.#build();
  }

  /** Build the tree in O(n). */
  #build() {
    const n = this.#count;
    const tree = new Float64Array(n + 1);

    for (let i = 1; i <= n; i += 1) {
      tree[i] = /** @type {number} */ (tree[i]) + /** @type {number} */ (this.#heights[i - 1]);
      const parent = i + (i & -i);

      if (parent <= n) tree[parent] = /** @type {number} */ (tree[parent]) + /** @type {number} */ (tree[i]);
    }

    this.#tree = tree;
  }

  /**
   * @param {number} index
   * @param {number} delta
   */
  #add(index, delta) {
    for (let i = index + 1; i <= this.#count; i += i & -i) this.#tree[i] = /** @type {number} */ (this.#tree[i]) + delta;
  }

  /**
   * Sum of the heights of rows before `index`.
   * @param {number} index
   * @returns {number}
   */
  #prefix(index) {
    let sum = 0;

    for (let i = Math.min(index, this.#count); i > 0; i -= i & -i) sum += /** @type {number} */ (this.#tree[i]);

    return sum;
  }

  /**
   * Record a row's rendered height. Returns how much it grew (negative when it shrank).
   * @param {number} index
   * @param {number} height
   * @returns {number}
   */
  measure(index, height) {
    if (index < 0 || index >= this.#count || this.itemHeight !== undefined) return 0;
    const delta = height - /** @type {number} */ (this.#heights[index]);

    if (!delta) return 0;
    this.#heights[index] = height;
    this.#add(index, delta);

    return delta;
  }

  /**
   * Where row `index` starts.
   * @param {number} index
   * @returns {number}
   */
  offsetOf(index) {
    return this.#prefix(index);
  }

  /**
   * @param {number} index
   * @returns {number}
   */
  heightOf(index) {
    return this.#heights[index] ?? this.#fallback;
  }

  get total() {
    return this.#prefix(this.#count);
  }

  /**
   * The row at scroll position `y` (the last row when past the end).
   * @param {number} y
   * @returns {number}
   */
  indexAt(y) {
    if (this.#count === 0) return 0;
    let pos = 0;
    let remaining = y;
    let step = 1;

    while (step * 2 <= this.#count) step *= 2;

    for (; step > 0; step >>= 1) {
      const next = pos + step;

      const size = /** @type {number} */ (this.#tree[next]);

      if (next <= this.#count && size <= remaining) {
        pos = next;
        remaining -= size;
      }
    }

    return Math.min(pos, this.#count - 1);
  }

  /**
   * Rows to render for a scroll position and viewport height, with overscan on both sides.
   * @param {number} scrollTop
   * @param {number} viewportHeight
   * @returns {{ first: number, last: number, offset: number, total: number }}
   */
  range(scrollTop, viewportHeight) {
    const total = this.total;

    if (this.#count === 0) return { first: 0, last: -1, offset: 0, total: 0 };
    const top = Math.max(0, Math.min(scrollTop, total));
    const start = this.indexAt(top);
    const end = this.indexAt(Math.max(top, top + viewportHeight - 1));
    const first = Math.max(0, start - this.overscan);
    const last = Math.min(this.#count - 1, end + this.overscan);

    return { first, last, offset: this.offsetOf(first), total };
  }

  /**
   * The scroll position that shows row `index` with the given alignment.
   * @param {number} index
   * @param {number} viewportHeight
   * @param {'start' | 'center' | 'end' | 'nearest'} [align]
   * @param {number} [current]
   * @returns {number}
   */
  scrollTopFor(index, viewportHeight, align = 'nearest', current = 0) {
    const i = Math.max(0, Math.min(index, this.#count - 1));
    const top = this.offsetOf(i);
    const bottom = top + this.heightOf(i);
    const max = Math.max(0, this.total - viewportHeight);
    let target;

    if (align === 'start') target = top;
    else if (align === 'end') target = bottom - viewportHeight;
    else if (align === 'center') target = top + (bottom - top) / 2 - viewportHeight / 2;
    else if (top < current) target = top;
    else if (bottom > current + viewportHeight) target = bottom - viewportHeight;
    else target = current;

    return Math.max(0, Math.min(max, target));
  }
}
