import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { readOptions } from '../internal/options.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { typeaheadIndex } from '../internal/typeahead.js';
import { fold } from '../internal/text.js';
import { iconSvg } from '../internal/icons.js';
import { uid } from '../internal/id.js';
import { FocsdOptionBase } from './option-base.js';
import { FocsdOptionGroupBase } from './option-group-base.js';

/**
 * An option as plain data (the shape `readOptions` returns).
 * @typedef {object} ListboxOption
 * @property {string} value
 * @property {string} label
 * @property {boolean} disabled
 * @property {string} group Label of the option's group, or ''.
 */

/** @typedef {ListboxOption[]} ListboxOptions The options, in order. */

/**
 * The option attributes (and text) that change the rendered rows. `aria-label` is how a
 * focsd-option-group reflects its `label` property. An option's `value` set only as a property
 * (no attribute) is not seen until the next re-read; set the attribute instead.
 */
/** Characters typed within this many milliseconds of each other search together. */
const TYPEAHEAD_MS = 500;

const OPTION_ATTRIBUTES = ['value', 'label', 'disabled', 'selected', 'aria-label'];

/**
 * A value list from anything: an array of values, one value, or nothing. Never throws; every
 * entry becomes a string, and null or undefined entries are dropped.
 * @param {unknown} input
 * @returns {string[]}
 */
const toValues = (input) => {
  if (input === null || input === undefined || input === '') return [];

  return Array.isArray(input) ? input.flatMap((v) => (v === null || v === undefined ? [] : [String(v)])) : [String(input)];
};

/**
 * Headless, form-associated listbox: an always-visible list of options to choose one value from
 * (or several with `multiple`). The slotted `focsd-option` and `focsd-option-group` children are
 * data: they sit in a slot inside a hidden wrapper (axe does not see a hidden slot
 * itself, so a bare `<slot hidden>` leaves their `role="option"` checked), and the listbox renders its own `role="option"`
 * rows, so `aria-activedescendant` never crosses a shadow root.
 *
 * Focus stays on the listbox. With one value, the selection follows the active option; with
 * `multiple`, Space toggles the active option, Shift+arrow and Shift+Space select from the anchor,
 * and Ctrl/⌘+A selects every enabled option (or none when all are selected). The form gets one
 * entry per selected value. An option's `selected` attribute is its default selection, used when
 * there is no `value` attribute, and again on form reset. Give each option its `value` as an
 * attribute: a `value` set only as a property on a `focsd-option` is not seen until the options are
 * next re-read.
 *
 * @fires input - Fired on every user change of the selection.
 * @fires change - Fired with `input` when the user changes the selection.
 * @slot - The `focsd-option` and `focsd-option-group` children (data; not rendered themselves).
 * @csspart layout - The wrapper holding the label and the body; its `data-position` is the label position.
 * @csspart body - The listbox, then the hint and the message.
 * @csspart label - The label element.
 * @csspart listbox - The `role="listbox"` box that takes focus.
 * @csspart option - One option row; also `active` for the active option and `selected` when chosen.
 * @csspart active - The active option row.
 * @csspart selected - A selected option row.
 * @csspart group - A group of options.
 * @csspart group-label - A group's visible label (the group is named by `aria-label`).
 * @csspart check - The check mark of a selected option (with `multiple`).
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message (also named by its kind).
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The live region that announces a changed message.
 */
