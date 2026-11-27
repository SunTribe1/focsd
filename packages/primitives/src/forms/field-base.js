// cspell:ignore labelable
import { html, nothing, render } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { MESSAGE_ICONS, messageAnnouncer, pickMessage } from '../internal/field-messages.js';
import { iconSvg } from '../internal/icons.js';
import { uid } from '../internal/id.js';
import { warnOnce } from '../internal/warn.js';

/** Elements a label can name (`<label for>`), besides form-associated custom elements. */
const LABELABLE = 'input:not([type="hidden"]), select, textarea, button, meter, output, progress';

/** Elements whose role is button, explicit or implicit. */
const BUTTON_ROLE =
  '[role="button"], button:not([role]), input:is([type="button"], [type="submit"], [type="reset"], [type="image"]):not([role])';

/** Where a label can sit. */
const LABEL_POSITIONS = new Set(['top', 'start', 'end']);

/**
 * True for a form-associated custom element.
 * @param {Element} el
 */
const isFormAssociated = (el) => /** @type {{ formAssociated?: boolean }} */ (el.constructor).formAssociated === true;

/**
 * True when `<label for>` can name the element: a native labelable element or a form-associated
 * custom element.
 * @param {Element} el
 */
const isLabelable = (el) => el.matches(LABELABLE) || isFormAssociated(el);

/** Native controls that take a value (buttons, meters, outputs and progress bars do not). */
const VALUE_CONTROL = 'input:not([type="hidden"], [type="button"], [type="submit"], [type="reset"], [type="image"]), select, textarea';

/**
 * True for a control the field could label in place of the first: a native value control or a
 * form-associated custom element. A show-password button or a strength meter beside it is not one.
 * @param {Element} el
 */
const isFormControl = (el) => el.matches(VALUE_CONTROL) || isFormAssociated(el);

/**
 * What the field wrote onto its control, so that it can take it back (and never undo the author's).
 * @typedef {object} Applied
 * @property {HTMLElement} control
 * @property {string | null} describedBy The author's own `aria-describedby`.
 * @property {string | null} written The `aria-describedby` the field last wrote.
 * @property {boolean} invalid True when the field set `aria-invalid`.
 * @property {string | null} invalidWas The author's `aria-invalid` ("false") the field replaced, or null for none.
 * @property {boolean} validity True when the field set a custom validity message.
 * @property {string} validityWas The control's own custom validity message before the field set one.
 * @property {string} validityWritten The custom validity message the field last set.
 * @property {string | null} ownId The `id` the field gave the control, or null.
 * @property {boolean} labelledBy True when the field set `aria-labelledby`.
 */

/**
 * Wraps any control, native or third-party, with a label, a hint and validation messages. The label,
 * hint and message are generated as light-DOM children of the field (marked `data-focsd-field`, never
 * author content), so the control can reference them by id; the control itself is the author's
 * child and is never replaced. The field has no role. `error` goes into `setCustomValidity` where
 * the control has it, so it blocks submission, and sets `aria-invalid`. The `control` is the child
 * with `slot="control"`, else the first native form control or form-associated custom element.
 * A field wraps one control: any other control inside it is left alone.
 *
 * The field custom properties below are shared by every form control, not only by this element.
 *
 * @slot - The control (an input, select, textarea or a form-associated element).
 * @slot control - A control that is not a native or form-associated element, such as a `role="textbox"` element.
 * @slot label - The generated label.
 * @slot hint - The generated hint.
 * @slot message - The generated error, warning or success message.
 * @csspart layout - The row or column holding the label and the body.
 * @csspart label - The wrapper around the generated label and the required marker.
 * @csspart body - The wrapper around the control, the hint and the message.
 * @csspart marker - The required marker (hidden from assistive technology).
 * @csspart announcer - The visually hidden status region that announces a changed message.
 * @cssprop [--focsd-field-background=var(--focsd-surface)] - Background of the form controls; shared by every form control, not only this element.
 * @cssprop [--focsd-field-border-color=var(--focsd-edge)] - Border color of the form controls; shared by every form control. Each control sets it per validation state, so a value set on an ancestor does not override the state colors.
 * @cssprop [--focsd-field-radius=var(--focsd-radius-control)] - Corner radius of the form controls; shared by every form control.
 * @cssprop [--focsd-field-label-width=12rem] - Width of a label placed beside its control; shared by every form control.
 * @cssprop [--focsd-field-side-min=32rem] - Container width below which a side label stacks above the control; shared by every form control.
 */
