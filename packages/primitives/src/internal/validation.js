/**
 * Built-in validation for form controls.
 * - `error-message`: on a native submit check (`invalid`) or `validate()`, a control that fails its own
 *   checks shows the message (else the browser's), and clears it once an edit fixes the value.
 * - `warning-pattern` with `warning-message`: while the whole value does not match, a non-blocking warning.
 * An `error` or `warning` the author set is left alone; only what this controller wrote is cleared.
 *
 * @typedef {{ flags: ValidityStateFlags, message: string, customError: string }} ValidityReport
 *
 * @typedef {import('lit').ReactiveControllerHost & HTMLElement & {
 *   value?: unknown,
 *   warning?: string,
 *   error?: string,
 *   errorMessage?: string,
 *   willValidate: boolean,
 *   isDisabled: boolean,
 *   updateComplete: Promise<boolean>,
 *   warningPattern?: string,
 *   warningMessage?: string,
 *   localize: { term: (key: string) => string },
 * }} WarningHost
 */
export class ValidationController {
  /** @type {WarningHost} */
  #host;

  /** @type {() => ValidityReport} */
  #report;

  /** True while `error` holds a message `validate()` wrote. */
  #autoError = false;

  /** True while `warning` holds a message this controller wrote. */
  #auto = false;

  /** The pattern and value the warning was last checked for. */
  #checkedFor = '';

  /**
   * @param {WarningHost} host
   * @param {() => ValidityReport} report The control's current validity, read when needed.
   */
  constructor(host, report) {
    this.#host = host;
    this.#report = report;
    host.addController(this);
    host.addEventListener('invalid', () => this.validate());
    host.addEventListener('input', () => this.#afterEdit());
    host.addEventListener('change', () => this.#afterEdit());
  }

  /** The form the control was connected in, for its reset listener. */
  #form = /** @type {HTMLFormElement | null} */ (null);

  #onReset = () => this.clear();

  /** A form reset clears what this controller showed, whatever the control's own reset does. */
  hostConnected() {
    // `internals.form` also finds a form tied by `form="id"`.
    this.#form = /** @type {{ internals?: ElementInternals }} */ (this.#host).internals?.form ?? this.#host.closest('form');
    this.#form?.addEventListener('reset', this.#onReset);
  }

  hostDisconnected() {
    this.#form?.removeEventListener('reset', this.#onReset);
    this.#form = null;
  }

  /**
   * Show (or clear) the error from the control's own checks. Uses `error-message`, else the
   * browser's localized message. An `error` the author set (a server error, say) is left as it is.
   * @returns {boolean} True when the control has no error.
   */
  validate() {
    const host = this.#host;
    const { flags, message, customError } = this.#report();
    const invalid = host.willValidate && !host.isDisabled && (Object.values(flags).some(Boolean) || Boolean(customError));

    if (invalid && (!this.#errorText || this.#autoError)) {
      this.#autoError = true;
      host.error = host.errorMessage || customError || message || host.localize.term('invalidValue');
    } else if (!invalid && this.#autoError) {
      this.#autoError = false;
      host.error = '';
    }

    return !this.#errorText;
  }

  /**
   * Check again if the shown error is one this controller showed (a custom error changed, say), then
   * run `after` (the host applies its validity).
   * @param {() => void} [after]
   */
  refresh(after) {
    if (this.#autoError) this.validate();
    after?.();
  }

  /** The shown error, as the control counts it. */
  get #errorText() {
    return String(this.#host.error ?? '').trim();
  }

  async #afterEdit() {
    await this.#host.updateComplete;
    this.check();
  }

  /** Check when the value or the pattern changed (a starting value included), after this update. */
  hostUpdated() {
    const host = this.#host;
    const key = `${host.warningPattern ?? ''}\u0000${String(host.value ?? '')}`;

    if (key === this.#checkedFor) return;
    this.#checkedFor = key;
    // A value set from script fires no input event: check here too, as after an edit.
    queueMicrotask(() => this.check());
  }

  /** The whole value should match `warning-pattern`; a mismatch shows `warning-message`. Then `refresh()`. */
  check() {
    const host = this.#host;
    const value = String(host.value ?? '');
    let mismatch = false;

    if (host.warningPattern && value) {
      try {
        mismatch = !new RegExp(`^(?:${host.warningPattern})$`, 'v').test(value);
      } catch {
        mismatch = false;
      }
    }

    if (mismatch && (!host.warning || this.#auto)) {
      this.#auto = true;
      host.warning = host.warningMessage || host.localize.term('checkValue');
    } else if (!mismatch && this.#auto) {
      this.#auto = false;
      host.warning = undefined;
    }

    // An error validation showed clears once the value is fixed (after an edit, or a value set from script).
    this.refresh();
  }

  /** Clear the error and warning this controller showed (a form reset does). */
  clear() {
    if (this.#autoError) this.#host.error = '';

    if (this.#auto) this.#host.warning = undefined;
    this.#autoError = false;
    this.#auto = false;
  }
}
