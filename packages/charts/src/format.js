import { warnOnce } from '@focsd-dev/primitives/internal';

/**
 * An `Intl.NumberFormat` for `locale` and `options` that never throws: options or a locale Intl
 * rejects (`{ style: 'currency' }` without a currency) warn once and fall back to plain numbers.
 * Shared by the chart, the sparkline and the gauge, so one mistyped option never takes an element down.
 * @param {string | undefined} locale
 * @param {Intl.NumberFormatOptions | undefined} options
 * @param {string} [tag] The element named in the warning.
 * @returns {Intl.NumberFormat}
 */
export function numberFormat(locale, options, tag = 'focsd-chart') {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch (error) {
    warnOnce(
      `chart-format:${locale}|${JSON.stringify(options ?? {})}`,
      `${tag} invalid format (${/** @type {Error} */ (error).message}); using plain numbers.`,
    );

    try {
      return new Intl.NumberFormat(locale);
    } catch {
      return new Intl.NumberFormat();
    }
  }
}
