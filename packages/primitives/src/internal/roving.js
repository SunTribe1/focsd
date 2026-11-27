/**
 * Index of the next enabled item when moving by `delta` (+1 / -1), wrapping around.
 * Returns `current` when no other item is enabled, and -1 for an empty list.
 * @param {number} current
 * @param {1 | -1} delta
 * @param {number} count
 * @param {(index: number) => boolean} isDisabled
 */
export function nextIndex(current, delta, count, isDisabled) {
  if (count === 0) return -1;

  for (let step = 1; step <= count; step += 1) {
    const candidate = (((current + delta * step) % count) + count) % count;

    if (!isDisabled(candidate)) return candidate;
  }

  return current;
}

/**
 * First or last enabled index, or -1 when every item is disabled.
 * @param {'first' | 'last'} edge
 * @param {number} count
 * @param {(index: number) => boolean} isDisabled
 */
export function edgeIndex(edge, count, isDisabled) {
  for (let i = 0; i < count; i += 1) {
    const candidate = edge === 'first' ? i : count - 1 - i;

    if (!isDisabled(candidate)) return candidate;
  }

  return -1;
}