export class FocsdListboxBase extends FormControlMixin(FocsdElement) {
  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    // Own accessors: the selection is kept as a list, and `value` is its first entry.
    value: { noAccessor: true },
    values: { attribute: false, noAccessor: true },
    multiple: { type: Boolean, reflect: true },
    orientation: { reflect: true },
    _options: { state: true },
    _active: { state: true },
    _focused: { state: true },
  };

  #ids = { label: uid('focsd-listbox-label'), listbox: uid('focsd-listbox') };

  /** The chosen values as written (may name options that are not there yet). @type {string[]} */
  #chosen = [];

  /** False until the selection is written (by code, the user or a restore): defaults apply. */
  #explicit = false;

  /** The option range selection starts from (multiple), or -1. */
  #anchor = -1;

  /** The selection outside the Shift range: what was selected when the anchor was set. */
  #base = /** @type {string[]} */ ([]);

  /** Characters typed in quick succession, and when the last one came (typeahead). */
  #typed = '';

  #typedAt = 0;

  /** @type {MutationObserver | undefined} */
  #observer;

  constructor() {
    super();
    /** The visible label, which names the listbox. */
    this.label = '';
    /** Allows more than one selected option; the form then gets one entry per value. */
    this.multiple = false;
    /**
     * Direction the options run, and so which arrow keys move: Up and Down, or Left and Right.
     * @type {'vertical' | 'horizontal'}
     */
    this.orientation = 'vertical';
    /** @internal */
    this._options = /** @type {ListboxOptions} */ ([]);
    // The active option's index, or -1.
    /** @internal */
    this._active = -1;
    /** @internal */
    this._focused = false;
  }

  /** The first selected value, or '' when none. Setting it selects only that option. */
  get value() {
    return this.values[0] ?? '';
  }
  set value(value) {
    this.#write(toValues(value).slice(0, 1));
  }

  /**
   * The selected values in option order (one at most without `multiple`). Setting it selects the
   * options with those values; values no option has select nothing (until such an option is added).
   * @returns {string[]}
   */
  get values() {
    const written = this.#explicit ? this.#chosen : this.#defaults();
    const known = new Set(this._options.map((o) => o.value));

    // One value: the first written value an option has, not the first in option order.
    if (!this.multiple) return written.filter((v) => known.has(v)).slice(0, 1);
    const chosen = new Set(written);

    return [...known].filter((v) => chosen.has(v));
  }
  set values(values) {
    this.#write(toValues(values));
  }

  /** @param {string[]} values */
  #write(values) {
    const old = this.values;
    this.#chosen = values;
    this.#explicit = true;
    this.requestUpdate('values', old);
  }

  /** The default selection: the `value` attribute, else the options with a `selected` attribute. */
  #defaults() {
    if (this.hasAttribute('value')) return toValues(this.defaultValue);

    return [...(this.children ?? [])]
      .flatMap((c) => (c instanceof FocsdOptionBase ? [c] : c instanceof FocsdOptionGroupBase ? c.options : []))
      .flatMap((o) => (o.defaultSelected ? [o.value || o.label] : []));
  }

  /** The listbox element carries forwarded ARIA and anchors validation, even while disabled. */
  get ariaTarget() {
    return /** @type {HTMLElement | undefined} */ (this.renderRoot?.querySelector?.('[part~="listbox"]') ?? undefined);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#readOptions();
    // slotchange misses label, disabled and text edits on options that stay.
    this.#observer ??= new MutationObserver(() => this.#readOptions());
    this.#observer.observe(this, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: OPTION_ATTRIBUTES,
    });
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** @internal A focsd-option-group's options changed. */
  _optionsChanged() {
    this.#readOptions();
  }

  #readOptions = () => {
    const before = this._options;
    this._options = readOptions(this);

    // Indexes follow the options: the active option and the anchor are found again by value.
    const find = (/** @type {number} */ index) => {
      const value = before[index]?.value;

      return value === undefined ? -1 : this._options.findIndex((o) => o.value === value);
    };

    this._active = find(this._active);
    this.#anchor = find(this.#anchor);
  };

  /** @param {number} index */
  #optionId(index) {
    return `${this.#ids.listbox}-${index}`;
  }

  /** @param {number} index */
  #isDisabled = (index) => !this._options[index] || this._options[index].disabled;

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    super.updated(changed);
    const values = this.values;
    const listbox = this.ariaTarget;
    const id = this._focused && this._options[this._active] ? this.#optionId(this._active) : '';

    // Set after the rows render, so the reference never points at a row that does not exist yet.
    if (id) listbox?.setAttribute('aria-activedescendant', id);
    else listbox?.removeAttribute('aria-activedescendant');

    if (id && changed.has('_active')) this.renderRoot.querySelector(`#${id}`)?.scrollIntoView?.({ block: 'nearest' });

    this.internals.setFormValue(this.#formValue(values));

    if (this.required && !values.length) this.setValidityState({ valueMissing: true }, this.localize.term('selectOption'), listbox);
    else this.setValidityState({});
  }

  /** @param {string[]} values */
  #formValue(values) {
    if (!this.multiple) return values[0] ?? null;

    if (!this.name || !values.length) return null;
    const data = new FormData();

    for (const value of values) data.append(this.name, value);

    return data;
  }

  formResetCallback() {
    this.#chosen = [];
    this.#explicit = false;
    this.#anchor = -1;
    this._active = -1;
    this.requestUpdate();
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.#anchor = -1;
    this._active = -1;
    // Unknown values are dropped by `values`, so a stale state cannot select a missing option.
    this.values =
      state instanceof FormData ? state.getAll(this.name).flatMap((v) => (v instanceof File ? [] : [v])) : toValues(restoredText(state));
  }

  /**
   * Select `values` as the user did, firing `input` and `change` when the selection changed.
   * @param {string[]} values
   */
  #choose(values) {
    const before = this.values.join('\n');
    this.values = values;

    if (this.values.join('\n') !== before) this.emitValue();
  }

  /** @param {number} index */
  #toggle(index) {
    const option = this._options[index];

    if (!option || option.disabled) return;
    const values = this.values;
    this.#anchor = index;
    this.#choose(values.includes(option.value) ? values.filter((v) => v !== option.value) : [...values, option.value]);
    this.#base = this.values;
  }

  /**
   * Select the enabled options from the anchor to `index`, on top of what was selected when the
   * anchor was set: moving back toward the anchor deselects (multiple).
   * @param {number} index
   */
  #selectRange(index) {
    if (this.#anchor < 0) this.#setAnchor(index);
    const [from, to] = [Math.min(this.#anchor, index), Math.max(this.#anchor, index)];
    const range = this._options.flatMap((o, i) => (i >= from && i <= to && !o.disabled ? [o.value] : []));
    this.#choose([...new Set([...this.#base, ...range])]);
  }

  /** @param {number} index */
  #setAnchor(index) {
    this.#anchor = index;
    this.#base = this.values;
  }

  /** Select every enabled option, or none when all of them are already selected. */
  #selectAll() {
    const enabled = this._options.flatMap((o) => (o.disabled ? [] : [o.value]));
    const values = this.values;
    const all = enabled.every((v) => values.includes(v));
    this.#choose(all ? values.filter((v) => !enabled.includes(v)) : [...values, ...enabled]);
  }

  /**
   * Make `index` the active option; with one value, also select it.
   * @param {number} index
   * @param {boolean} [extend] Shift was held: select from the anchor (multiple).
   */
  #activate(index, extend = false) {
    if (index < 0) return;
    const previous = this._active;
    this._active = index;

    if (!this.multiple) this.#choose([/** @type {ListboxOption} */ (this._options[index]).value]);
    else if (extend) {
      if (this.#anchor < 0) this.#setAnchor(previous < 0 ? index : previous);
      this.#selectRange(index);
    }
  }

  /**
   * The next enabled index by `delta`, stopping at the ends (an APG listbox does not wrap).
   * @param {1 | -1} delta
   */
  #step(delta) {
    const count = this._options.length;
    const current = this._active;

    if (current < 0) return edgeIndex(delta > 0 ? 'first' : 'last', count, this.#isDisabled);
    const next = nextIndex(current, delta, count, this.#isDisabled);

    return delta > 0 === next > current ? next : current;
  }

  /**
   * The move a navigation key asks for: 1 or -1 for the arrows of this orientation (Left and Right
   * mirrored in right-to-left text), 'first' or 'last' for Home and End, or 0.
   * @param {string} key
   * @returns {1 | -1 | 'first' | 'last' | 0}
   */
  #move(key) {
    if (key === 'Home') return 'first';

    if (key === 'End') return 'last';

    if (this.orientation !== 'horizontal') return key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0;
    const forward = getComputedStyle(this).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = forward === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';

    return key === forward ? 1 : key === back ? -1 : 0;
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (this.isDisabled || event.altKey) return;
    const move = this.#move(event.key);

    if (move !== 0) {
      event.preventDefault();
      const count = this._options.length;
      this.#activate(move === 'first' || move === 'last' ? edgeIndex(move, count, this.#isDisabled) : this.#step(move), event.shiftKey);

      return;
    }

    if (this.#onSelectionKey(event)) return;

    if ([...event.key].length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey) this.#typeahead(event);
  };

  /**
   * Typeahead: characters typed within 500 ms of each other search together ("eco" finds "Economy");
   * one character repeated cycles through the options starting with it.
   * @param {KeyboardEvent} event
   */
  #typeahead(event) {
    this.#typed = event.timeStamp - this.#typedAt > TYPEAHEAD_MS ? event.key : this.#typed + event.key;
    this.#typedAt = event.timeStamp;
    const repeated = [...this.#typed].every((c) => c === event.key);
    const search = repeated ? event.key : this.#typed;
    // Folded, so "e" finds "É" and "l" does not find "ł"; scripts without case match as typed.
    // A longer search may stay on the active option, so it starts there.
    const from = repeated ? this._active : this._active - 1;
    const labels = this._options.map((o) => fold(o.label));
    let next = typeaheadIndex(labels, Math.max(from, -1), fold(search), this.#isDisabled);

    // No option starts with the whole run: start a new search from this character.
    if (next < 0 && !repeated) {
      this.#typed = event.key;
      next = typeaheadIndex(labels, this._active, fold(event.key), this.#isDisabled);
    }

    if (next < 0) return;
    event.preventDefault();
    this.#activate(next);
  }

  /**
   * Space, and Ctrl/⌘+A with `multiple`. Returns true when the key was handled.
   * @param {KeyboardEvent} event
   */
  #onSelectionKey(event) {
    if (!this.multiple) {
      if (event.key !== ' ') return false;
      // Space on a single listbox selects the active option (already selected); never scroll.
      event.preventDefault();

      if (this._active < 0) this.#activate(this.#step(1));

      return true;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.#selectAll();

      return true;
    }

    if (event.key !== ' ' || event.ctrlKey || event.metaKey) return false;
    event.preventDefault();

    if (this._active < 0) this._active = this.#step(1);
    else if (event.shiftKey) this.#selectRange(this._active);
    else this.#toggle(this._active);

    return true;
  }

  /** On focus, the active option is the first selected enabled option, else the first enabled one. */
  #onFocus = () => {
    // A disabled listbox can still take focus from a click (tabindex -1): show no active option.
    if (this.isDisabled) return;
    this._focused = true;

    if (this._options[this._active] && !this.#isDisabled(this._active)) return;
    const values = this.values;
    const selected = this._options.findIndex((o, i) => values.includes(o.value) && !this.#isDisabled(i));
    this._active = selected >= 0 ? selected : edgeIndex('first', this._options.length, this.#isDisabled);
  };

  // Keep the active option on blur (a window or tab switch is not leaving); only its cue hides.
  #onBlur = () => {
    this._focused = false;
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const row = /** @type {HTMLElement | null} */ (/** @type {Element} */ (event.target).closest?.('[role="option"]'));
    const index = Number(row?.dataset.index ?? -1);

    if (this.isDisabled || index < 0 || this.#isDisabled(index)) return;
    this._active = index;

    if (this.multiple) this.#toggle(index);
    else this.#choose([/** @type {ListboxOption} */ (this._options[index]).value]);
  };

  /**
   * @param {ListboxOption} option
   * @param {number} index
   * @param {string[]} values
   */
  #renderOption(option, index, values) {
    const selected = values.includes(option.value);
    const parts = ['option', this._focused && index === this._active ? 'active' : '', selected ? 'selected' : ''].filter(Boolean).join(' ');

    const check = this.multiple
      ? html`<span part="check" aria-hidden="true">${selected ? iconSvg('check', 'icon') : nothing}</span>`
      : nothing;

    return html`<div
      part=${parts}
      id=${this.#optionId(index)}
      role="option"
      data-index=${index}
      aria-selected=${String(selected)}
      aria-disabled=${option.disabled ? 'true' : nothing}
    >${check}<span>${option.label}</span></div>`;
  }

  /** Rows, with consecutive options of the same group inside one named group. */
  #renderRows() {
    const values = this.values;
    /** @type {{ group: string, items: number[] }[]} */
    const sections = [];
    this._options.forEach((option, i) => {
      const last = sections.at(-1);

      if (last && option.group && last.group === option.group) last.items.push(i);
      else sections.push({ group: option.group, items: [i] });
    });

    return sections.map(({ group, items }) => {
      const rows = items.map((i) => this.#renderOption(/** @type {ListboxOption} */ (this._options[i]), i, values));

      return group
        ? html`<div part="group" role="group" aria-label=${group}><div part="group-label" aria-hidden="true">${group}</div>${rows}</div>`
        : rows;
    });
  }

  /** @override */
  render() {
    const ids = this.#ids;
    /* eslint-disable lit-a11y/click-events-have-key-events -- the label is a pointer convenience; the listbox has the keyboard */
    const label = html`<span part="label" id=${ids.label} @click=${() => this.ariaTarget?.focus()}>${this.label}</span>`;
    const describedBy = this.describedByIds().join(' ');

    // Rows are chosen by pointer here; the keyboard works on the focused listbox (aria-activedescendant).
    const body = html`<div
        part="listbox"
        id=${ids.listbox}
        role="listbox"
        tabindex=${this.isDisabled ? '-1' : '0'}
        aria-labelledby=${ids.label}
        aria-describedby=${describedBy || nothing}
        aria-multiselectable=${this.multiple ? 'true' : nothing}
        aria-orientation=${this.orientation === 'horizontal' ? 'horizontal' : 'vertical'}
        aria-required=${this.required ? 'true' : nothing}
        aria-disabled=${this.isDisabled ? 'true' : nothing}
        @keydown=${this.#onKeyDown}
        @focus=${this.#onFocus}
        @blur=${this.#onBlur}
        @click=${this.#onClick}
      >
        ${this.#renderRows()}
      </div>
      <div hidden><slot @slotchange=${this.#readOptions}></slot></div>`;
    /* eslint-enable lit-a11y/click-events-have-key-events */

    return renderFieldLayout(this, label, body);
  }
}
