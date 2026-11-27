// cspell:ignore nukta virama
import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { onFocusLeave } from '../internal/popup.js';
import { stepIndex } from '../internal/options.js';
import { edgeIndex } from '../internal/roving.js';
import { fold } from '../internal/text.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { countriesByName, countryName, countryOf, flag, formatNational, isValidPhone, parsePhone, regionOf } from '../internal/phone.js';

/** @typedef {import('../internal/phone.js').NamedCountry} ListedCountry */

/** Every listed country can be chosen. */
const noneDisabled = () => false;

/** Marks outside ASCII that the shared fold keeps (Devanagari nukta and virama, Thai tone marks…). */
const OTHER_MARKS = /(?!\p{ASCII})\p{Diacritic}/gu;

/**
 * Country search is looser than list filtering elsewhere: every non-ASCII diacritic is ignored, so
 * "फरांस" finds "फ़्रांस" as it did before the shared fold.
 * @param {string} text
 */
const foldName = (text) => fold(text).replaceAll(OTHER_MARKS, '');

/**
 * `detail` of `focsd-country-change`: the new country's ISO 3166-1 alpha-2 code.
 * @typedef {{ country: string }} CountryChangeDetail
 */

/**
 * Phone field: a searchable country combobox and a `type=tel` input in one labeled group. The
 * value is E.164 (`+442071838750`). Typing or pasting a number with `+` or `00` switches the
 * country. Validation checks the length for the country; pass `validator` for stricter rules.
 *
 * @fires input - Fired when the number or the country changes.
 * @fires change - Fired when the person commits a change.
 * @fires {CustomEvent<CountryChangeDetail>} focsd-country-change - Fired when the country changes; `detail.country` is its code.
 * @csspart label - The label.
 * @csspart layout - The label and the body (see label position).
 * @csspart body - The field with its example, hint and message.
 * @csspart hint - The author hint.
 * @csspart message - The shown error, warning or success message.
 * @csspart message-icon - The icon of the message.
 * @csspart field - The group holding both inputs.
 * @csspart flag - The flag of the chosen country.
 * @csspart country - The country combobox.
 * @csspart popup - The country list popup.
 * @csspart listbox - The country list.
 * @csspart option - One country.
 * @csspart control - The number input.
 * @csspart example - The example number.
 * @csspart status - The live status (visually hidden).
 * @csspart announcer - The visually hidden status region that announces a new message.
 */
