import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { FocsdToggleBase } from './toggle-base.js';

/**
 * Group of toggles: single or multiple selection, roving focus, form-associated.
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
export class FocsdToggleGroupBase extends FormControlMixin(FocsdElement) {
  static isToggleGroup = true;

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, type: { reflect: true }, value: {} };

  #labelId = uid('focsd-toggle-group-label');

  constructor() {
    super();
    /** The accessible name of the group. */
    this.label = '';
    /** @type {'single' | 'multiple'} `single` keeps at most one toggle pressed; `multiple` lets several be. */
    this.type = 'single';
    /** The value of the pressed toggle; with `multiple`, a comma-separated list. */
    this.value = '';
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeyDown);
  }

  /** The toggles in the group, in order. */
  get toggles() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdToggleBase);
  }

  get #values() {
    return this.value ? this.value.split(',') : [];
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
  }

  /** @param {number} i */
  #isDisabled = (i) => this.isDisabled || (this.toggles[i]?.isDisabled ?? true);

  #sync = () => {
    const values = this.#values;
    const toggles = this.toggles;
    let stop = toggles.findIndex((t) => values.includes(t.value) && !t.isDisabled);

    if (stop < 0) stop = edgeIndex('first', toggles.length, this.#isDisabled);
    toggles.forEach((t, i) => {
      t.groupDisabled = this.isDisabled;
      t.pressed = values.includes(t.value);
      t.setAttribute('tabindex', i === stop ? '0' : '-1');
    });
  };

  /** @override */
  updated() {
    this.#sync();

    if (this.type === 'multiple' && this.name) {
      const data = new FormData();
      this.#values.forEach((v) => data.append(this.name, v));
      this.internals.setFormValue(data);
    } else {
      this.internals.setFormValue(this.value || null);
    }
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.value = state instanceof FormData ? state.getAll(this.name).join(',') : (restoredText(state) ?? '');
  }

  formResetCallback() {
    this.value = this.defaultValue;
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const toggle = event.composedPath().find((/** @type {EventTarget} */ n) => n instanceof FocsdToggleBase);

    if (!toggle || toggle.isDisabled || this.isDisabled) return;
    const values = this.#values;
    let next;

    if (this.type === 'multiple')
      next = values.includes(toggle.value) ? values.filter((v) => v !== toggle.value) : [...values, toggle.value];
    else next = [toggle.value];
    const joined = next.join(',');

    if (joined === this.value) return;
    this.value = joined;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const toggles = this.toggles;

    const current = toggles.indexOf(
      /** @type {FocsdToggleBase} */ (event.composedPath().find((/** @type {EventTarget} */ n) => n instanceof FocsdToggleBase)),
    );

    if (current < 0) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    let next = -1;

    if (event.key === 'ArrowDown' || event.key === (rtl ? 'ArrowLeft' : 'ArrowRight'))
      next = nextIndex(current, 1, toggles.length, this.#isDisabled);
    else if (event.key === 'ArrowUp' || event.key === (rtl ? 'ArrowRight' : 'ArrowLeft'))
      next = nextIndex(current, -1, toggles.length, this.#isDisabled);
    else if (event.key === 'Home') next = edgeIndex('first', toggles.length, this.#isDisabled);
    else if (event.key === 'End') next = edgeIndex('last', toggles.length, this.#isDisabled);
    else return;
    event.preventDefault();
    toggles.forEach((t, i) => t.setAttribute('tabindex', i === next ? '0' : '-1'));
    toggles[next]?.focus();
  };

  /** @override */
  render() {
    const describedBy = this.describedByIds().join(' ');
    const label = this.label ? html`<span part="label" id=${this.#labelId}>${this.label}</span>` : nothing;

    const body = html`<div part="group" role="group" aria-labelledby=${this.label ? this.#labelId : nothing} aria-describedby=${describedBy || nothing}><slot @slotchange=${this.#sync}></slot></div>`;

    return renderFieldLayout(this, label, body);
  }
}
