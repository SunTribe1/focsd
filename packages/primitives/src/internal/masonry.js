/**
 * Masonry placement for the fallback layout (browsers without CSS masonry). `dom` keeps the
 * reading order: item n goes to column n mod columns, under the item above it. `balanced` puts
 * each item in the shortest column, which packs tighter but can separate visual and focus order.
 * @param {number[]} heights Item heights in px, in DOM order.
 * @param {number} columns
 * @param {number} gap px between items, both ways.
 * @param {'dom' | 'balanced'} order
 * @returns {{ items: Array<{ column: number, top: number }>, height: number }}
 */
export function place(heights, columns, gap, order = 'dom') {
  const count = Math.max(1, Math.floor(columns));
  const bottoms = Array.from({ length: count }, () => 0);

  const items = heights.map((height, i) => {
    const column = order === 'balanced' ? bottoms.indexOf(Math.min(...bottoms)) : i % count;
    const top = /** @type {number} */ (bottoms[column]);
    bottoms[column] = top + height + gap;

    return { column, top };
  });

  const height = items.length ? Math.max(...bottoms) - gap : 0;

  return { items, height };
}
