// File helpers shared by focsd-file-upload and apps (`@focsd/primitives/utils`).
import { getLocale } from './locale.js';

/**
 * Human-readable size in decimal units (1 kB = 1,000 bytes), with the number and the unit in the
 * locale's words and symbols ("5 bytes", "1.5 kB", "1,5 ko"), from `Intl`. The locale defaults to
 * the one set with `setLocale()`, else the runtime's.
 * @param {number} bytes
 * @param {string} [locale] A BCP 47 tag, such as an element's formatting locale.
 * @returns {string}
 */
export const formatBytes = (bytes, locale = getLocale() ?? undefined) => {
  const [unit, size] = bytes < 1000 ? ['byte', bytes] : bytes < 1_000_000 ? ['kilobyte', bytes / 1000] : ['megabyte', bytes / 1_000_000];

  // Bytes in words ("5 bytes"; the short form reads "5 byte" in English), larger sizes as symbols.
  const unitDisplay = unit === 'byte' ? 'long' : 'short';

  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay, maximumFractionDigits: 1 }).format(size);
};

/**
 * True when `file` matches an `accept` list such as `.pdf,image/*,image/png`.
 * @param {string | null | undefined} accept
 * @param {File} file
 * @returns {boolean}
 */
export const acceptsFile = (accept, file) => {
  const tokens = (accept ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (!tokens.length) return true;
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();

  return tokens.some((t) => (t.startsWith('.') ? name.endsWith(t) : t.endsWith('/*') ? type.startsWith(t.slice(0, -1)) : type === t));
};
