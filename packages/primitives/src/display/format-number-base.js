import { html } from 'lit';
import { formatNumber } from '../internal/format-number.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { warnOnce } from '../internal/warn.js';

/** The `value` attribute as a number; an empty (or removed) attribute is NaN, not 0, so it renders nothing. */
const numberOrNaN = { fromAttribute: (/** @type {string | null} */ value) => (value?.trim() ? Number(value) : Number.NaN) };

/**
 * Format number: shows a number as text for the reader's locale (decimal, currency, percent, unit or bytes),
 * in a `<data>` element whose `value` is the raw number. Without `locale` it follows the nearest `lang`.
 * A value that is not a number (or options `Intl` rejects, such as an unknown currency) renders an empty
 * `<data>` and warns once in the console.
 *
 * @csspart data - The `<data>` element holding the formatted text.
 */
export class FocsdFormatNumberBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: { converter: numberOrNaN },
    type: {},
    currency: {},
    unit: {},
    notation: {},
    minimumFractionDigits: { type: Number, attribute: 'minimum-fraction-digits' },
    maximumFractionDigits: { type: Number, attribute: 'maximum-fraction-digits' },
    locale: {},
    binary: { type: Boolean },
  };

  constructor() {
    super();
    /** The number to show. An empty `value` attribute (or empty string) shows nothing, not 0. */
    this.value = 0;
    /** @type {'decimal' | 'currency' | 'percent' | 'unit' | 'bytes'} How to format the number. */
    this.type = 'decimal';
    /** The ISO 4217 currency code, such as `USD`, for `type="currency"`. */
    this.currency = '';
    /** The unit, such as `kilometer`, for `type="unit"`. */
    this.unit = '';
    /** @type {'standard' | 'scientific' | 'engineering' | 'compact'} The notation. */
    this.notation = 'standard';
    /** @type {number | undefined} The fewest fraction digits to show. */
    this.minimumFractionDigits = undefined;
    /** @type {number | undefined} The most fraction digits to show. */
    this.maximumFractionDigits = undefined;
    /** A BCP 47 locale tag; defaults to the page's language. */
    this.locale = '';
    /** Uses binary units (KiB, MiB) for `type="bytes"`. */
    this.binary = false;
  }

  /**
   * The value as a number, or NaN when it is not one. A property set from script may be a string ('99');
   * an empty string, null or undefined is not zero.
   */
  #number() {
    const text = String(this.value).trim();

    return text === '' ? Number.NaN : Number(text);
  }

  /**
   * @param {number} value
   * @returns {string}
   */
  #format(value) {
    try {
      return formatNumber(value, {
        type: this.type,
        currency: this.currency,
        unit: this.unit,
        notation: this.notation,
        minimumFractionDigits: this.minimumFractionDigits,
        maximumFractionDigits: this.maximumFractionDigits,
        locale: this.locale || this.localize.locale(),
        binary: this.binary,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      warnOnce(`format-number:${reason}`, `focsd-format-number could not format the value: ${reason}`);

      return '';
    }
  }

  /** @override */
  render() {
    const value = this.#number();

    if (Number.isNaN(value)) {
      warnOnce('format-number:not-a-number', '<focsd-format-number> `value` is not a number; nothing is shown.');

      return html`<data part="data"></data>`;
    }

    return html`<data part="data" value=${value}>${this.#format(value)}</data>`;
  }
}
