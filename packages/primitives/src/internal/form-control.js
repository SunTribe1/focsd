import { uid } from './id.js';
import { MESSAGE_KINDS, messageAnnouncer, pickMessage } from './field-messages.js';
import { ValidationController } from './validation.js';

/** @type {(keyof ValidityStateFlags)[]} */
const VALIDITY_FLAGS = [
  'valueMissing',
  'typeMismatch',
  'patternMismatch',
  'tooLong',
  'tooShort',
  'rangeUnderflow',
  'rangeOverflow',
  'stepMismatch',
  'badInput',
  'customError',
];

/** Where a label can sit. */
const LABEL_POSITIONS = new Set(['top', 'start', 'end']);

/** Inner controls that carry forwarded ARIA and anchor validation (first match in tree order). */
const CONTROL_SELECTOR =
  '[part~="control"], input:not([type="hidden"]), textarea, select, button, [role="spinbutton"], [role="slider"], [role="radiogroup"], [role="group"], [tabindex="0"]';

/**
 * Inside a role=group target, the descendants whose role supports aria-invalid in ARIA 1.2 (it is
 * not supported on group, or on button).
 */
const INVALID_CAPABLE =
  'input:not([type="hidden"], [type="file"], [type="button"], [type="submit"], [type="reset"], [type="image"], [hidden], [aria-hidden="true"]), textarea, select, [role="textbox"], [role="searchbox"], [role="spinbutton"], [role="combobox"], [role="slider"], [role="checkbox"], [role="switch"], [role="radiogroup"], [role="listbox"]';

/** Elements whose role is button, explicit or implicit (ARIA 1.2 does not support aria-invalid on them). */
const BUTTON_ROLE =
  '[role="button"], button:not([role]), input:is([type="button"], [type="submit"], [type="reset"], [type="image"]):not([role])';

/**
 * The public form-control API every Focsd form control adds to its element (data members; the
 * accessor and method members are in `FormControlElement`).
 * @typedef {object} FormControlFields
 * @property {string} name
 * @property {boolean} disabled
 * @property {boolean} required
 * @property {boolean} readOnly
 * @property {ElementInternals} internals
 * @property {boolean} isDisabled True when disabled directly or by an ancestor fieldset.
 * @property {string | undefined} errorMessage
 * @property {string | undefined} warningMessage
 * @property {string | undefined} warningPattern
 * @property {() => boolean} validate
 * @property {() => void} clearValidation
 * @property {boolean} readOnlyActive
 * @property {HTMLFormElement | null} form
 * @property {NodeList} labels
 * @property {ValidityState} validity
 * @property {string} validationMessage
 * @property {boolean} willValidate
 * @property {string} defaultValue
 * @property {() => boolean} checkValidity
 * @property {() => boolean} reportValidity
 * @property {(message: string) => void} setCustomValidity
 * @property {(flags: Partial<ValidityStateFlags> | ValidityState, message?: string, anchor?: Element | null) => void} setValidityState
 * @property {(disabled: boolean) => void} formDisabledCallback
 * @property {'top' | 'start' | 'end' | undefined} labelPosition `label-position`: `top`, `start` or `end` (anything else uses the default).
 * @property {string} hint Help text under the control.
 * @property {string | undefined} error An error message; blocks submission from the moment it is set.
 * @property {string | undefined} warning A warning message; never blocks.
 * @property {string | undefined} success A success message; never blocks.
 * @property {'top' | 'start' | 'end'} effectiveLabelPosition
 * @property {{ hint: string, message: string }} messageIds
 */

/**
 * The public form-control API. `shownMessage` is an accessor and `describedByIds` a method (not
 * properties), so a subclass may override them with a class getter and method. `emitValue` and
 * `idrefText` are for subclasses.
 * @typedef {FormControlFields & {
 *   get shownMessage(): import('./field-messages.js').ShownMessage | null,
 *   describedByIds(): string[],
 *   emitValue(commit?: boolean): void,
 *   idrefText(ids: string | null | undefined): string,
 * }} FormControlElement
 */

/**
 * A control's validity: the flags, the message, and optionally the id key of the inner element the
 * message points at (a key of the control's `ids`, for controls with several inputs).
 * @typedef {[Partial<ValidityStateFlags> | ValidityState, string, string?]} ValidityResult
 */

/**
 * A hidden text holder in `root` (created on demand), or removed when `text` is empty.
 * @param {ShadowRoot} root
 * @param {string} id
 * @param {string} text
 */
