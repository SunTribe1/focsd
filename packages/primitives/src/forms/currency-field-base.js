import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdTextFieldBase } from '../text-field/text-field-base.js';
import { uid } from '../internal/id.js';
import { affix, formatAmount, minorUnits, parseAmount, toValue } from '../internal/currency.js';
import { finiteOrUndefined } from '../internal/number.js';

/**
 * Currency field: an APG spinbutton for money. While editing it shows a plain number in the page
 * language (`1234,50` in German) with the currency beside it; on blur it formats the amount
 * (`1.234,50 €`). The value is always a dot-decimal string with the currency's decimals
 * (`"1234.50"`, `"100"` for yen), so servers never parse local formats.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change.
 * @csspart label - The label.
 * @csspart field - The box around the input and the currency.
 * @csspart prefix - The currency before the number (while editing).
 * @csspart suffix - The currency after the number (while editing).
 * @csspart control - The input.
 * @csspart layout - The box around the label and the body; `data-position` is the label position.
 * @csspart body - The field and its messages.
 * @csspart hint - The hint.
 * @csspart message - The shown message; also `error`, `warning` or `success` for its kind.
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The visually hidden status region that announces a new message.
 */
export class FocsdCurrencyFieldBase extends FocsdTextFieldBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    currency: { reflect: true },
    currencyDisplay: { attribute: 'currency-display' },
    min: {},
    max: {},
    step: {},
    allowNegative: { type: Boolean, attribute: 'allow-negative' },
    _text: { state: true },
    _focused: { state: true },
  };

  #ids = { currency: uid('focsd-currency-name') };
  /** @type {string | null} */
  #own = null;
  #bad = false;

  constructor() {
    super();
    /** The ISO 4217 currency code, such as `USD`. */
    this.currency = 'USD';
    /** @type {'symbol' | 'narrowSymbol' | 'code' | 'name'} How the currency is shown, as in `Intl.NumberFormat`. */
    this.currencyDisplay = 'symbol';
    /** @type {string | number | undefined} The smallest amount allowed. */
    this.min = undefined;
    /** @type {string | number | undefined} The largest amount allowed. */
    this.max = undefined;
    /** @type {string | number | undefined} The amount the arrow keys add or subtract. */
    this.step = undefined;
    /** Accepts negative amounts. */
    this.allowNegative = false;
    this._text = '';
    this._focused = false;
  }

  /** The locale for amounts: `setLocale()`, else the nearest `lang`, else English. */
  get #lang() {
    return this.localize.locale() || this.localize.lang();
  }

  /** The amount as a number, or null when empty or not an amount. */
  get valueAsNumber() {
    return this.value === '' || this.value === null || this.value === undefined ? Number.NaN : Number(this.value);
  }

  set valueAsNumber(n) {
    this.value = Number.isFinite(n) ? toValue(n, this.currency) : '';
  }

  get #amount() {
    const n = this.valueAsNumber;

    return Number.isFinite(n) ? n : null;
  }

  get #step() {
    return finiteOrUndefined(this.step) ?? 10 ** -minorUnits(this.currency);
  }

  get #min() {
    return finiteOrUndefined(this.min) ?? (this.allowNegative ? undefined : 0);
  }

  get #max() {
    return finiteOrUndefined(this.max);
  }

  /**
   * @param {number} n
   * @param {boolean} [symbol]
   */
  #format(n, symbol = true) {
    return formatAmount(n, { locale: this.#lang, currency: this.currency, display: this.currencyDisplay, grouping: symbol, symbol });
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if ((changed.has('value') && this.value !== this.#own) || changed.has('currency')) {
      const raw = String(this.value ?? '').trim();
      const n = raw === '' ? null : Number(raw);
      this.#bad = n !== null && !Number.isFinite(n);
      const next = n === null || this.#bad ? raw : toValue(n, this.currency);
      this.#own = next;
      this.value = next;
      this._text = n === null || this.#bad ? raw : this.#format(n, false);
    }
  }

  /** The text shown in the input: plain while editing, formatted otherwise (unless it is not an amount). */
  get #display() {
    if (this._focused || this.#bad) return this._text;
    const n = this.#amount;

    return n === null ? '' : this.#format(n);
  }

  /** @param {string} text */
  #setFromText(text) {
    this._text = text;
    const n = parseAmount(text, this.#lang, this.currency);
    this.#bad = text.trim() !== '' && n === null;
    const next = n === null ? '' : toValue(n, this.currency);

    if (next === this.value) return false;
    this.#own = next;
    this.value = next;

    return true;
  }

  /** @param {Event} event */
  #onInput = (event) => {
    event.stopPropagation();

    if (this.#setFromText(/** @type {HTMLInputElement} */ (event.target).value)) this.emitValue(false);
  };

  /** @param {number} n */
  #setAmount(n) {
    let next = n;

    if (this.#min !== undefined) next = Math.max(this.#min, next);

    if (this.#max !== undefined) next = Math.min(this.#max, next);
    const value = toValue(next, this.currency);
    this._text = this.#format(Number(value), false);
    this.#bad = false;

    if (value === this.value) return;
    this.#own = value;
    this.value = value;
    this.emitValue(true);
  }

  /**
   * @param {KeyboardEvent} event
   * @param {import('../text-field/text-field-base.js').ControlContext} ctx
   */
  #onKey = (event, ctx) => {
    const step = this.#step;
    const base = this.#amount ?? this.#min ?? 0;

    /** @type {Record<string, number | undefined>} */
    const targets = {
      ArrowUp: base + step,
      ArrowDown: base - step,
      PageUp: base + step * 10,
      PageDown: base - step * 10,
      Home: this.#min,
      End: this.#max,
    };

    // Home and End without a bound, and every other key, keep their text-editing meaning.
    const target = this.isDisabled || this.readOnly ? undefined : targets[event.key];

    if (target === undefined) ctx.onKeyDown(event);
    else {
      this.#setAmount(target);
      event.preventDefault();
    }
  };

  /** @param {FocusEvent} event */
  #onFocus = (event) => {
    const n = this.#amount;

    if (n !== null && !this.#bad) this._text = this.#format(n, false);
    this._focused = true;
    // Swap the text now, not in the next render: a later swap would undo the selection a click or
    // Tab just made, and typing would append instead of replacing.
    const input = /** @type {HTMLInputElement} */ (event.target);

    if (input.value !== this._text) {
      input.value = this._text;
      input.select();
    }
  };

  #onBlur = () => {
    this._focused = false;
  };

  /**
   * Replace text like the native method, on the plain number the person edits (`1234.50`, as
   * shown while focused) rather than the formatted amount shown on blur. Updates `value` without
   * firing `input`.
   * @param {string} replacement
   * @param {number} [start]
   * @param {number} [end]
   * @param {SelectionMode} [selectMode]
   * @override
   */
  setRangeText(replacement, start, end, selectMode) {
    const input = /** @type {HTMLInputElement | null} */ (this.renderRoot?.querySelector('[part~="control"]'));

    if (!input) return;

    if (input.value !== this._text) input.value = this._text;

    if (start === undefined) input.setRangeText(replacement);
    else input.setRangeText(replacement, start, /** @type {number} */ (end), selectMode);
    this.#setFromText(input.value);
    // Unfocused, the next render puts the formatted amount back.
    this.requestUpdate();
  }

  /** @override @returns {import('../text-field/text-field-base.js').ValidityResult} */
  computeValidity() {
    const n = this.#amount;
    /** @type {(k: string, ...a: unknown[]) => string} */
    const t = (k, ...a) => this.localize.term(k, ...a);

    if (this.#bad) return [{ badInput: true }, t('enterAmount')];

    if (n === null) return this.required ? [{ valueMissing: true }, t('enterAmount')] : [{}, ''];

    if (this.#min !== undefined && n < this.#min) return [{ rangeUnderflow: true }, t('amountMin', this.#format(this.#min))];

    if (this.#max !== undefined && n > this.#max) return [{ rangeOverflow: true }, t('amountMax', this.#format(this.#max))];

    return [{}, ''];
  }

  /** @override */
  formResetCallback() {
    this.#bad = false;
    super.formResetCallback();
    // Junk text never changed the value, so the reset may not change it either: redraw regardless.
    const n = this.#amount;
    this._text = n === null ? '' : this.#format(n, false);
    this.requestUpdate();
  }

  #currencyName() {
    try {
      const name = new Intl.DisplayNames([this.#lang, 'en'], { type: 'currency' }).of(this.currency);

      return `${name} (${this.currency})`;
    } catch {
      return this.currency;
    }
  }

  /** @override @returns {string[]} */
  extraDescribedBy() {
    return [this.#ids.currency];
  }

  /** @override */
  renderExtra() {
    return html`<span id=${this.#ids.currency} class="focsd-visually-hidden">${this.#currencyName()}</span>`;
  }

  /** @override @param {import('../text-field/text-field-base.js').ControlContext} ctx */
  renderControl(ctx) {
    const n = this.#amount;
    const { prefix, suffix } = affix(this.#lang, this.currency, this.currencyDisplay);
    const editing = this._focused || this.#bad;

    /* eslint-disable lit-a11y/accessible-name -- named by <label for> in the same shadow root */
    return html`<div part="field">
      ${editing && prefix.trim() ? html`<span part="prefix" aria-hidden="true">${prefix.trim()}</span>` : nothing}
      <input
        part="control"
        id=${ctx.id}
        type="text"
        inputmode="decimal"
        role="spinbutton"
        autocomplete="off"
        .value=${live(this.#display)}
        aria-valuenow=${n ?? nothing}
        aria-valuetext=${n === null ? nothing : this.#format(n)}
        aria-valuemin=${this.#min ?? nothing}
        aria-valuemax=${this.#max ?? nothing}
        ?required=${this.required}
        ?disabled=${this.isDisabled}
        ?readonly=${this.readOnly}
        placeholder=${this.placeholder || nothing}
        aria-describedby=${ctx.describedBy || nothing}
        @input=${this.#onInput}
        @change=${ctx.onChange}
        @focus=${this.#onFocus}
        @blur=${this.#onBlur}
        @keydown=${(/** @type {KeyboardEvent} */ event) => this.#onKey(event, ctx)}
      />
      ${editing && suffix.trim() ? html`<span part="suffix" aria-hidden="true">${suffix.trim()}</span>` : nothing}
    </div>`;
    /* eslint-enable lit-a11y/accessible-name */
  }
}
