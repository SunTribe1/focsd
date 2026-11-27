import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { VisualViewportController } from '../internal/viewport.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { readOptions, stepIndex } from '../internal/options.js';
import { onFocusLeave } from '../internal/popup.js';
import { queryMatcher } from '../internal/text.js';
import { iconSvg } from '../internal/icons.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';

/** @typedef {import('../internal/options.js').ComboboxOption} ComboboxOption */

/** @typedef {ComboboxOption | typeof ALL} ComboboxRow */

/** The "Select all" row at the top of a multiple list. */
const ALL = Object.freeze({ all: true });

/**
 * APG combobox (list autocomplete). Options are data read from slotted FocsdOptionBase children (and
 * focsd-option-group children) and rendered inside the shadow root, so aria-activedescendant never
 * crosses a shadow boundary. Typing filters the list; groups with no match are hidden.
 *
 * With `multiple`, options toggle, chosen values show as removable tags, the form receives one
 * entry per value, and `value` is the comma-separated list. `max` caps how many can be chosen and
 * `select-all` adds a Select all row at the top of the list. `clearable` adds a clear button.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart active - Added to the highlighted option.
 * @csspart layout - The wrapper holding the label and the body; its `data-position` is the label position.
 * @csspart body - The field, then the hint and the message.
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message (also named by its kind).
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The live region that announces a changed message.
 * @csspart control - The control element.
 * @csspart field - The bordered row holding the chosen tags, the input and the clear button.
 * @csspart label - The label element.
 * @csspart popup - The popup holding the listbox.
 * @csspart listbox - The listbox element.
 * @csspart option - The option element.
 * @csspart group - An option group.
 * @csspart group-label - An option group's label.
 * @csspart select-all - The Select all row (with `multiple select-all`).
 * @csspart clear - The clear button (with `clearable`).
 * @csspart status - The status element.
 * @csspart tags - The chosen values (with `multiple`).
 * @csspart tag - A chosen value.
 * @csspart remove - A chosen value's remove button.
 */
