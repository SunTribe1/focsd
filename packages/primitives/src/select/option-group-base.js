import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FocsdOptionBase, OPTION_GROUP } from './option-base.js';

/**
 * A labeled group of options, like a native <optgroup>. Works in focsd-select, focsd-combobox and
 * focsd-multi-select. `disabled` disables every option in it.
 *
 * @slot - The options.
 * @csspart label - The group label (presentational: the group is named by `aria-label`).
 */
export class FocsdOptionGroupBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, disabled: { type: Boolean, reflect: true } };

  constructor() {
    super();
    /** The group's heading. */
    this.label = '';
    /** Disables every option in the group. */
    this.disabled = false;
  }

  /** The options in this group. */
  get options() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdOptionBase);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'group');
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('label')) this.setAttribute('aria-label', this.label);

    if (changed.has('disabled')) for (const option of this.options) option._syncDisabled();
  }

  /** @override */
  render() {
    return html`<div part="label" aria-hidden="true">${this.label}</div>
      <slot @slotchange=${() => /** @type {{ _optionsChanged?: () => void } | null} */ (this.parentElement)?._optionsChanged?.()}></slot>`;
  }
}

// The brand focsd-option reads (see OPTION_GROUP); set on the prototype so it stays out of the public API.
Object.defineProperty(FocsdOptionGroupBase.prototype, OPTION_GROUP, { value: true });
