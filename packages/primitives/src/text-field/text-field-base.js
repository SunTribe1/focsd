import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';

/**
 * Validity reported by `computeValidity`: the flags, the message and optionally the key of the inner
 * element it points at. The same 3-tuple every Focsd form control uses.
 * @typedef {import('../internal/form-control.js').ValidityResult} ValidityResult
 */

/**
 * What `renderControl` gets: the control's id, its aria-describedby and the base handlers.
 * @typedef {object} ControlContext
 * @property {string} id
 * @property {string} describedBy
 * @property {(event: Event) => void} onInput
 * @property {() => void} onChange
 * @property {(event: KeyboardEvent) => void} onKeyDown
 */

/**
 * Headless, form-associated text field. Label, hint and messages are rendered in the same shadow
 * root as the <input>, so every ID reference stays in one tree.
 *
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart layout - The box around the label and the body; `data-position` is the label position.
 * @csspart label - The label element.
 * @csspart body - The control and its messages.
 * @csspart control - The control element.
 * @csspart hint - The hint element.
 * @csspart message - The shown message; also `error`, `warning` or `success` for its kind.
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The visually hidden status region that announces a new message.
 */
export class FocsdTextFieldBase extends FormControlMixin(FocsdElement) {
  /** `readonly` applies here (no edits, barred from validation), as on native text-like inputs. */
  static supportsReadOnly = true;

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    type: { reflect: true },
    placeholder: {},
    autocomplete: {},
    /** The fewest characters allowed, as on `<input minlength>`. */
    minlength: { type: Number },
    /** The most characters allowed, as on `<input maxlength>`. */
    maxlength: { type: Number },
    pattern: {},
    size: { type: Number },
    dirname: {},
    /** The virtual keyboard to show, as on `<input inputmode>`. */
    inputMode: { attribute: 'inputmode' },
    /** The label of the virtual keyboard's Enter key, as on `<input enterkeyhint>`. */
    enterKeyHint: { attribute: 'enterkeyhint' },
    /** How typed text is capitalized on virtual keyboards, as on `<input autocapitalize>`. */
    autocapitalize: {},
    /** Turns automatic correction on (`on`) or off (`off`), as on `<input autocorrect>`. */
    autocorrect: {},
    /** Checks spelling, as on `<input spellcheck>`: present (or "true") is true, "false" is false. */
    spellcheck: { converter: { fromAttribute: (value) => (value === null ? undefined : value !== 'false') } },
  };

  /**
   * Host attributes forwarded to the inner control (set only when the author sets them).
   * @type {Record<string, (el: FocsdTextFieldBase) => unknown>}
   */
  static forwardedAttributes = {
    readonly: (el) => (el.readOnly ? '' : null),
    minlength: (el) => el.minlength,
    maxlength: (el) => el.maxlength,
    pattern: (el) => el.pattern,
    size: (el) => el.size,
    inputmode: (el) => el.inputMode,
    enterkeyhint: (el) => el.enterKeyHint,
    autocapitalize: (el) => el.autocapitalize,
    autocorrect: (el) => el.autocorrect,
    spellcheck: (el) => (el.spellcheck === undefined || el.spellcheck === null ? null : String(el.spellcheck !== false)),
  };

  /** @type {Set<string>} */
  #forwarded = new Set();

  #ids = { input: uid('focsd-text-field-input') };

  /** Set after a failed submission, so native constraint failures are announced too. */
  #showInvalid = false;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The value. */
    this.value = '';
    /** @type {'text' | 'email' | 'password' | 'search' | 'tel' | 'url'} The input type, as on `<input type>`. */
    this.type = 'text';
    /** Placeholder text. */
    this.placeholder = '';
    /** @type {AutoFill} Autofill token for the input, as on `<input autocomplete>` (WCAG 1.3.5). */
    this.autocomplete = '';
    // Native attributes forwarded to the inner input only when set (an empty pattern would
    // reject every non-empty value), so they start undefined.
    /** @type {string | undefined} A regular expression the value must match, as on `<input pattern>`. */
    this.pattern = undefined;
    /** @type {number | undefined} The width in characters, as on `<input size>`. */
    this.size = undefined;
    /** @type {string | undefined} Submits the text direction under this name, as on `<input dirname>`. */
    this.dirname = undefined;
    this.addEventListener('invalid', () => {
      this.#showInvalid = true;
      this.requestUpdate();
    });
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
  }

  /** @returns {HTMLInputElement | HTMLTextAreaElement | null} */
  get #input() {
    return this.renderRoot.querySelector('[part~="control"]');
  }

  /**
   * Copy forwarded host attributes onto the inner control; remove only what we set before.
   * @param {HTMLInputElement | HTMLTextAreaElement} input
   */
  #syncNative(input) {
    for (const [attr, read] of Object.entries(/** @type {typeof FocsdTextFieldBase} */ (this.constructor).forwardedAttributes)) {
      const value = read(this);

      if ((value !== null && value !== undefined && value !== '') || (attr === 'readonly' && value === '')) {
        input.setAttribute(attr, String(value));
        this.#forwarded.add(attr);
      } else if (this.#forwarded.has(attr)) {
        input.removeAttribute(attr);
        this.#forwarded.delete(attr);
      }
    }
  }

  /**
   * Form value; with `dirname`, also submits the text direction under that name (as native inputs do).
   * @param {HTMLInputElement | HTMLTextAreaElement} input
   */
  #formValue(input) {
    if (!this.dirname || !this.name) return this.value;
    const data = new FormData();
    data.append(this.name, this.value ?? '');
    data.append(this.dirname, input?.matches(':dir(rtl)') ? 'rtl' : 'ltr');

    return data;
  }

  /** @override */
  updated() {
    const input = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (this.#input);
    this.#syncNative(input);
    this.internals.setFormValue(this.#formValue(input), this.value);
    // An `error` outranks these flags in the mixin (Ruling R3).
    const [flags, message] = this.computeValidity(input);
    this.setValidityState(flags, message, input);

    const invalid = this.shownMessage?.kind === 'error' || (this.#showInvalid && !this.internals.validity.valid);

    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  // ---- native text-control API, delegated to the inner control --------------------------------

  /**
   * The fewest characters allowed, or -1; as on `<input>`.
   * @returns {number}
   */
  get minLength() {
    return this.minlength ?? -1;
  }
  /** @param {number} value */
  set minLength(value) {
    /** @type {number | undefined} */
    this.minlength = value;
  }
  /**
   * The most characters allowed, or -1; as on `<input>`.
   * @returns {number}
   */
  get maxLength() {
    return this.maxlength ?? -1;
  }
  /** @param {number} value */
  set maxLength(value) {
    /** @type {number | undefined} */
    this.maxlength = value;
  }
  /** The start of the text selection, as on `<input>`. */
  get selectionStart() {
    return this.#input?.selectionStart ?? null;
  }
  set selectionStart(value) {
    if (this.#input) this.#input.selectionStart = value;
  }
  /** The end of the text selection, as on `<input>`. */
  get selectionEnd() {
    return this.#input?.selectionEnd ?? null;
  }
  set selectionEnd(value) {
    if (this.#input) this.#input.selectionEnd = value;
  }
  /** The direction of the text selection, as on `<input>`. */
  get selectionDirection() {
    return this.#input?.selectionDirection ?? null;
  }
  /** Select all text in the input, like native. */
  select() {
    this.#input?.select();
  }
  /**
   * Set the text selection in the input, like native.
   * @param {number | null} start
   * @param {number | null} end
   * @param {'forward' | 'backward' | 'none'} [direction]
   */
  setSelectionRange(start, end, direction) {
    this.#input?.setSelectionRange(start, end, direction);
  }
  /**
   * Replace text in the control (like the native method); updates `value` without firing `input`.
   * @param {string} replacement
   * @param {number} [start]
   * @param {number} [end]
   * @param {SelectionMode} [selectMode]
   */
  setRangeText(replacement, start, end, selectMode) {
    const input = this.#input;

    if (!input) return;

    if (start === undefined) input.setRangeText(replacement);
    else input.setRangeText(replacement, start, /** @type {number} */ (end), selectMode);
    this.value = input.value;
  }

  /**
   * Enter submits the owning form (implicit submission; the inner input is not form-owned).
   * @param {KeyboardEvent} event
   */
  #onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.isComposing) this.form?.requestSubmit();
  };

  /**
   * Validity flags and message for the current value. Subclasses add their own constraints.
   * @param {HTMLInputElement | HTMLTextAreaElement} input
   * @returns {ValidityResult}
   */
  computeValidity(input) {
    return [input.validity, input.validationMessage];
  }

  formResetCallback() {
    this.#showInvalid = false;
    this.value = this.defaultValue;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.value = restoredText(state) ?? '';
  }

  /** @param {Event} event */
  #onInput = (event) => {
    this.value = /** @type {HTMLInputElement | HTMLTextAreaElement} */ (event.target).value;
  };

  #onChange = () => {
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /**
   * The native control. Subclasses (textarea, search, password) override this.
   * @param {ControlContext} ctx
   */
  renderControl(ctx) {
    return html`<input
      part="control"
      id=${ctx.id}
      type=${this.type}
      .value=${live(this.value)}
      ?required=${this.required}
      ?disabled=${this.isDisabled}
      placeholder=${this.placeholder || nothing}
      autocomplete=${this.autocomplete || nothing}
      aria-describedby=${ctx.describedBy || nothing}
      @input=${ctx.onInput}
      @change=${ctx.onChange}
      @keydown=${ctx.onKeyDown}
    />`;
  }

  /**
   * Extra content after the control, before hint and message (e.g. a character counter).
   * @returns {unknown}
   */
  renderExtra() {
    return nothing;
  }

  /**
   * IDs of extra description elements (rendered by renderExtra) to add to aria-describedby.
   * @returns {string[]}
   */
  extraDescribedBy() {
    return [];
  }

  /** @override */
  render() {
    const ids = this.#ids;
    // Order: the author hint, the built-in extras, then the shown message (R38).
    const own = this.describedByIds();
    // Right after the hint (found by id, so an override's own order is kept), else first.
    const at = own.indexOf(this.messageIds.hint) + 1;
    const describedBy = [...own.slice(0, at), ...this.extraDescribedBy(), ...own.slice(at)].join(' ');
    const label = html`<label part="label" for=${ids.input}>${this.label}</label>`;
    const body = html`${this.renderControl({ id: ids.input, describedBy, onInput: this.#onInput, onChange: this.#onChange, onKeyDown: this.#onKeyDown })}${this.renderExtra()}`;

    return renderFieldLayout(this, label, body);
  }
}
