import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { FocsdRadioBase } from './radio-base.js';

/**
 * Radio group: arrows move and check (skipping disabled), one tab stop, form-associated.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - Default content.
 * @csspart group - The group element.
 * @csspart label - The label element.
 * @csspart layout - The wrapper around the label and the body.
 * @csspart body - The group and the messages.
 * @csspart hint - The hint text.
 * @csspart message - The shown message (also error, warning or success).
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The hidden region that announces message changes.
 */
export class FocsdRadioGroupBase extends FormControlMixin(FocsdElement) {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, value: {} };

  #labelId = uid('focsd-radio-group-label');

  constructor() {
    super();
    /** The group's label. */
    this.label = '';
    /** The value of the chosen radio. */
    this.value = '';
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('click', this.#onClick);
  }

  /** The radios in the group, in order. */
  get radios() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdRadioBase);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
  }

  /** @param {number} i */
  #isDisabled = (i) => this.isDisabled || (this.radios[i]?.disabled ?? true);

  #sync = () => {
    const radios = this.radios;
    let tabStop = radios.findIndex((r) => r.value === this.value && !r.disabled);

    if (tabStop < 0) tabStop = edgeIndex('first', radios.length, this.#isDisabled);
    radios.forEach((radio, i) => {
      radio.setAttribute('aria-checked', String(radio.value === this.value && this.value !== ''));
      radio.setAttribute('tabindex', i === tabStop ? '0' : '-1');
    });
  };

  /** @override */
  updated() {
    this.#sync();
    this.internals.setFormValue(this.value || null);
    const anchor = this.radios.find((r) => r.getAttribute('tabindex') === '0');

    if (this.required && !this.value) this.setValidityState({ valueMissing: true }, this.localize.term('selectOption'), anchor);
    else this.setValidityState({});
  }

  formResetCallback() {
    this.value = this.defaultValue;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.value = restoredText(state) ?? '';
  }

  /** @param {number} index */
  #check(index) {
    const radio = this.radios[index];

    if (!radio || this.#isDisabled(index)) return;
    radio.focus();

    if (radio.value === this.value) return;
    this.value = radio.value;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const radios = this.radios;
    const current = radios.indexOf(/** @type {FocsdRadioBase} */ (event.target));

    if (current < 0) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const forward = ['ArrowDown', rtl ? 'ArrowLeft' : 'ArrowRight'];
    const backward = ['ArrowUp', rtl ? 'ArrowRight' : 'ArrowLeft'];
    let next;

    if (forward.includes(event.key)) next = nextIndex(current, 1, radios.length, this.#isDisabled);
    else if (backward.includes(event.key)) next = nextIndex(current, -1, radios.length, this.#isDisabled);
    else if (event.key === ' ') next = current;
    else return;
    event.preventDefault();
    this.#check(next);
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const radio = event.composedPath().find((/** @type {EventTarget} */ n) => n instanceof FocsdRadioBase);

    if (radio) this.#check(this.radios.indexOf(radio));
  };

  /** @override */
  render() {
    const describedBy = this.describedByIds().join(' ');
    const label = html`<span part="label" id=${this.#labelId}>${this.label}</span>`;

    const body = html`<div part="group" role="radiogroup" aria-labelledby=${this.#labelId} aria-describedby=${describedBy || nothing} aria-required=${this.required ? 'true' : nothing} aria-disabled=${this.isDisabled ? 'true' : nothing}>
        <slot @slotchange=${this.#sync}></slot>
      </div>`;

    return renderFieldLayout(this, label, body);
  }
}