const writeHolder = (root, id, text) => {
  const holder = root.getElementById?.(id);

  if (!text) holder?.remove();
  else if (holder) holder.textContent = text;
  else root.append(Object.assign(document.createElement('span'), { id, hidden: true, textContent: text }));
};

/**
 * Restored form state as the text a control saved, or null for any other state (a File, or the
 * FormData a multi-value control saves).
 * @param {string | File | FormData | null} state
 * @returns {string | null}
 */
export const restoredText = (state) => (state instanceof File || state instanceof FormData ? null : state);

/**
 * Makes a Lit element form-associated with the native form-control contract: name, disabled,
 * required, readonly, validity (including setCustomValidity), labels, defaultValue, and the form
 * lifecycle callbacks.
 *
 * Only classes with `static supportsReadOnly = true` treat `readonly` as native read-only (no edits,
 * barred from validation); on other controls the attribute has no effect, as on native checkboxes.
 *
 * Subclasses report their own validity through `setValidityState(flags, message, anchor)` (never
 * `internals.setValidity` directly) so custom errors and read-only rules apply uniformly.
 *
 * Built-in validation: `error-message` is shown when the control fails its own checks (on a native
 * submit, `validate()`, or a summary's submit), and clears itself once the value is fixed;
 * `warning-pattern` with `warning-message` shows a non-blocking warning while the value does not match.
 *
 * Every control also takes `label-position`, `hint`, `error`, `warning` and `success`. Only the
 * highest of error, warning and success shows; `error` blocks submission and sets `aria-invalid`;
 * the shown kind is a custom state (`:state(error)`); a message that changes after the first
 * render is announced once through the control's `part="announcer"` status region.
 *
 * Host `aria-label`, `aria-description`, `aria-labelledby` and `aria-describedby` are forwarded to
 * the inner control (`ariaTarget`). ID references cannot cross a shadow root, so referenced
 * elements are resolved to text in the host's tree.
 * @template {new (...args: any[]) => import('lit').LitElement & { localize: { term: (key: string, ...args: unknown[]) => string } }} T
 * @param {T} Base
 * @returns {T & (new (...args: any[]) => FormControlElement)}
 */
