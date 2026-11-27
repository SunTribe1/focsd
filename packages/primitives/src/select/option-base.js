import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';
import { labelText } from '../internal/text.js';

/**
 * Brand of an element that owns options and manages their selection (focsd-select). A brand, not
 * an `instanceof` test, so this module needs no import of the select (no import cycle).
 */
export const OPTION_OWNER = Symbol('focsd-option-owner');

/** Brand of a focsd-option-group (see OPTION_OWNER). */
export const OPTION_GROUP = Symbol('focsd-option-group');

/** @typedef {import('./select-base.js').FocsdSelectBase} OptionOwner A type-only reference: no import cycle at run time. */

/**
 * @param {Element | null} el
 * @returns {el is OptionOwner}
 */
const isOptionOwner = (el) => Boolean(el && /** @type {Record<symbol, unknown>} */ (/** @type {unknown} */ (el))[OPTION_OWNER]);

/**
 * @param {Element | null} el
 * @returns {el is import('./option-group-base.js').FocsdOptionGroupBase}
 */
const isOptionGroup = (el) => Boolean(el && /** @type {Record<symbol, unknown>} */ (/** @type {unknown} */ (el))[OPTION_GROUP]);

/**
 * An option. Sets its own role/id/tabindex; focsd-select manages aria-selected.
 *
 * Mirrors the native <option> API: the `selected` attribute is `defaultSelected` (the initial and
 * reset selection); the `selected` property is the current selection.
 *
 * @slot - Default content.
 * @slot icon - Any icon markup before the label (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon wrapper (decorative).
 */
export class FocsdOptionBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    value: {},
    disabled: { type: Boolean, reflect: true },
    defaultSelected: { type: Boolean, attribute: 'selected', reflect: true },
  };

  #selected = false;

  /** Set once `selected` is assigned directly; then `defaultSelected` no longer drives it. */
  #dirty = false;

  constructor() {
    super();
    /** An icon before the label: a name from the default icon library (or `icon-library`). For any other icon kit, put it in `slot="icon"`. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** The option's value; defaults to its text. */
    this.value = '';
    /** Disables the option. */
    this.disabled = false;
    /** Selects the option by default, as on `<option selected>`. */
    this.defaultSelected = false;
  }

  /**
   * The owning focsd-select, if any (directly, or through a focsd-option-group).
   * @returns {OptionOwner | null}
   */
  get #owner() {
    const parent = this.parentElement;

    if (isOptionOwner(parent)) return parent;

    return isOptionGroup(parent) && isOptionOwner(parent.parentElement) ? parent.parentElement : null;
  }

  /**
   * The focsd-option-group this option is in, if any.
   * @returns {import('./option-group-base.js').FocsdOptionGroupBase | null}
   */
  get group() {
    const parent = this.parentElement;

    return isOptionGroup(parent) ? parent : null;
  }

  /**
   * Disabled itself, by its group, or because a multiple select reached its maximum.
   * @returns {boolean}
   * @override
   */
  get inert() {
    return this.disabled || Boolean(this.group?.disabled) || Boolean(this.#owner?._blocked(this));
  }

  /** Internal: reflect the effective disabled state as aria-disabled. */
  _syncDisabled() {
    if (this.inert) this.setAttribute('aria-disabled', 'true');
    else this.removeAttribute('aria-disabled');
  }

  /** Text content with whitespace collapsed, like native `option.text`. */
  get text() {
    return labelText(this);
  }

  /** Text shown in the trigger and used for typeahead: the `label` attribute, else the text. */
  get label() {
    return this.getAttribute('label') ?? this.text;
  }
  set label(value) {
    this.setAttribute('label', String(value));
  }

  /**
   * Position in the owning select's options (0 when not in a select).
   * @returns {number}
   */
  get index() {
    return Math.max(0, this.#owner?.options.indexOf(this) ?? 0);
  }

  /**
   * Whether the option is selected now; `selected` (the attribute) sets the default.
   * @returns {boolean}
   */
  get selected() {
    const owner = this.#owner;

    return owner && !owner.multiple ? owner.selectedOption === this : this.#selected;
  }
  /** @param {boolean} value */
  set selected(value) {
    this.#dirty = true;
    this._setSelected(Boolean(value));
    this.#owner?._optionSelected(this, Boolean(value));
  }

  /**
   * Internal: set the selection flag without notifying the owner.
   * @param {boolean} value
   */
  _setSelected(value) {
    if (this.#selected === value) return;
    this.#selected = value;
    // A single select derives selection from its value and sets aria-selected itself.
    const owner = this.#owner;

    if (!owner || owner.multiple) this.setAttribute('aria-selected', String(value));
  }

  /** Internal: the selection to start from: set through `selected`, else the `selected` attribute. */
  get _initiallySelected() {
    return this.#dirty ? this.#selected : this.defaultSelected;
  }

  /** Internal: back to the default selection (form reset). */
  _reset() {
    this.#dirty = false;
    this._setSelected(this.defaultSelected);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    if (!(/** @type {HTMLElement} */ (this).id)) this.id = uid('focsd-option');
    this.setAttribute('role', 'option');
    this.setAttribute('tabindex', '-1');

    if (!this.hasAttribute('aria-selected')) this.setAttribute('aria-selected', 'false');
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (changed.has('defaultSelected') && !this.#dirty) this._setSelected(this.defaultSelected);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('defaultSelected') && !this.#dirty) this.#owner?._optionSelected(this, this.defaultSelected, true);

    if (changed.has('disabled')) this._syncDisabled();
  }

  /** @override */
  render() {
    return html`${leadingIcon(this)}<slot></slot>`;
  }
}
