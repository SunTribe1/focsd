// `sortTableRows`, not `sortRows`: the data grid's `sortRows` takes a sort model (types M1).
const collator = new Intl.Collator(undefined, { numeric: true });

/** @typedef {'ascending' | 'descending' | 'none'} SortDirection */

/**
 * Stable sort of rows by `key`; numbers numerically, everything else with a shared numeric collator.
 * @template {Record<string, unknown>} T
 * @param {T[]} rows
 * @param {string | null | undefined} key
 * @param {SortDirection} direction
 * @returns {T[]}
 */
export function sortTableRows(rows, key, direction) {
  if (!key || direction === 'none') return rows;
  const factor = direction === 'descending' ? -1 : 1;

  return rows
    .map((row, index) => ({ row, index }))
    .toSorted((a, b) => {
      const x = a.row[key];
      const y = b.row[key];
      const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x ?? ''), String(y ?? ''));

      return cmp * factor || a.index - b.index;
    })
    .map(({ row }) => row);
}

/**
 * Next sort direction when a header is activated.
 * @param {string | null | undefined} currentKey
 * @param {string} key
 * @param {SortDirection} direction
 * @returns {'ascending' | 'descending'}
 */
export const nextDirection = (currentKey, key, direction) =>
  currentKey !== key || direction === 'descending' ? 'ascending' : 'descending';