export const FormControlMixin = (Base) =>
  class FormControl extends Base {
    static formAssociated = true;

    /** @type {import('lit').PropertyDeclarations} */
    static properties = {
      name: { reflect: true },
      // Always reflect, so an author's write is visible (as a mutation) even when the value is unchanged.
      disabled: { type: Boolean, reflect: true, hasChanged: () => true },
      required: { type: Boolean, reflect: true },
      readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
      hostAriaLabel: { attribute: 'aria-label' },
      hostAriaDescription: { attribute: 'aria-description' },
      hostAriaLabelledBy: { attribute: 'aria-labelledby' },
      hostAriaDescribedBy: { attribute: 'aria-describedby' },
      labelPosition: { attribute: 'label-position', reflect: true },
      hint: {},
      // Own accessor (below), so validity follows `error` synchronously, like setCustomValidity().
      error: { reflect: true, noAccessor: true },
      warning: { reflect: true },
      success: { reflect: true },
      errorMessage: { attribute: 'error-message' },
      warningMessage: { attribute: 'warning-message' },
      warningPattern: { attribute: 'warning-pattern' },
    };

    /** Where the label sits when `label-position` is unset or unknown. */
    static defaultLabelPosition = 'top';

    #formDisabled = false;

    #customError = '';

    /**
     * The last validity a subclass reported, re-applied when custom errors or readonly change.
     * @type {{ flags: ValidityStateFlags, message: string, anchor: Element | null | undefined }}
     */
    #reported = { flags: {}, message: '', anchor: undefined };

    /**
     * The inner control's own label attributes before forwarding, restored when forwarding stops.
     * @type {{ label: string | null, labelledBy: string | null } | null}
     */
    #savedLabel = null;

    /**
     * The aria-labelledby value last written by forwarding (to notice template re-renders).
     * @type {string | null}
     */
    #writtenLabelledBy = null;

    #labelId = uid('focsd-forwarded-label');

    #descriptionId = uid('focsd-forwarded-description');

    /** @type {string | undefined} */
    #error = undefined;

    /** @type {HTMLElement[]} The elements carrying the aria-invalid the mixin wrote for `error`. */
    #wroteInvalid = [];

    /** Built-in validation: `error-message`, `warning-pattern` and `warning-message`. */
    #validation = new ValidationController(/** @type {any} */ (this), () => ({ ...this.#reported, customError: this.#customError }));

    #announce = messageAnnouncer(this);

    // TS requires a mixin constructor to take `...args: any[]` (TS2545).
    /** @param {...any} args */
    constructor(...args) {
      super(...args);
      /** @type {ElementInternals} The element's `ElementInternals`, for subclasses: form value, validity and default ARIA. */
      this.internals = this.attachInternals();
      /** The name submitted with the control's value in a form. */
      this.name = '';
      /** Disables the control: it cannot be focused or changed, and is left out of the form. */
      this.disabled = false;
      /** A value is required before the form can be submitted. */
      this.required = false;
      /** Makes the value read-only: it can be focused and is submitted, but not changed. */
      this.readOnly = false;
      /** @type {string | null} An accessible name for when there is no visible label. */
      this.hostAriaLabel = null;
      /** @type {string | null} A description read after the label, for when there is no visible description. */
      this.hostAriaDescription = null;
      /** @type {string | null} IDs of elements whose text names the control. */
      this.hostAriaLabelledBy = null;
      /** @type {string | null} IDs of elements that describe the control; their text is read after the label. */
      this.hostAriaDescribedBy = null;
      // Unset (not '') so the reflected attributes stay off a fresh host.
      /**
       * Where the label sits: `top` (above the control), `start` (before it, in the same row) or `end`
       * (after it). Unset or anything else uses the control's default.
       * @type {'top' | 'start' | 'end' | undefined}
       */
      this.labelPosition = undefined;
      /** Help text under the control, linked to it as its description. */
      this.hint = '';
      /**
       * A warning message under the control, shown when there is no `error`. It never blocks
       * submission.
       * @type {string | undefined}
       */
      this.warning = undefined;
      /**
       * A success message under the control, shown when there is no `error` or `warning`. It never
       * blocks submission.
       * @type {string | undefined}
       */
      this.success = undefined;
      /**
       * The error shown when the control fails its own checks (`required`, `type`, `pattern`, `min`, ...)
       * on submit or `validate()`. Unset: the browser's localized validation message.
       * @type {string | undefined}
       */
      this.errorMessage = undefined;
      /**
       * The warning shown, without blocking submission, while the value does not match `warning-pattern`.
       * @type {string | undefined}
       */
      this.warningMessage = undefined;
      /**
       * A pattern the whole value should match, like `pattern` but advisory: a mismatch shows
       * `warning-message` (a 1px caution border and the message) and never blocks submission.
       * @type {string | undefined}
       */
      this.warningPattern = undefined;
      /** The IDs of the hint and message elements, for a subclass's own template. */
      this.messageIds = { hint: uid('focsd-hint'), message: uid('focsd-message') };
      // A controller runs after every update even when a subclass overrides updated().
      this.addController({
        hostUpdated: () => {
          // Also run by the error setter (see there); both calls are deliberate.
          this.#applyValidity();
          this.#forwardAria();
          this.#syncMessageState();
        },
      });
    }

    /** An error message; blocks submission while set. Validity updates on assignment. */
    get error() {
      return this.#error;
    }
    set error(value) {
      const old = this.#error;
      // A blank error is no error: store undefined, so nothing (validity, states, styles) reads it as set.
      this.#error = String(value ?? '').trim() ? value : undefined;
      this.requestUpdate('error', old);
      // Deliberately also run in hostUpdated: here so validity follows `error` in the same task (like
      // setCustomValidity), there because the anchor (ariaTarget) only exists after a render.
      this.#applyValidity();
    }

    /**
     * The label position in use: `label-position` when it is `top`, `start` or `end`, otherwise the
     * control's default.
     * @returns {'top' | 'start' | 'end'}
     */
    get effectiveLabelPosition() {
      const fallback = /** @type {'top' | 'start' | 'end'} */ (/** @type {any} */ (this.constructor).defaultLabelPosition);

      return LABEL_POSITIONS.has(this.labelPosition ?? '') ? /** @type {'top' | 'start' | 'end'} */ (this.labelPosition) : fallback;
    }

    /** The message on show: the first non-blank of `error`, `warning` and `success`. */
    get shownMessage() {
      return pickMessage(this);
    }

    /**
     * IDs to add to the inner control's aria-describedby: the hint, then the shown message.
     * @returns {string[]}
     */
    describedByIds() {
      return [this.hint ? this.messageIds.hint : '', this.shownMessage ? this.messageIds.message : ''].filter(Boolean);
    }

    /** True when `disabled` is set or an ancestor fieldset is disabled. Render from this, never write `disabled`. */
    get isDisabled() {
      return this.disabled || this.#formDisabled;
    }

    /** The form the control belongs to, or null. */
    get form() {
      return this.internals.form;
    }
    /** The `<label>` elements associated with the control. */
    get labels() {
      return this.internals.labels;
    }
    /** The control's validity state, as on native form controls. */
    get validity() {
      return this.internals.validity;
    }
    /** The message shown when the control is invalid, or an empty string. */
    get validationMessage() {
      return this.internals.validationMessage;
    }
    /** True when `readonly` is set on a control that supports it (see `supportsReadOnly`). */
    get readOnlyActive() {
      return this.readOnly && Boolean(/** @type {{ supportsReadOnly?: boolean }} */ (this.constructor).supportsReadOnly);
    }

    /** Read-only controls, like native ones, are barred from constraint validation. */
    get willValidate() {
      return this.internals.willValidate && !this.readOnlyActive;
    }
    /** True when the value is valid; otherwise fires `invalid` and returns false, like native. */
    checkValidity() {
      return this.internals.checkValidity();
    }
    /** Like `checkValidity()`, and also shows the browser's validation message when invalid. */
    reportValidity() {
      return this.internals.reportValidity();
    }

    /** The default value: the `value` content attribute, as for native inputs. */
    get defaultValue() {
      return this.getAttribute('value') ?? '';
    }
    set defaultValue(value) {
      this.setAttribute('value', String(value));
    }

    /**
     * Set (non-empty) or clear (empty string) a custom validation error, like native controls.
     * @param {string} message
     */
    setCustomValidity(message) {
      this.#customError = String(message ?? '');
      this.#validation.refresh(() => this.#applyValidity());
    }

    /**
     * For subclasses: set the validity flags and message. `anchor` is the element the browser points its message at.
     * @param {Partial<ValidityStateFlags> | ValidityState} flags
     * @param {string} [message]
     * @param {Element | null} [anchor]
     */
    setValidityState(flags, message = '', anchor = undefined) {
      // Accept a native ValidityState too: its flags are prototype getters, so copy them out.
      /** @type {Record<string, boolean>} */
      const plain = {};

      for (const k of VALIDITY_FLAGS) if (flags?.[k]) plain[k] = true;

      this.#reported = { flags: plain, message, anchor };
      this.#applyValidity();
    }

    /**
     * Element that carries forwarded ARIA and anchors validation messages. Subclasses may override.
     * @returns {HTMLElement | undefined}
     */
    get ariaTarget() {
      return this.renderRoot?.querySelector?.(CONTROL_SELECTOR) ?? undefined;
    }

    /**
     * Elements that carry `aria-invalid` while `error` is set: the `ariaTarget`, or for a
     * `role="group"` target (where ARIA 1.2 does not support it) the group's inner controls that do.
     * Subclasses may override.
     * @returns {HTMLElement[]}
     */
    get invalidTargets() {
      const target = this.ariaTarget;

      if (!target) return [];

      return target.getAttribute('role') === 'group'
        ? [...target.querySelectorAll(INVALID_CAPABLE)].map((el) => /** @type {HTMLElement} */ (el))
        : [target];
    }

    /**
     * Show (or clear) the error from the control's own checks: `required`, `type`, `pattern`, `min`,
     * `max` and the like. Uses `error-message`, else the browser's localized message. An `error` the
     * author set (a server error, say) is left as it is.
     * @returns {boolean} True when the control has no error.
     */
    /**
     * Show (or clear) the error from the control's own checks: `required`, `type`, `pattern`, `min`,
     * `max` and the like. Uses `error-message`, else the browser's localized message. An `error` the
     * author set (a server error, say) is left as it is.
     * @returns {boolean} True when the control has no error.
     */
    validate() {
      return this.#validation.validate();
    }

    /** Clear the error and warning that `validate()` and `warning-pattern` showed (a form reset does). */
    clearValidation() {
      this.#validation.clear();
    }

    #applyValidity() {
      const { flags, message, anchor } = this.#reported;
      // Never null: a null anchor is not connected, so the inner control is used.
      const target = /** @type {HTMLElement | undefined} */ (anchor?.isConnected ? anchor : this.ariaTarget);

      if (this.readOnlyActive) this.internals.setValidity({});
      else if (this.#errorText) this.internals.setValidity({ ...flags, customError: true }, this.#errorText, target);
      else if (this.#customError) this.internals.setValidity({ ...flags, customError: true }, this.#customError, target);
      else if (Object.values(flags).some(Boolean)) this.internals.setValidity(flags, message || this.localize.term('invalidValue'), target);
      else this.internals.setValidity({});
    }

    /**
     * For subclasses: fire the value events, as a native control does on a user edit: `input`
     * (bubbles, composed), then with `commit` also `change` (bubbles, stays in its tree).
     * @param {boolean} [commit] False while the edit is still in progress (typing, dragging).
     */
    emitValue(commit = true) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

      if (commit) this.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * For subclasses: the text of the elements an ID reference list names, resolved in the host's
     * tree (ID references cannot cross a shadow root), joined by spaces.
     * @param {string | null | undefined} ids
     * @returns {string}
     */
    idrefText(ids) {
      if (!ids) return '';
      const root = /** @type {Document | ShadowRoot} */ (this.getRootNode());

      return ids
        .split(/\s+/)
        .map((id) => root.getElementById?.(id)?.textContent.trim() ?? '')
        .filter(Boolean)
        .join(' ');
    }

    /**
     * Forward a host label. When the control is named by aria-labelledby (which outranks aria-label),
     * the label element's id is swapped for a holder with the forwarded text; other ids (such as a
     * select's value) are kept.
     * @param {Element} target
     * @param {string} label
     */
    #forwardLabel(target, label) {
      const current = target.getAttribute('aria-labelledby');

      // The template re-rendered its own value: take that as the new original.
      if (this.#savedLabel && current !== this.#writtenLabelledBy) this.#savedLabel.labelledBy = current;
      writeHolder(/** @type {ShadowRoot} */ (this.renderRoot), this.#labelId, label);

      if (!label) {
        if (!this.#savedLabel) return;
        const { label: own, labelledBy } = this.#savedLabel;

        if (own === null) target.removeAttribute('aria-label');
        else target.setAttribute('aria-label', own);

        if (labelledBy === null) target.removeAttribute('aria-labelledby');
        else target.setAttribute('aria-labelledby', labelledBy);
        this.#savedLabel = null;
        this.#writtenLabelledBy = null;

        return;
      }

      this.#savedLabel ??= { label: target.getAttribute('aria-label'), labelledBy: current };
      const original = this.#savedLabel.labelledBy;

      if (original) {
        const kept = original.split(/\s+/).filter((id) => {
          const el = /** @type {ShadowRoot} */ (this.renderRoot).getElementById?.(id);

          return el && id !== this.#labelId && !el.matches('[part~="label"], label, legend');
        });

        this.#writtenLabelledBy = [this.#labelId, ...kept].join(' ');
        target.setAttribute('aria-labelledby', this.#writtenLabelledBy);
      } else target.setAttribute('aria-label', label);
    }

    #forwardAria() {
      const target = this.ariaTarget;

      if (!target) return;
      this.#forwardLabel(target, this.hostAriaLabel || this.idrefText(this.hostAriaLabelledBy));
      const description = this.hostAriaDescription || this.idrefText(this.hostAriaDescribedBy);
      writeHolder(/** @type {ShadowRoot} */ (this.renderRoot), this.#descriptionId, description);
      const tokens = (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((t) => t && t !== this.#descriptionId);

      if (description) tokens.push(this.#descriptionId);

      if (tokens.length) target.setAttribute('aria-describedby', tokens.join(' '));
      else target.removeAttribute('aria-describedby');
    }

    /** The `error` text, trimmed: a blank error is no error. */
    get #errorText() {
      return String(this.error ?? '').trim();
    }

    /** Custom states, the mixin's aria-invalid and the announcer follow the shown message. */
    #syncMessageState() {
      const shown = this.shownMessage;

      try {
        for (const kind of MESSAGE_KINDS)
          if (shown?.kind === kind) this.internals.states.add(kind);
          else this.internals.states.delete(kind);
      } catch {
        // An engine without CustomStateSet (or without plain state names): the :state() rules do not apply.
      }

      // Never on a button, whatever an override returns: the error reaches it as its description.
      const targets = this.#errorText ? this.invalidTargets.filter((el) => !el.matches(BUTTON_ROLE)) : [];

      for (const el of this.#wroteInvalid) if (!targets.includes(el)) el.removeAttribute('aria-invalid');

      for (const el of targets) el.setAttribute('aria-invalid', 'true');
      this.#wroteInvalid = targets;

      this.#announce(shown);
    }

    /**
     * Called by the browser when an ancestor fieldset is disabled or enabled.
     * @param {boolean} disabled
     */
    formDisabledCallback(disabled) {
      this.#formDisabled = disabled;
      this.requestUpdate();
    }
  };
