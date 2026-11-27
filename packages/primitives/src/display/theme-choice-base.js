import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { readStored, resolveTarget, watchTheme, writeStored } from '../internal/theme-store.js';

/** @typedef {{ value: string }} ThemeChoiceOption */

const never = () => false;

/**
 * Shared by the theme toggle and the theme picker: an APG radio group whose choice is applied to a
 * target element, stored in `localStorage` and read back on the next visit. The checked option
 * follows the target's attribute, so several controls on one page (or a change made with the
 * tokens API) stay in step.
 *
 * Subclasses provide the option list, the storage key, how a choice is applied and read back, and
 * each option's content.
 */
export class FocsdThemeChoiceBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    target: {},
    storageKeyPrefix: { attribute: 'storage-key-prefix' },
    label: {},
  };

  /** Storage key after the prefix. */
  static storageKey = '';

  /** Translation key of the group's default name. */
  static groupTerm = '';

  /** @type {(() => void) | null} */
  #unwatch = null;

  constructor() {
    super();
    /** CSS selector of the element the choice applies to; empty for `<html>`. Changing it re-targets the control. */
    this.target = '';
    /**
     * Prefix of the `localStorage` keys the choice is stored under. The `noFlashScript` of
     * `@focsd-dev/tokens` reads the default `focsd-` keys only: with another prefix, write your own
     * inline snippet to restore the choice before first paint.
     */
    this.storageKeyPrefix = 'focsd-';
    /** The accessible name of the group (default: a translated name). */
    this.label = '';
  }

  /**
   * This element with its `value`, which each subclass declares (reflected) with its own type,
   * default and docs, so the manifest documents it there.
   */
  get #self() {
    return /** @type {this & { value: string }} */ (this);
  }

  /** @type {typeof FocsdThemeChoiceBase} */
  get #ctor() {
    return /** @type {typeof FocsdThemeChoiceBase} */ (this.constructor);
  }

  /**
   * The options, in order.
   * @returns {ThemeChoiceOption[]}
   */
  options() {
    return [];
  }

  /**
   * The value a target shows now.
   * @param {Element} _target
   * @returns {string}
   */
  readTarget(_target) {
    return '';
  }

  /**
   * Apply a value to the target.
   * @param {string} _value
   * @param {HTMLElement} _target
   */
  applyTo(_value, _target) {}

  /**
   * The value to store for a choice (null removes the key).
   * @param {string} value
   * @returns {string | null}
   */
  storedValue(value) {
    return value || null;
  }

  /**
   * An option's content.
   * @param {ThemeChoiceOption} _option
   * @param {boolean} _checked
   * @returns {unknown}
   */
  renderOption(_option, _checked) {
    return '';
  }

  /** @param {string} value */
  #isOption(value) {
    return this.options().some((o) => o.value === value);
  }

  /** True once the control has connected: an author's `value` attribute counts on the first connect only. */
  #connected = false;

  /**
   * Resolve the target, restore the choice onto it and follow it. An author-set `value` (the
   * attribute, on the first connect) wins over storage and is stored; otherwise the stored choice
   * is applied.
   * @param {boolean} authored
   */
  #attach(authored) {
    this.#unwatch?.();
    this.#unwatch = null;
    const target = resolveTarget(this.target);

    if (!target) return;
    const { storageKeyPrefix: prefix } = this;
    const key = this.#ctor.storageKey;
    const stored = readStored(prefix, key);

    if (authored && this.#isOption(this.#self.value)) {
      this.applyTo(this.#self.value, target);
      writeStored(prefix, key, this.storedValue(this.#self.value));
    } else if (stored !== null && this.#isOption(stored)) this.applyTo(stored, target);
    this.#self.value = this.readTarget(target);
    this.#unwatch = watchTheme(target, () => {
      this.#self.value = this.readTarget(target);
      this.requestUpdate();
    });
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#attach(!this.#connected && this.hasAttribute('value'));
    this.#connected = true;
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#unwatch?.();
    this.#unwatch = null;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (this.hasUpdated && changed.has('target')) this.#attach(false);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    const target = resolveTarget(this.target);

    if (
      /** @type {Map<PropertyKey, unknown>} */ (changed).has('value') &&
      target &&
      this.#isOption(this.#self.value) &&
      this.readTarget(target) !== this.#self.value
    )
      this.applyTo(this.#self.value, target);
  }

  /**
   * The user's choice: apply, store and announce it.
   * @param {string} value
   */
  #choose(value) {
    if (value === this.#self.value) return;
    const target = resolveTarget(this.target);

    if (target) this.applyTo(value, target);
    writeStored(this.storageKeyPrefix, this.#ctor.storageKey, this.storedValue(value));
    this.#self.value = value;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {Event} event */
  #radioOf(event) {
    return /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest('[role="radio"]'));
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const radio = this.#radioOf(event);

    if (radio?.dataset.value !== undefined) this.#choose(radio.dataset.value);
  };

  /**
   * Index the key moves to, or -1 for a key the group does not handle.
   * @param {string} key
   * @param {number} current
   * @param {number} count
   */
  #step(key, current, count) {
    const rtl = getComputedStyle(this).direction === 'rtl';

    if (key === 'ArrowDown' || key === (rtl ? 'ArrowLeft' : 'ArrowRight')) return nextIndex(current, 1, count, never);

    if (key === 'ArrowUp' || key === (rtl ? 'ArrowRight' : 'ArrowLeft')) return nextIndex(current, -1, count, never);

    if (key === 'Home') return edgeIndex('first', count, never);

    if (key === 'End') return edgeIndex('last', count, never);

    return key === ' ' ? current : -1;
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = async (event) => {
    const radios = [...this.renderRoot.querySelectorAll('[role="radio"]')];
    const radio = this.#radioOf(event);

    if (!radio || event.altKey || event.ctrlKey || event.metaKey) return;
    const next = this.#step(event.key, radios.indexOf(radio), radios.length);

    if (next < 0) return;
    event.preventDefault();
    const option = /** @type {HTMLElement} */ (radios[next]);
    this.#choose(/** @type {string} */ (option.dataset.value));
    await this.updateComplete;
    option.focus();
  };

  /** @override */
  render() {
    const options = this.options();

    const stop = Math.max(
      0,
      options.findIndex((o) => o.value === this.#self.value),
    );

    return html`<div
      part="group"
      role="radiogroup"
      aria-label=${this.label || this.localize.term(this.#ctor.groupTerm)}
      @click=${this.#onClick}
      @keydown=${this.#onKeyDown}
    >
      ${options.map((option, i) => {
        const checked = option.value === this.#self.value;

        return html`<div
          part=${checked ? 'option option-checked' : 'option'}
          role="radio"
          aria-checked=${checked ? 'true' : 'false'}
          tabindex=${i === stop ? '0' : '-1'}
          data-value=${option.value}
        >
          ${this.renderOption(option, checked)}
        </div>`;
      })}
    </div>`;
  }
}
