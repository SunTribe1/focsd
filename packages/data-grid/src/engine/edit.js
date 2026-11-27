/**
 * Cell editing: parse and validate user input for a column, and apply an edit immutably.
 */
import { getType, isEmpty } from './types.js';

/**
 * @param {unknown} input Typed text, or the option value itself (enum and boolean editors).
 * @param {import('./model.js').Column} column
 * @param {import('./model.js').Row} row
 * @param {string} [locale]
 * @returns {import('./model.js').EditResult}
 */
export function validateEdit(input, column, row, locale) {
  const parsed = getType(column.type).parse(input, column, locale);

  if ('error' in parsed) return parsed;
  const { value } = parsed;
  const blank = isEmpty(value) || (typeof value === 'string' && value.trim() === '');

  if (blank) return column.required ? { error: 'Enter a value.', code: 'enterValue' } : { value: null };

  if (column.type === 'number') {
    if (column.min != null && /** @type {number} */ (value) < column.min)
      return { error: `Enter ${column.min} or more.`, code: 'numberMin', args: [column.min] };

    if (column.max != null && /** @type {number} */ (value) > column.max)
      return { error: `Enter ${column.max} or less.`, code: 'numberMax', args: [column.max] };
  }

  if (column.type === 'enum' && !(column.options ?? []).some((o) => o.value === value))
    return { error: 'Choose one of the options.', code: 'chooseOneOption' };
  const custom = column.validate?.(value, row);

  return custom ? { error: custom } : { value };
}

/**
 * Return a new rows array where the row with `rowId` has `value` set for `column`.
 * Computed columns (valueGetter) need a `valueSetter(row, value)` returning the new row.
 * @param {import('./model.js').Row[]} rows
 * @param {unknown} rowId
 * @param {(row: import('./model.js').Row) => unknown} getRowId
 * @param {import('./model.js').Column} column
 * @param {unknown} value
 * @returns {import('./model.js').Row[]}
 */
export function applyEdit(rows, rowId, getRowId, column, value) {
  if (column.valueGetter && !column.valueSetter) {
    throw new Error(`Column "${column.id}" is computed; give it a valueSetter(row, value) to make it editable.`);
  }

  return rows.map((row) => {
    if (getRowId(row) !== rowId) return row;

    return column.valueSetter ? column.valueSetter(row, value) : { ...row, [column.field]: value };
  });
}
