/**
 * Index of the next enabled item (after `current`, wrapping) whose label starts with `char`.
 * @param {string[]} labels
 * @param {number} current
 * @param {string} char
 * @param {(index: number) => boolean} isDisabled
 */
export function typeaheadIndex(labels, current, char, isDisabled) {
  const needle = char.toLocaleLowerCase();
  const count = labels.length;

  for (let step = 1; step <= count; step += 1) {
    const candidate = (current + step) % count;

    if (!isDisabled(candidate) && /** @type {string} */ (labels[candidate]).trim().toLocaleLowerCase().startsWith(needle)) return candidate;
  }

  return -1;
}