export class FocsdFieldBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    hint: {},
    // Own accessor (below), so validity follows `error` synchronously, like setCustomValidity().
    error: { reflect: true, noAccessor: true },
    warning: { reflect: true },
    success: { reflect: true },
    labelPosition: { attribute: 'label-position', reflect: true },
    required: { type: Boolean, reflect: true },
  };

  /** @type {string | undefined} */
  #error = undefined;

  #ids = { label: uid('focsd-field-label'), hint: uid('focsd-field-hint'), message: uid('focsd-field-message') };

  /** @type {Applied | null} */
  #applied = null;

  /** @type {WeakSet<Element>} Not-yet-defined children already waited for. */
  #watched = new WeakSet();

  #announce = messageAnnouncer(this);

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** Helper text shown below the control. */
    this.hint = '';
    /** Warning message. @type {string | undefined} */
    this.warning = undefined;
    /** Success message. @type {string | undefined} */
    this.success = undefined;
    /** Where the label sits relative to the control; unset or unknown means `top`. @type {'top' | 'start' | 'end' | undefined} */
    this.labelPosition = undefined;
    /** Marks the field as required: shows the marker. The control keeps its own `required`. */
    this.required = false;
  }

  /** Error message; marks the control invalid and blocks submission while set. @type {string | undefined} */
  get error() {
    return this.#error;
  }
  set error(value) {
    const old = this.#error;
    // A blank error is no error: store undefined.
    this.#error = String(value ?? '').trim() ? value : undefined;
    this.requestUpdate('error', old);
    const control = this.control;

    // Validity follows `error` in the same task, like setCustomValidity().
    if (control && this.#applied?.control === control) this.#syncValidity(control);
  }

  /**
   * The wrapped control: the child with `slot="control"`, else the first child that is a native
   * value control or a form-associated custom element, else the first other labelable child (a
   * button, meter, output or progress bar).
   * @returns {HTMLElement | null}
   */
  get control() {
    const kids = /** @type {HTMLElement[]} */ ([...this.children].filter((el) => !el.hasAttribute('data-focsd-field')));

    return kids.find((el) => el.getAttribute('slot') === 'control') ?? kids.find(isFormControl) ?? kids.find(isLabelable) ?? null;
  }

  /** @returns {'top' | 'start' | 'end'} The label position in use. */
  get #position() {
    return LABEL_POSITIONS.has(this.labelPosition ?? '') ? /** @type {'top' | 'start' | 'end'} */ (this.labelPosition) : 'top';
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    super.updated(changed);
    this.#sync();
  }

  /** Creates, updates or removes the generated children and the attributes on the control. */
  #sync() {
    const control = this.control;
    const shown = pickMessage({ error: this.error, warning: this.warning, success: this.success });

    this.#watchUndefined();
    this.#warnExtraControls();
    this.#warnNoControl(control);
    this.#syncControl(control);
    this.#syncLabel(control);
    this.#syncText('hint', 'p', this.hint, this.#ids.hint);
    this.#syncMessage(shown);

    if (control) {
      this.#syncDescription(control, shown);
      this.#syncValidity(control);

      // A form-associated control copies the referenced label and description text into its
      // shadow root when it updates: the text may have changed while the ids did not.
      if (isFormAssociated(control)) /** @type {{ requestUpdate?: () => void }} */ (control).requestUpdate?.();
    }

    this.#announce(shown);
  }

  /**
   * Takes back what the field wrote onto a control it no longer wraps, then starts on the new one.
   * @param {HTMLElement | null} control
   */
  #syncControl(control) {
    const previous = this.#applied;

    if (previous?.control === control) return;

    if (previous) this.#release(previous);
    this.#applied = control
      ? {
          control,
          describedBy: null,
          written: null,
          invalid: false,
          invalidWas: null,
          validity: false,
          validityWas: '',
          validityWritten: '',
          ownId: null,
          labelledBy: false,
        }
      : null;
  }

  /** An element defined later becomes labelable once upgraded: look again when it is defined. */
  #watchUndefined() {
    for (const el of this.querySelectorAll(':scope > :not(:defined)')) {
      if (this.#watched.has(el)) continue;
      this.#watched.add(el);
      customElements.whenDefined(el.localName).then(() => this.requestUpdate());
    }
  }

  /** One control per field: the first is wired, any other form control is left alone (and reported). */
  #warnExtraControls() {
    const controls = [...this.children].filter(
      (el) => !el.hasAttribute('data-focsd-field') && (el.getAttribute('slot') === 'control' || isFormControl(el)),
    );

    if (controls.length > 1)
      warnOnce('field:many-controls', 'focsd-field wraps one control; only the first is labeled and described. Use one field per control.');
  }

  /**
   * A label with nothing to wire (a control nested in a wrapper, say) is reported once. A child
   * that is not defined yet may still become the control, so it waits for it.
   * @param {HTMLElement | null} control
   */
  #warnNoControl(control) {
    if (!this.label || control || this.querySelector(':scope > :not(:defined)')) return;
    warnOnce(
      'field:no-control',
      'focsd-field found no control to label: put the input, select, textarea or form-associated element directly inside the field, or give it slot="control".',
    );
  }

  /** @param {Applied} applied */
  #release({ control, describedBy, written, invalid, invalidWas, validity, validityWas, ownId, labelledBy }) {
    if (control.getAttribute('aria-describedby') === written) {
      if (describedBy) control.setAttribute('aria-describedby', describedBy);
      else control.removeAttribute('aria-describedby');
    }

    if (invalid) this.#restoreInvalid(control, invalidWas);

    if (validity) /** @type {HTMLInputElement} */ (control).setCustomValidity(validityWas);

    if (ownId && control.id === ownId) control.removeAttribute('id');

    if (labelledBy) control.removeAttribute('aria-labelledby');
  }

  /**
   * The generated direct child of one kind, created if missing (and replaced if its tag changed).
   * @param {'label' | 'hint' | 'message'} kind
   * @param {string} tag
   * @param {string} id
   * @returns {HTMLElement}
   */
  #node(kind, tag, id) {
    const found = /** @type {HTMLElement | null} */ (this.querySelector(`:scope > [data-focsd-field="${kind}"]`));

    if (found?.localName === tag) return found;
    found?.remove();
    const el = document.createElement(tag);
    el.dataset.focsdField = kind;
    el.slot = kind;
    el.id = id;
    this.append(el);

    return el;
  }

  /** @param {'label' | 'hint' | 'message'} kind */
  #remove(kind) {
    this.querySelector(`:scope > [data-focsd-field="${kind}"]`)?.remove();
  }

  /**
   * A generated text node, or none when the text is empty.
   * @param {'hint'} kind
   * @param {string} tag
   * @param {string} text
   * @param {string} id
   */
  #syncText(kind, tag, text, id) {
    if (text) this.#node(kind, tag, id).textContent = text;
    else this.#remove(kind);
  }

  /** @param {HTMLElement | null} control */
  #syncLabel(control) {
    if (!this.label) {
      this.#remove('label');
      this.#clearLabelledBy(control);

      return;
    }

    const labelable = Boolean(control && isLabelable(control));
    const el = this.#node('label', labelable ? 'label' : 'span', this.#ids.label);
    el.textContent = this.label;

    if (!control) return;

    if (labelable) {
      if (!control.id) {
        const id = uid('focsd-field-control');
        control.setAttribute('id', id);
        /** @type {Applied} */ (this.#applied).ownId = id;
      }

      /** @type {HTMLLabelElement} */ (el).htmlFor = control.id;

      // `<label for>` names a form-associated host, not the input in its shadow root: a Focsd
      // control forwards the host's `aria-labelledby` text to that input, so set it as well.
      if (!isFormAssociated(control)) {
        this.#clearLabelledBy(control);

        return;
      }
    }

    // Not labelable (or form-associated): name it by reference, unless the author names it already.
    if (control.hasAttribute('aria-labelledby') && !this.#applied?.labelledBy) return;
    control.setAttribute('aria-labelledby', this.#ids.label);
    /** @type {Applied} */ (this.#applied).labelledBy = true;
  }

  /** @param {HTMLElement | null} control */
  #clearLabelledBy(control) {
    const applied = this.#applied;

    if (!applied?.labelledBy) return;
    control?.removeAttribute('aria-labelledby');
    applied.labelledBy = false;
  }

  /** @param {import('../internal/field-messages.js').ShownMessage | null} shown */
  #syncMessage(shown) {
    if (!shown) {
      this.#remove('message');

      return;
    }

    const el = this.#node('message', 'p', this.#ids.message);
    el.dataset.state = shown.kind;
    render(html`<span aria-hidden="true">${iconSvg(MESSAGE_ICONS[shown.kind])}</span>${shown.text}`, el);
  }

  /**
   * Adds the hint and message ids to the control's `aria-describedby`, after the author's own ids.
   * @param {HTMLElement} control
   * @param {import('../internal/field-messages.js').ShownMessage | null} shown
   */
  #syncDescription(control, shown) {
    const applied = /** @type {Applied} */ (this.#applied);
    const current = control.getAttribute('aria-describedby');

    // Not what the field wrote: the author's (or the template's) value is the new original.
    if (current !== applied.written) applied.describedBy = current;
    const own = (applied.describedBy ?? '').split(/\s+/).filter(Boolean);
    const ours = [this.hint ? this.#ids.hint : '', shown ? this.#ids.message : ''].filter(Boolean);
    const value = [...own, ...ours].join(' ');

    if (value) control.setAttribute('aria-describedby', value);
    else control.removeAttribute('aria-describedby');
    applied.written = value || null;
  }

  /**
   * Puts back the `aria-invalid` the author had (or none).
   * @param {HTMLElement} control
   * @param {string | null} was
   */
  #restoreInvalid(control, was) {
    if (was === null) control.removeAttribute('aria-invalid');
    else control.setAttribute('aria-invalid', was);
  }

  /**
   * An `aria-invalid` or custom validity message the author changed after the field wrote its own
   * is the author's again: the field stops restoring the stale original (and keeps an
   * `aria-invalid` it would not override, such as "spelling").
   * @param {HTMLElement} control
   */
  #adoptAuthorChanges(control) {
    const applied = /** @type {Applied} */ (this.#applied);
    const native = /** @type {HTMLInputElement} */ (control);

    if (applied.invalid && control.getAttribute('aria-invalid') !== 'true') {
      applied.invalidWas = control.getAttribute('aria-invalid');
      applied.invalid = false;
    }

    // Only a native control reads back exactly the custom message it was given (a form-associated
    // element may report its own error instead), and only while it takes part in validation.
    if (!applied.validity || !native.willValidate || isFormAssociated(control)) return;

    if (!(native.validity.customError && native.validationMessage === applied.validityWritten)) {
      applied.validityWas = native.validity.customError ? native.validationMessage : '';
      applied.validity = false;
    }
  }

  /** @param {HTMLElement} control */
  #syncValidity(control) {
    const applied = /** @type {Applied} */ (this.#applied);
    const error = this.#error;
    const native = /** @type {HTMLInputElement} */ (control);

    this.#adoptAuthorChanges(control);

    if (error) {
      if ('setCustomValidity' in control) {
        // Remember the control's own custom message, to put it back when the error clears.
        if (!applied.validity) applied.validityWas = native.validity.customError ? native.validationMessage : '';
        applied.validityWritten = String(error).trim();
        native.setCustomValidity(applied.validityWritten);
        applied.validity = true;
      }

      // Never on a button (ARIA 1.2 does not support it there): the error reaches it as its description.
      const own = control.getAttribute('aria-invalid');

      if (!control.matches(BUTTON_ROLE) && (own === null || own === 'false' || applied.invalid)) {
        if (!applied.invalid) applied.invalidWas = own;
        control.setAttribute('aria-invalid', 'true');
        applied.invalid = true;
      }

      return;
    }

    if (applied.validity) native.setCustomValidity(applied.validityWas);

    if (applied.invalid) this.#restoreInvalid(control, applied.invalidWas);
    applied.validity = false;
    applied.invalid = false;
  }

  /** @override */
  render() {
    const requestUpdate = () => this.requestUpdate();

    return html`<div part="layout" data-position=${this.#position}>
        <div part="label"><slot name="label"></slot>${this.required ? html`<span part="marker" aria-hidden="true">*</span>` : nothing}</div>
        <div part="body">
          <slot @slotchange=${requestUpdate}></slot>
          <slot name="control" @slotchange=${requestUpdate}></slot>
          <slot name="hint"></slot>
          <slot name="message"></slot>
        </div>
      </div>
      <span part="announcer" role="status" class="focsd-visually-hidden"></span>`;
  }
}