export class FocsdComboboxBase extends FormControlMixin(FocsdElement) {
  /** `readonly` applies here (no edits, barred from validation), as on native text-like inputs. */
  static supportsReadOnly = true;

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    placeholder: {},
    allowCustom: { type: Boolean, attribute: 'allow-custom' },
    autocomplete: {},
    multiple: { type: Boolean, reflect: true },
    clearable: { type: Boolean, reflect: true },
    selectAll: { type: Boolean, attribute: 'select-all', reflect: true },
    max: { type: Number },
    _text: { state: true },
    _query: { state: true },
    _open: { state: true },
    _active: { state: true },
    _options: { state: true },
  };

  /** For subclasses: the IDs of the label, input and listbox in the shadow root. */
  ids = { label: uid('focsd-combobox-label'), input: uid('focsd-combobox-input'), listbox: uid('focsd-combobox-listbox') };

  /** @type {MutationObserver | null} */
  #observer = null;

  #typed = false;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The chosen value; with `multiple`, a comma-separated list. */
    this.value = '';
    /** Placeholder text for the input. */
    this.placeholder = '';
    /** Accepts typed text that matches no option as the value. */
    this.allowCustom = false;
    /** @type {AutoFill} Browser autofill token for the input (e.g. `country-name`, WCAG 1.3.5); `off` by default. */
    this.autocomplete = 'off';
    /** Lets several options be chosen; they show as removable tags. */
    this.multiple = false;
    /** Adds a button that clears the value. */
    this.clearable = false;
    /** With `multiple`, adds a Select all row at the top of the list. */
    this.selectAll = false;
    /** With `multiple`, the most options that can be chosen; 0 means no limit. */
    this.max = 0;
    this._text = '';
    this._query = '';
    this._open = false;
    this._active = -1;
    /** @type {ComboboxOption[]} */
    this._options = [];
    onFocusLeave(this, () => {
      this.close();
      this.#settle();
    });
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this._options = readOptions(this);
    this.#observer ??= new MutationObserver(() => {
      this._options = readOptions(this);
    });
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true });
  }

  #viewport = new VisualViewportController(this);

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /**
   * For subclasses: the text input in the shadow root.
   * @returns {HTMLInputElement | null}
   */
  get input() {
    return this.renderRoot.querySelector('input[role="combobox"]');
  }

  /**
   * The input carries forwarded ARIA and aria-invalid. The first control-like element in tree order
   * can be a chosen tag's remove button, so the default lookup would pick that instead.
   * @returns {HTMLElement | undefined}
   */
  get ariaTarget() {
    return this.input ?? undefined;
  }

  /**
   * For subclasses: the listbox in the shadow root.
   * @returns {HTMLElement | null}
   */
  get listbox() {
    return this.renderRoot.querySelector('[role="listbox"]');
  }

  /** @returns {HTMLElement | null} */
  get #popup() {
    return this.renderRoot.querySelector('[part~="popup"]');
  }

  /**
   * Options matching the typed query (all options when the query is empty).
   * @returns {ComboboxOption[]}
   */
  get filtered() {
    const matches = queryMatcher(this._query);

    return this._options.filter((o) => matches(o.label));
  }

  /**
   * The rows of the open list: the Select all row (when shown), then the filtered options.
   * @returns {ComboboxRow[]}
   */
  get rows() {
    const filtered = this.filtered;

    return this.multiple && this.selectAll && filtered.some((o) => !o.disabled) ? [ALL, ...filtered] : filtered;
  }

  /**
   * For subclasses: the ID of the rendered option at an index.
   * @param {number} index
   * @returns {string}
   */
  optionId(index) {
    return `${this.ids.listbox}-opt-${index}`;
  }

  /**
   * Chosen values (with `multiple`; the single value otherwise).
   * @returns {string[]}
   */
  get values() {
    if (!this.multiple) return this.value ? [this.value] : [];

    return this.value ? this.value.split(',').filter(Boolean) : [];
  }

  /**
   * Whether an option is selected.
   * @param {ComboboxOption} option
   * @returns {boolean}
   */
  isSelected(option) {
    return this.multiple ? this.values.includes(option.value) : option.value === this.value;
  }

  /**
   * Disabled, or a multiple combobox at its maximum and this option not chosen.
   * @param {ComboboxRow} row
   */
  #inert(row) {
    if (row === ALL) return false;
    const option = /** @type {ComboboxOption} */ (row);

    if (option.disabled) return true;

    return this.multiple && this.max > 0 && !this.isSelected(option) && this.values.length >= this.max;
  }

  /**
   * Text shown in the input when not typing.
   * @returns {string}
   */
  displayText() {
    if (this.multiple) return '';

    return this._options.find((o) => o.value === this.value)?.label ?? (this.allowCustom ? this.value : '');
  }

  /**
   * Form value: the selected value (or typed text with allow-custom); one entry per value with `multiple`.
   * @returns {string | FormData | null}
   */
  formValue() {
    if (!this.multiple) return this.value || null;

    if (!this.name || !this.values.length) return null;
    const data = new FormData();
    this.values.forEach((v) => data.append(this.name, v));

    return data;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (!this.#typed && (changed.has('value') || changed.has('_options') || changed.has('multiple'))) this._text = this.displayText();

    if ((changed.has('_options') || changed.has('_query')) && this._active >= this.rows.length) this._active = -1;
  }

  /** Discard typed text that did not become a selection: restore the selected label, or clear when emptied. */
  #settle() {
    if (!this.#typed || this.allowCustom) return;
    const cleared = !this._text.trim();
    this.clearText();

    if (cleared && this.value && !this.multiple) {
      this.value = '';
      this.emitValue();
    }

    this._text = this.displayText();
  }

  /** Clear typed text and the filter query without touching the value. */
  clearText() {
    this.#typed = false;
    this._text = '';
    this._query = '';
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.#typed = false;

    if (this.multiple && state instanceof FormData) this.value = state.getAll(this.name).join(',');
    else this.value = restoredText(state) ?? '';
  }

  /** @override */
  updated() {
    this.internals.setFormValue(this.formValue(), this.value);

    if (this.required && !this.value) this.setValidityState({ valueMissing: true }, this.localize.term('chooseOption'), this.input);
    else this.setValidityState({});
    const popup = this.#popup;
    const show = this._open && this.filtered.length > 0;

    if (popup && show && !popup.matches(':popover-open')) /** @type {HTMLElement} */ (popup).showPopover();

    if (popup && !show && popup.matches(':popover-open')) /** @type {HTMLElement} */ (popup).hidePopover();
    this.#viewport.set(show);
    /** @type {ShadowRoot} */ (this.renderRoot).getElementById?.(this.optionId(this._active))?.scrollIntoView?.({ block: 'nearest' });
  }

  formResetCallback() {
    this.#typed = false;
    this.close();
    this._query = '';
    this.value = this.defaultValue;
    this._text = this.displayText();
  }

  /** Open the list (does nothing while disabled or read-only). */
  open() {
    if (this.isDisabled || this.readOnly) return;
    this._open = true;
  }

  /** Close the list. */
  close() {
    this._open = false;
    this._active = -1;
  }

  /**
   * Select or toggle an option. Returns true when the list should stay open.
   * @param {ComboboxOption} option
   * @returns {boolean}
   */
  choose(option) {
    if (this.multiple) {
      const values = this.values;
      this.#setValues(values.includes(option.value) ? values.filter((v) => v !== option.value) : [...values, option.value]);

      return true;
    }

    this.#typed = false;
    this.value = option.value;
    this._text = option.label;
    this._query = '';
    this.emitValue();

    return false;
  }

  /** @param {string[]} values */
  #setValues(values) {
    this.value = values.join(',');
    this.emitValue();
  }

  /** Every matching option chosen, or the maximum reached: the row offers to deselect. */
  get #allChosen() {
    const choosable = this.filtered.filter((o) => !o.disabled);

    if (this.max > 0 && this.values.length >= this.max) return true;

    return choosable.length > 0 && choosable.every((o) => this.isSelected(o));
  }

  /** Select (up to `max`) or deselect every option matching the query. */
  #toggleAll() {
    const choosable = this.filtered.filter((o) => !o.disabled);

    if (this.#allChosen) {
      const drop = new Set(choosable.map((o) => o.value));
      this.#setValues(this.values.filter((v) => !drop.has(v)));

      return;
    }

    const values = [...this.values];

    for (const option of choosable) {
      if (values.includes(option.value)) continue;

      if (this.max > 0 && values.length >= this.max) break;
      values.push(option.value);
    }

    this.#setValues(values);
  }

  /** @param {string} value */
  #remove(value) {
    if (this.isDisabled) return;
    this.#setValues(this.values.filter((v) => v !== value));
    /** @type {HTMLElement} */ (this.input)?.focus();
  }

  /** Clear the value and the typed text (the clear button). */
  clear() {
    if (this.isDisabled || this.readOnly) return;
    this.clearText();
    this.value = '';
    this._text = '';
    this.emitValue();
    /** @type {HTMLElement} */ (this.input)?.focus();
  }

  /** @param {1 | -1} delta */
  #move(delta) {
    const rows = this.rows;

    if (!rows.length) return;
    this._active = stepIndex(this._active, delta, rows.length, (i) => this.#inert(/** @type {ComboboxRow} */ (rows[i])));
  }

  /** @param {number} index */
  #commit(index) {
    const row = this.rows[index];

    if (!row || this.#inert(row)) return;

    if (row === ALL) {
      this.#toggleAll();
      this._active = index;

      return;
    }

    const stayOpen = this.choose(/** @type {ComboboxOption} */ (row));

    if (!stayOpen) this.close();
    else this._active = this.rows.indexOf(row);
  }

  /** For subclasses: handles the input's `input` event (filters the list). */
  onInput = (/** @type {Event} */ event) => {
    this.#typed = true;
    this._text = /** @type {HTMLInputElement} */ (event.target).value;
    this._query = this._text;
    this._active = -1;

    if (this.allowCustom && !this.multiple) {
      // Typing an option's label exactly (any case) selects that option rather than free text.
      const typed = this._text.trim().toLocaleLowerCase();
      this.value = this._options.find((o) => o.label.toLocaleLowerCase() === typed)?.value ?? this._text;
    }

    this.open();
  };

  /** For subclasses: handles the input's keys. */
  onKeyDown = (/** @type {KeyboardEvent} */ event) => this.handleKey(event);

  /**
   * Keyboard handling for the input. Subclasses override and call super.handleKey(event).
   * @param {KeyboardEvent} event
   */
  handleKey(event) {
    if (this.multiple) {
      // A second Escape clears only the typed text: chosen values are never wiped by Escape.
      if (event.key === 'Escape' && !this._open) {
        event.preventDefault();
        this.clearText();

        return;
      }

      if (event.key === 'Backspace' && !this._text && this.values.length) {
        event.preventDefault();
        this.#setValues(this.values.slice(0, -1));

        return;
      }
    }

    switch (event.key) {
      case 'ArrowDown':
        if (!this._open) {
          this.open();

          if (!event.altKey) this.#move(1);
        } else this.#move(1);
        break;
      case 'ArrowUp':
        if (!this._open) this.open();
        this.#move(-1);
        break;
      case 'Enter':
        if (this._open && this._active >= 0) this.#commit(this._active);
        else if (this.allowCustom) {
          this.#typed = false;
          this.close();
          this.emitValue();
        } else return;
        break;
      case 'Escape':
        if (this._open) this.close();
        else {
          this.clearText();

          if (this.value) {
            this.value = '';
            this.emitValue();
          }
        }

        break;
      case 'Tab':
        this.close();

        return;
      default:
        return;
    }

    event.preventDefault();
  }

  /** For subclasses: content rendered before the input (the chosen tags when `multiple`). */
  renderBeforeInput() {
    if (!this.multiple) return nothing;
    const labelOf = (/** @type {string} */ v) => this._options.find((o) => o.value === v)?.label ?? v;

    return html`<ul part="tags">
      ${this.values.map(
        (v) =>
          html`<li part="tag">
            ${labelOf(v)}<button
              part="remove"
              type="button"
              aria-label=${this.localize.term('removeItem', labelOf(v))}
              ?disabled=${this.isDisabled}
              @click=${() => this.#remove(v)}
            >
              ${iconSvg('x')}
            </button>
          </li>`,
      )}
    </ul>`;
  }

  /** For subclasses: the live region that announces the number of matches. */
  renderStatus() {
    const full = this.multiple && this.max > 0 && this.values.length >= this.max ? this.localize.term('maxSelected', this.max) : '';

    if (!this._query) return full;
    const n = this.filtered.length;
    const count = n === 0 ? this.localize.term('noResults') : this.localize.term('resultCount', n);

    return full ? `${count} ${full}` : count;
  }

  /* eslint-disable lit-a11y/click-events-have-key-events -- focus stays in the input (aria-activedescendant); keys are handled there */
  /**
   * @param {ComboboxRow} row
   * @param {number} i
   */
  #renderRow(row, i) {
    const active = i === this._active;

    if (row === ALL) {
      return html`<div
        part="option select-all ${active ? 'active' : ''}"
        id=${this.optionId(i)}
        role="option"
        aria-selected=${String(this.#allChosen)}
        @pointerdown=${(/** @type {PointerEvent} */ e) => e.preventDefault()}
        @click=${() => this.#commit(i)}
      >
        ${this.localize.term(this.#allChosen ? 'deselectAll' : 'selectAll')}
      </div>`;
    }

    const option = /** @type {ComboboxOption} */ (row);

    return html`<div
      part="option ${active ? 'active' : ''}"
      id=${this.optionId(i)}
      role="option"
      aria-selected=${String(this.isSelected(option))}
      aria-disabled=${this.#inert(option) ? 'true' : nothing}
      @pointerdown=${(/** @type {PointerEvent} */ e) => e.preventDefault()}
      @click=${() => this.#commit(i)}
    >
      ${option.label}
    </div>`;
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */

  /** Rows grouped by their option group (consecutive rows in the same group share one group). */
  renderListOptions() {
    /** @type {{ group: string, items: [ComboboxRow, number][] }[]} */
    const sections = [];
    this.rows.forEach((row, i) => {
      const group = row === ALL ? '' : /** @type {ComboboxOption} */ (row).group;
      const last = sections.at(-1);

      if (last && last.group === group && group) last.items.push([row, i]);
      else sections.push({ group, items: [[row, i]] });
    });

    return sections.map(({ group, items }, s) => {
      const rows = items.map(([row, i]) => this.#renderRow(row, i));

      if (!group) return rows;
      const id = `${this.ids.listbox}-group-${s}`;

      return html`<div part="group" role="group" aria-labelledby=${id}>
        <div part="group-label" id=${id} role="presentation">${group}</div>
        ${rows}
      </div>`;
    });
  }

  /** @override */
  render() {
    const ids = this.ids;
    const expanded = this._open && this.filtered.length > 0;
    const rows = this.rows;
    const hasValue = Boolean(this.value || this._text);

    /* eslint-disable lit-a11y/accessible-name -- named by <label for> in the same shadow root */
    const label = html`<label part="label" id=${ids.label} for=${ids.input}>${this.label}</label>`;
    const describedBy = this.describedByIds().join(' ');

    const body = html`<div part="field">
        ${this.renderBeforeInput()}
        <input
          part="control"
          id=${ids.input}
          type="text"
          role="combobox"
          autocomplete=${this.autocomplete || 'off'}
          aria-autocomplete="list"
          aria-expanded=${String(expanded)}
          aria-controls=${ids.listbox}
          aria-describedby=${describedBy || nothing}
          aria-activedescendant=${expanded && this._active >= 0 && this._active < rows.length ? this.optionId(this._active) : nothing}
          placeholder=${this.placeholder || nothing}
          .value=${live(this._text)}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnly}
          ?required=${this.required}
          @input=${this.onInput}
          @keydown=${this.onKeyDown}
          @click=${() => this.open()}
        />
        <button
          part="clear"
          type="button"
          aria-label=${this.localize.term('clearNamed', this.label)}
          ?hidden=${!this.clearable || !hasValue || this.isDisabled || this.readOnly}
          @click=${() => this.clear()}
        >
          ${iconSvg('x', 'icon')}
        </button>
      </div>
      <div part="popup" popover="manual">
        <div part="listbox" id=${ids.listbox} role="listbox" aria-labelledby=${ids.label} aria-multiselectable=${this.multiple ? 'true' : nothing}>
          ${this.renderListOptions()}
        </div>
      </div>
      <span part="status" role="status" class="focsd-visually-hidden">${this.renderStatus()}</span>`;

    return renderFieldLayout(this, label, body);
  }
  /* eslint-enable lit-a11y/accessible-name */
}