export class FocsdPhoneFieldBase extends FormControlMixin(FocsdElement) {
  static supportsReadOnly = true;

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    country: { reflect: true },
    defaultCountry: { attribute: 'default-country' },
    countries: {},
    preferred: {},
    validator: { attribute: false },
    _text: { state: true },
    _query: { state: true },
    _open: { state: true },
    _active: { state: true },
    _status: { state: true },
  };

  /** For subclasses: the IDs of the parts in the shadow root. */
  ids = {
    label: uid('focsd-phone-label'),
    tel: uid('focsd-phone-tel'),
    example: uid('focsd-phone-example'),
    listbox: uid('focsd-phone-list'),
  };

  /** @type {string | null} */
  #own = null;
  #initial = '';

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The number in E.164 form, such as `+442071838750`. */
    this.value = '';
    /** The ISO 3166-1 alpha-2 code of the chosen country, such as `GB`. */
    this.country = '';
    /** The country chosen when there is no value; defaults to the one for the page's language. */
    this.defaultCountry = '';
    /** Comma-separated ISO codes of the countries listed; empty lists every country. */
    this.countries = '';
    /** Comma-separated ISO codes of countries listed first. */
    this.preferred = '';
    /**
     * Custom check: return true/null/undefined when valid, a message string, or false.
     * @type {((e164: string, country: string) => boolean | string | null | undefined) | undefined}
     */
    this.validator = undefined;
    this._text = '';
    /** @type {string | null} */
    this._query = null;
    this._open = false;
    this._active = -1;
    this._status = '';
    onFocusLeave(this, () => this.#closeList());
  }

  /** @returns {string} */
  get #lang() {
    return this.localize.lang?.() ?? globalThis.document?.documentElement?.lang ?? 'en';
  }

  #startCountry() {
    const candidates = [this.country, this.defaultCountry, regionOf(this.#lang), 'US'];

    return candidates.map((c) => countryOf(c)).find(Boolean)?.code ?? 'US';
  }

  /**
   * The group holding both inputs (the group is the target).
   * @returns {HTMLElement | undefined}
   */
  get ariaTarget() {
    return /** @type {HTMLElement | undefined} */ (this.renderRoot?.querySelector?.('[part~="field"]') ?? undefined);
  }

  /** The number is what an error is about, so only the tel input is marked invalid (not the country). */
  get invalidTargets() {
    const tel = /** @type {HTMLElement | null | undefined} */ (this.renderRoot?.querySelector?.('[part~="control"]'));

    return tel ? [tel] : [];
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (!this.hasUpdated) {
      this.country = this.#startCountry();
      this.#initial = this.country;
    }

    if (changed.has('value') && this.value !== this.#own) {
      const parsed = this.value ? parsePhone(this.value, this.country) : null;

      if (parsed) {
        this.country = parsed.country;
        this._text = formatNational(parsed.national, parsed.country);
        this.#own = parsed.e164;
        this.value = parsed.e164;
      } else {
        this._text = this.value ?? '';
        this.#own = this.value;
      }
    }
  }

  /**
   * Countries in list order: allow-list applied, preferred first, then by name in the page language.
   * @returns {ListedCountry[]}
   */
  get countryList() {
    const allow = new Set(
      String(this.countries ?? '')
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean),
    );

    const preferred = String(this.preferred ?? '')
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);

    // Names and their order come from a per-locale cache: typing a search only filters.
    const all = countriesByName(this.#lang).filter((c) => !allow.size || allow.has(c.code));
    const first = /** @type {ListedCountry[]} */ (preferred.map((code) => all.find((c) => c.code === code)).filter(Boolean));
    const rest = all.filter((c) => !preferred.includes(c.code));

    return [...first, ...rest];
  }

  get #filtered() {
    const list = this.countryList;

    if (!this._query) return list;
    const q = foldName(this._query.trim());
    const digits = q.replace(/^\+/, '');

    return list.filter(
      (c) => foldName(c.name).includes(q) || c.code.toLowerCase() === q || (/^\d+$/.test(digits) && c.dial.startsWith(digits)),
    );
  }

  /**
   * The country box shows the compact ISO code and dial code (`US +1`); the full name is its description (the `title`, which also shows on hover).
   * @param {string} code
   */
  #display(code) {
    const c = countryOf(code);

    return c ? `${c.code} +${c.dial}` : '';
  }

  /**
   * The full country name and dial code, read with the country box (`United States, +1`).
   * @param {string} code
   */
  #fullName(code) {
    const c = countryOf(code);

    return c ? `${countryName(c.code, this.#lang)}, +${c.dial}` : '';
  }

  get #parsed() {
    return this._text.trim() ? parsePhone(this._text, this.country) : null;
  }

  /** Recompute the value from the typed text; returns true when it changed. */
  #sync() {
    const parsed = this.#parsed;
    const next = parsed ? parsed.e164 : this._text.trim();

    if (next === this.value) return false;
    this.#own = next;
    this.value = next;

    return true;
  }

  /**
   * @param {string} code
   * @param {{ announce?: boolean }} [options]
   */
  #setCountry(code, { announce = false } = {}) {
    if (code === this.country) return;
    this.country = code;

    if (announce) this._status = this.localize.term('countryChanged', countryName(code, this.#lang));
    /** @type {CountryChangeDetail} */
    const detail = { country: code };

    this.dispatchEvent(new CustomEvent('focsd-country-change', { bubbles: true, detail }));
  }

  #onTelInput = (/** @type {Event} */ event) => {
    event.stopPropagation();

    if (this.readOnlyActive) return;
    this._text = /** @type {HTMLInputElement} */ (event.target).value;
    const parsed = this.#parsed;

    if (parsed && parsed.country !== this.country) this.#setCountry(parsed.country, { announce: true });

    if (this.#sync()) this.emitValue(false);
  };

  #onTelChange = () => {
    const parsed = this.#parsed;

    if (parsed) this._text = formatNational(parsed.national, parsed.country);
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** @param {string} code */
  #choose(code) {
    this.#closeList();

    if (this.readOnlyActive || this.isDisabled) return;

    if (code === this.country) return;
    this.#setCountry(code);

    if (this.#sync()) this.emitValue(true);
  }

  #closeList() {
    this._open = false;
    this._query = null;
    this._active = -1;
  }

  #onCountryInput = (/** @type {Event} */ event) => {
    event.stopPropagation();

    if (this.readOnlyActive) return;
    this._query = /** @type {HTMLInputElement} */ (event.target).value;
    this._open = true;
    this._active = -1;
  };

  #onCountryKey = (/** @type {KeyboardEvent} */ event) => {
    if (this.readOnlyActive) return;
    const list = this.#filtered;

    switch (event.key) {
      case 'ArrowDown':
        this._open = true;
        this._active = stepIndex(this._active, 1, list.length, noneDisabled);
        break;
      case 'ArrowUp':
        this._open = true;
        this._active = stepIndex(this._active, -1, list.length, noneDisabled);
        break;
      case 'Home':
      case 'End':
        if (!this._open) return;
        this._active = edgeIndex(event.key === 'Home' ? 'first' : 'last', list.length, noneDisabled);
        break;
      case 'Enter':
        if (!this._open) return;

        if (this._active >= 0 && list[this._active]) this.#choose(/** @type {ListedCountry} */ (list[this._active]).code);
        else if (list.length === 1) this.#choose(/** @type {ListedCountry} */ (list[0]).code);
        else return;
        break;
      case 'Escape':
        if (!this._open && this._query === null) return;
        this.#closeList();
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  /**
   * Check the number: missing (with `required`), rejected by `validator`, or not a valid number for the country. Returns null when it passes.
   * @returns {{ valueMissing?: boolean, badInput?: boolean, message?: string } | null}
   */
  checkPhone() {
    const parsed = this.#parsed;

    if (!this._text.trim()) return this.required ? { valueMissing: true } : null;

    if (typeof this.validator === 'function') {
      const verdict = this.validator(parsed?.e164 ?? this._text.trim(), this.country);

      if (verdict === true || verdict === undefined || verdict === null) return null;

      return { badInput: true, message: typeof verdict === 'string' ? verdict : undefined };
    }

    return parsed && isValidPhone(parsed) ? null : { badInput: true };
  }

  /** @override */
  updated() {
    // The saved state keeps the country: +1 alone cannot tell Canada from the United States.
    const state = new FormData();
    state.append('country', this.country);
    state.append('value', this.value);
    this.internals.setFormValue(this.value || null, this.value ? state : null);
    const tel = this.renderRoot.querySelector('[part~="control"]');
    const problem = this.checkPhone();

    if (!problem) this.setValidityState({});
    else if (problem.valueMissing) this.setValidityState({ valueMissing: true }, this.localize.term('enterPhone'), tel);
    else
      this.setValidityState(
        { badInput: true },
        problem.message ?? this.localize.term('enterValidPhone', countryName(this.country, this.#lang)),
        tel,
      );
    const popup = this.renderRoot.querySelector('[part~="popup"]');

    if (popup && this._open && !popup.matches(':popover-open')) /** @type {HTMLElement} */ (popup).showPopover();

    if (popup && !this._open && popup.matches(':popover-open')) /** @type {HTMLElement} */ (popup).hidePopover();

    if (this._open && this._active >= 0)
      /** @type {ShadowRoot} */ (this.renderRoot).getElementById?.(this.#optionId(this._active))?.scrollIntoView?.({ block: 'nearest' });
  }

  /** Re-run validation, for example after changing `validator`. */
  requestValidation() {
    this.requestUpdate();
  }

  formResetCallback() {
    this.#closeList();
    this._status = '';
    this.country = this.#initial;
    this.value = this.defaultValue;

    if (!this.value) this._text = '';
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    if (state instanceof FormData && state.has('value')) {
      // Country first, so a number sharing its dial code (+1) is read in the saved country.
      const code = countryOf(String(state.get('country') ?? ''))?.code;

      if (code) this.country = code;
      this.value = String(state.get('value'));

      return;
    }

    const text = restoredText(state);

    if (text !== null) this.value = text;
  }

  /** @param {number} i */
  #optionId(i) {
    return `${this.ids.listbox}-${i}`;
  }

  /* eslint-disable lit-a11y/click-events-have-key-events -- focus stays in the input (aria-activedescendant); keys are handled there */
  /**
   * @param {ListedCountry} c
   * @param {number} i
   */
  #renderOption(c, i) {
    return html`<div
      part="option ${i === this._active ? 'active' : ''}"
      id=${this.#optionId(i)}
      role="option"
      aria-selected=${String(c.code === this.country)}
      @pointerdown=${(/** @type {PointerEvent} */ e) => e.preventDefault()}
      @click=${() => this.#choose(c.code)}
    >
      <span aria-hidden="true" part="option-flag">${flag(c.code)}</span>
      <span part="option-name">${c.name}</span>
      <span part="option-dial">+${c.dial}</span>
    </div>`;
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */

  /** @override */
  render() {
    const ids = this.ids;
    const t = (/** @type {string} */ k, /** @type {unknown[]} */ ...a) => this.localize.term(k, ...a);
    const current = countryOf(this.country);
    const list = this._open ? this.#filtered : [];
    const expanded = this._open && list.length > 0;
    const example = current ? formatNational(current.example, current.code) : '';

    // Order: the author hint, the built-in example, then the shown message (R38).
    const ids3 = this.describedByIds();

    if (example) ids3.splice(this.hint ? 1 : 0, 0, ids.example);
    const describedBy = ids3.join(' ') || nothing;

    const body = html`<div part="field" role="group" aria-labelledby=${ids.label} aria-describedby=${describedBy}>
        <span part="flag" aria-hidden="true">${flag(this.country)}</span>
        <input
          part="country"
          type="text"
          role="combobox"
          aria-label=${t('country')}
          title=${this.#fullName(this.country) || nothing}
          aria-autocomplete="list"
          aria-expanded=${String(expanded)}
          aria-controls=${ids.listbox}
          aria-activedescendant=${expanded && this._active >= 0 ? this.#optionId(this._active) : nothing}
          autocomplete="off"
          spellcheck="false"
          .value=${live(this._query ?? this.#display(this.country))}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnlyActive}
          @input=${this.#onCountryInput}
          @keydown=${this.#onCountryKey}
          @click=${() => !this.readOnlyActive && (this._open = true)}
          @change=${(/** @type {Event} */ e) => e.stopPropagation()}
        />
        <input
          part="control"
          id=${ids.tel}
          type="tel"
          inputmode="tel"
          autocomplete="tel-national"
          aria-labelledby=${ids.label}
          aria-describedby=${describedBy}
          .value=${live(this._text)}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnlyActive}
          ?required=${this.required}
          @input=${this.#onTelInput}
          @change=${this.#onTelChange}
        />
      </div>
      ${example ? html`<span part="example" id=${ids.example}>${t('phoneExample', example)}</span>` : nothing}
      <div part="popup" popover="manual">
        <div part="listbox" id=${ids.listbox} role="listbox" aria-label=${t('country')}>
          ${list.map((c, i) => this.#renderOption(c, i))}
        </div>
      </div>
      <span part="status" role="status" class="focsd-visually-hidden">${this._status}</span>`;

    return renderFieldLayout(this, html`<span part="label" id=${ids.label}>${this.label}</span>`, body);
  }
}
