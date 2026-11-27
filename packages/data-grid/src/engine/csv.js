/**
 * CSV export (RFC 4180). Formatted values by default, raw with `raw: true`. Text that a
 * spreadsheet would run as a formula (=, +, -, @, tab, CR) is prefixed with an apostrophe.
 */
import { cellValue } from './columns.js';
import { getType, isEmpty } from './types.js';

const FORMULA = /^[=+\-@\t\r]/;

/** @param {string} text */
function escapeCell(text) {
  return /[",\r\n]|^\s|\s$/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * @param {Record<string, unknown>[]} rows data rows (already filtered and sorted)
 * @param {import('./model.js').Column[]} columns columns to export, in order
 * @param {{ locale?: string, raw?: boolean }} [options]
 */
export function toCsv(rows, columns, { locale, raw = false } = {}) {
  const header = columns.map((c) => escapeCell(String(c.header)));

  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const value = cellValue(row, c);

        if (isEmpty(value)) return '';
        const text = raw ? String(value) : getType(c.type).format(value, c, locale);

        return escapeCell(typeof value === 'string' && FORMULA.test(text) ? `'${text}` : text);
      })
      .join(','),
  );

  return [header.join(','), ...lines].join('\r\n');
}
