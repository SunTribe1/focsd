import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { VisualViewportController } from '../internal/viewport.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { typeaheadIndex } from '../internal/typeahead.js';
import { TriggerToggle } from '../internal/popup.js';
import { fold, queryMatcher } from '../internal/text.js';
import { uid } from '../internal/id.js';
import { FocsdOptionBase, OPTION_OWNER } from './option-base.js';
import { FocsdOptionGroupBase } from './option-group-base.js';
import { iconSvg } from '../internal/icons.js';
import { renderFieldLayout } from '../internal/field-messages.js';

/** @typedef {'first' | 'last' | 'selected'} SelectIntent Which option opening the list focuses. */

/**
 * Headless, form-associated select: a listbox button whose listbox is a popover="auto"
 * (top layer, light dismiss, Escape). Options receive real focus (roving), so no
 * aria-activedescendant crosses shadow roots.
 *
 * With `multiple`, the listbox is aria-multiselectable and stays open while options are toggled;
 * the form receives one entry per selected value and `value` is the first selected value.
 * `max` caps how many can be chosen and `select-all` adds a Select all / Deselect all button.
 * Options can be grouped with focsd-option-group. `searchable` adds a filter box above the list, and
 * `clearable` a button that clears the selection.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - Default content.
 * @csspart layout - The wrapper holding the label and the body; its `data-position` is the label position.
 * @csspart field - Wraps the trigger and the clear button.
 * @csspart body - The field, then the hint and the message.
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message (also named by its kind).
 * @csspart message-icon - The icon in the message.
 * @csspart announcer - The live region that announces a changed message.
 * @csspart control - The control element.
 * @csspart indicator - The open or close arrow in the trigger.
 * @csspart label - The label element.
 * @csspart listbox - The listbox element.
 * @csspart popup - The popup holding the filter box, the select all button and the listbox.
 * @csspart search - The filter box (with `searchable`).
 * @csspart select-all - The Select all / Deselect all button (with `multiple select-all`).
 * @csspart clear - The clear button (with `clearable`).
 * @csspart trigger - The trigger element.
 * @csspart value - The selected option text (or the placeholder) in the trigger.
 */
export class FocsdSelectBase extends FormControlMixin(FocsdElement) {
  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    // Own accessor: an author's assignment (even of the same value) is told apart from internal syncs.
    value: { noAccessor: true },
    placeholder: {},
    open: { type: Boolean, reflect: true },
    multiple: { type: Boolean, reflect: true },
    searchable: { type: Boolean, reflect: true },
    clearable: { type: Boolean, reflect: true },
    selectAll: { type: Boolean, attribute: 'select-all', reflect: true },
    max: { type: Number },
    _query: { state: true },
  };

  #ids = {
    label: uid('focsd-select-label'),
    required: uid('focsd-select-required'),
    trigger: uid('focsd-select-trigger'),
    value: uid('focsd-select-value'),
    listbox: uid('focsd-select-listbox'),
    status: uid('focsd-select-status'),
  };

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The selected value; with `multiple`, the first selected value. */
    this.value = '';
    /** Text shown when nothing is selected. */
    this.placeholder = '';
    /** Whether the list is open. */
    this.open = false;
    /** Lets several options be chosen; the form receives one entry per value. */
    this.multiple = false;
    /** Adds a filter box above the options. */
    this.searchable = false;
    /** Adds a button that clears the selection. */
    this.clearable = false;
    /** With `multiple`, adds a Select all / Deselect all button. */
    this.selectAll = false;
    /** With `multiple`, the most options that can be chosen; 0 means no limit. */
    this.max = 0;
    this._query = '';
  }

  /** Options in document order, including those inside focsd-option-group children. */
  get options() {
    return [...(this.children ?? [])].flatMap((el) =>
      el instanceof FocsdOptionBase ? [el] : el instanceof FocsdOptionGroupBase ? el.options : [],
    );
  }

  /** The focsd-option-group children. */
  get groups() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdOptionGroupBase);
  }

  /**
   * Internal: true when a multiple select is full and `option` is not one of the chosen.
   * @param {FocsdOptionBase} option
   * @returns {boolean}
   */
  _blocked(option) {
    return this.multiple && this.max > 0 && !option.selected && this.selectedOptions.length >= this.max;
  }

  /**
   * The first selected option, or null.
   * @returns {FocsdOptionBase | null}
   */
  get selectedOption() {
    if (this.multiple) return this.selectedOptions[0] ?? null;

    return this.options.find((o) => o.value === this.value) ?? null;
  }

  /**
   * Selected options in document order (one at most unless `multiple`).
   * @returns {FocsdOptionBase[]}
   */
  get selectedOptions() {
    if (!this.multiple) return this.selectedOption ? [this.selectedOption] : [];

    return this.options.filter((o) => o.selected);
  }

  /** The number of options. */
  get length() {
    return this.options.length;
  }

  /** The index of the first selected option, or -1. */
  get selectedIndex() {
    return this.options.indexOf(/** @type {FocsdOptionBase} */ (this.selectedOption));
  }
  set selectedIndex(index) {
    const target = this.options[index] ?? null;

    if (this.multiple) {
      for (const option of this.options) option._setSelected(option === target);
      this.#syncFromOptions();
    } else this.value = target?.value ?? '';
  }

  /** Open the list from code, like native `showPicker()`. */
  showPicker() {
    if (this.isDisabled) throw new DOMException('The select is disabled.', 'InvalidStateError');
    this.#openList('selected');
  }

  /**
   * Called by an option whose `selected` changed (`fromDefault`: its `selected` attribute).
   * @param {FocsdOptionBase} option
   * @param {boolean} on
   * @param {boolean} [fromDefault]
   */
  _optionSelected(option, on, fromDefault = false) {
    if (this.multiple) {
      this.#syncFromOptions();

      return;
    }

    // An explicit `value` attribute wins over an option's `selected` attribute.
    if (fromDefault && (!on || this.hasAttribute('value'))) return;

    if (on) this.value = option.value;
    else if (this.selectedOption === option) this.value = '';
  }

  #value = '';

  /** True when the latest write to `value` came from outside (author, attribute), not from the options. */
  #authorValue = false;

  /** @returns {string} */
  get value() {
    return this.#value;
  }

  /** @param {string | null | undefined} next null or undefined clears it. */
  set value(next) {
    const old = this.#value;
    this.#value = next ?? '';
    this.#authorValue = true;
    this.requestUpdate('value', old);
    // On a multiple select even the same value matters (it deselects the others): always update.
    this.requestUpdate();
  }

  /**
   * Internal write that follows the options; the latest write wins over an earlier author write.
   * @param {string} next
   */
  #writeValue(next) {
    const old = this.#value;
    this.#value = next;
    this.#authorValue = false;
    this.requestUpdate('value', old);
  }

  /** In multiple mode, `value` follows the first selected option. */
  #syncFromOptions() {
    this.#writeValue(this.options.find((o) => o.selected)?.value ?? '');
    this.requestUpdate();
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
  }

  /** @returns {HTMLElement} */
  get #trigger() {
    return /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="trigger"]'));
  }

  /**
   * The popover: filter box, select all and the listbox.
   * @returns {HTMLElement}
   */
  get #popup() {
    return /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="popup"]'));
  }

  /** @returns {HTMLInputElement | null} */
  get #search() {
    return this.renderRoot.querySelector('[part~="search"]');
  }

  /**
   * Initial (and reset) selection: `value` attribute, else options marked selected (by property,
   * by state restore, or by the `selected` attribute), else the first option.
   */
  #initialSelection() {
    const options = this.options;

    if (this.multiple) {
      for (const option of options) option._setSelected(option._initiallySelected);
      this.#syncFromOptions();

      return;
    }

    if (this.value) return;
    const marked = options.findLast((o) => o._initiallySelected);

    if (marked) this.value = marked.value;
    else if (!this.placeholder) {
      const first = options[edgeIndex('first', options.length, this.#isDisabled)];

      if (first) this.value = first.value;
    }
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // The first render starts from the initial selection (here, not in firstUpdated, so it renders once).
    if (!this.hasUpdated) this.#initialSelection();

    // Entering multiple mode at runtime: carry the single selection over into the option flags.
    if (this.hasUpdated && changed.has('multiple') && this.multiple) {
      const current = this.options.find((o) => o.value === this.value) ?? null;

      for (const option of this.options) {
        option._setSelected(option === current);
        option.setAttribute('aria-selected', String(option === current));
      }

      this.#authorValue = false;

      return;
    }

    // Setting `value` on a multiple select selects that option alone (or none), as native selects do.
    if (this.hasUpdated && this.multiple && this.#authorValue) {
      const match = this.value ? this.options.find((o) => o.value === this.value) : undefined;

      for (const option of this.options) option._setSelected(option === match);

      if (!match) this.#writeValue('');
    }

    this.#authorValue = false;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (this.isDisabled) this.#closeList();

    // `open` set from code opens or closes the list (toggle events keep it in step otherwise).
    if (changed.has('open') && changed.get('open') !== undefined) {
      const showing = this.#popup.matches(':popover-open');

      if (this.open && !showing) this.#openList('selected');
      else if (!this.open && showing) this.#closeList();
    }

    const selected = this.selectedOptions;

    for (const option of this.options) {
      if (!this.multiple) option.setAttribute('aria-selected', String(selected.includes(option)));
      option._syncDisabled();
    }

    this.internals.setFormValue(this.#formValue(selected), this.#formValue(selected));

    if (this.required && !selected.length) this.setValidityState({ valueMissing: true }, this.localize.term('selectOption'), this.#trigger);
    else this.setValidityState({});
  }

  /**
   * Form value: the value, or one entry per selected value when `multiple`.
   * @param {FocsdOptionBase[]} selected
   */
  #formValue(selected) {
    if (!this.multiple) return this.value || null;

    if (!this.name || !selected.length) return null;
    const data = new FormData();

    for (const option of selected) data.append(this.name, option.value);

    return data;
  }

  formResetCallback() {
    for (const option of this.options) option._reset();
    this.value = this.multiple ? '' : this.defaultValue;
    this.#initialSelection();
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    if (this.multiple && state instanceof FormData) {
      const values = state.getAll(this.name);

      // Through `selected`, so the restored state also wins over the first render's defaults.
      for (const option of this.options) option.selected = values.includes(option.value);
    } else this.value = restoredText(state) ?? '';
  }

  /** Not focusable or choosable: disabled (itself, by group or by `max`), or filtered out. */
  /** @param {number} index */
  #isDisabled = (index) => {
    const option = this.options[index];

    // `hidden` may be 'until-found': any hiding counts.
    return !option || option.inert || Boolean(option.hidden);
  };

  /** @param {number} index */
  #focusOption(index) {
    this.options[index]?.focus();
  }

  /** @param {FocsdOptionBase | undefined} option */
  #select(option) {
    if (!option || option.inert || this.isDisabled) return;

    if (this.multiple) {
      // Toggle and keep the list open, so several options can be chosen in one visit.
      option._setSelected(!option.selected);
      this.#syncFromOptions();
      this.emitValue();

      return;
    }

    const changed = option.value !== this.value;
    this.value = option.value;
    this.#closeList();
    /** @type {HTMLElement} */ (this.#trigger).focus();

    if (changed) this.emitValue();
  }

  /** @param {SelectIntent} intent */
  #intentIndex(intent) {
    const options = this.options;

    if (intent === 'first') return edgeIndex('first', options.length, this.#isDisabled);

    if (intent === 'last') return edgeIndex('last', options.length, this.#isDisabled);
    const selected = options.indexOf(/** @type {FocsdOptionBase} */ (this.selectedOption));

    return selected >= 0 && !this.#isDisabled(selected) ? selected : edgeIndex('first', options.length, this.#isDisabled);
  }

  /**
   * Open the list and focus synchronously, so keys typed right after opening are never lost.
   * @param {SelectIntent} intent
   */
  #openList(intent) {
    // Nothing to choose: do not open an empty list.
    if (this.isDisabled || edgeIndex('first', this.options.length, this.#isDisabled) < 0) {
      this.open = false;

      return;
    }

    if (!this.#popup.matches(':popover-open')) /** @type {HTMLElement} */ (this.#popup).showPopover();
    this.open = true;

    if (this.searchable) /** @type {HTMLElement} */ (this.#search)?.focus();
    else this.#focusOption(this.#intentIndex(intent));
  }

  #closeList() {
    if (this.#popup.matches(':popover-open')) /** @type {HTMLElement} */ (this.#popup).hidePopover();
  }

  /**
   * Fires synchronously before hiding (Escape, light dismiss, hidePopover): restore focus first.
   * @param {ToggleEvent} event
   */
  #onBeforeToggle = (event) => {
    if (event.newState !== 'closed') return;

    const inside =
      this.options.some((o) => o.matches(':focus')) ||
      /** @type {ShadowRoot} */ (this.renderRoot).activeElement?.closest?.('[part~="popup"]');

    if (inside) /** @type {HTMLElement} */ (this.#trigger).focus();
  };

  #viewport = new VisualViewportController(this);

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    // Removal hides the popover without toggle events; reset so a moved select reads closed and opens again.
    this.open = false;
    this.#viewport.set(false);
    this.#filter('');
  }

  /** @param {ToggleEvent} event */
  #onToggle = (event) => {
    this.open = event.newState === 'open';
    this.#viewport.set(this.open);

    if (!this.open) this.#filter('');
  };

  // ---- filter, select all, clear -----------------------------------------------------------

  /**
   * Show only options whose label contains `query`; hide groups left empty.
   * @param {string} query
   */
  #filter(query) {
    this._query = query;
    const matches = queryMatcher(query);

    for (const option of this.options) option.hidden = !matches(option.label);

    for (const group of this.groups) group.hidden = group.options.every((o) => o.hidden);
  }

  /** @param {Event} event */
  #onSearchInput = (event) => this.#filter(/** @type {HTMLInputElement} */ (event.target).value);

  /** @param {KeyboardEvent} event */
  #onSearchKeyDown = (event) => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    this.#focusOption(edgeIndex('first', this.options.length, this.#isDisabled));
  };

  /** Visible, choosable options (for select all). */
  get #visible() {
    return this.options.filter((o) => !o.hidden && !o.disabled && !o.group?.disabled);
  }

  /** Every visible option chosen, or the maximum reached: the button offers to deselect. */
  get #allChosen() {
    const visible = this.#visible;

    if (this.max > 0 && this.selectedOptions.length >= this.max) return true;

    return visible.length > 0 && visible.every((o) => o.selected);
  }

  #onSelectAll = () => {
    if (this.isDisabled) return;

    if (this.#allChosen) for (const option of this.#visible) option._setSelected(false);
    else
      for (const option of this.#visible) {
        if (option.selected) continue;

        if (this.max > 0 && this.selectedOptions.length >= this.max) break;
        option._setSelected(true);
      }

    this.#syncFromOptions();
    this.emitValue();
  };

  #onClear = () => {
    if (this.isDisabled) return;

    if (this.multiple) {
      for (const option of this.options) option._setSelected(false);
      this.#syncFromOptions();
    } else this.value = '';
    this.emitValue();
    /** @type {HTMLElement} */ (this.#trigger).focus();
  };

  /** Pressing the trigger of the open list light-dismisses it before the click: see TriggerToggle. */
  #toggle = new TriggerToggle(() => this.#popup.matches(':popover-open'));

  #onTriggerPointerDown = () => this.#toggle.press();

  #onTriggerClick = () => {
    if (this.#toggle.release()) this.#closeList();
    else this.#openList('selected');
  };

  /** @type {Record<string, SelectIntent | undefined>} */
  static #triggerIntents = { ArrowDown: 'selected', ArrowUp: 'selected', Home: 'first', End: 'last' };

  /** @param {KeyboardEvent} event */
  #onTriggerKeyDown = (event) => {
    const intent = FocsdSelectBase.#triggerIntents[event.key];

    if (this.isDisabled || !intent) return;
    event.preventDefault();
    this.#openList(intent);
  };

  /** @param {KeyboardEvent} event */
  #onListboxKeyDown = (event) => {
    const current = this.options.indexOf(/** @type {FocsdOptionBase} */ (event.target));

    if (current >= 0) this.#handleListKey(event, current);
  };

  /**
   * Keyboard handling inside the open list, relative to option `current`.
   * @param {KeyboardEvent} event
   * @param {number} current
   */
  #handleListKey(event, current) {
    const options = this.options;
    let next = -1;

    switch (event.key) {
      case 'ArrowDown': {
        const candidate = nextIndex(current, 1, options.length, this.#isDisabled);
        next = Math.max(candidate, current);
        break;
      }

      case 'ArrowUp': {
        const candidate = nextIndex(current, -1, options.length, this.#isDisabled);

        if (candidate >= current && this.searchable) {
          event.preventDefault();
          /** @type {HTMLElement} */ (this.#search)?.focus();

          return;
        }

        next = Math.min(candidate, current);
        break;
      }

      case 'Home':
        next = edgeIndex('first', options.length, this.#isDisabled);
        break;
      case 'End':
        next = edgeIndex('last', options.length, this.#isDisabled);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.#select(options[current]);

        return;
      case 'Tab':
        this.#closeList();

        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          // Folded, so "e" finds "É" as it does in the filter box.
          next = typeaheadIndex(
            options.map((o) => fold(o.label)),
            current,
            fold(event.key),
            this.#isDisabled,
          );
        }
    }

    if (next < 0) return;
    event.preventDefault();
    this.#focusOption(next);
  }

  /** @param {MouseEvent} event */
  #onListboxClick = (event) => {
    const option = event.composedPath().find((/** @type {EventTarget} */ node) => node instanceof FocsdOptionBase);
    this.#select(option);
  };

  /** Internal: a focsd-option-group's options changed. */
  _optionsChanged() {
    this.#onSlotChange();
  }

  /** Options added or removed: keep the selection pointing at options that exist. */
  #onSlotChange = () => {
    if (this.multiple) this.#syncFromOptions();
    else if (this.value && !this.options.some((o) => o.value === this.value)) {
      this.value = '';
      this.#initialSelection();
    }

    this.requestUpdate();
  };

  /** Trigger text: the selected label, or a summary of several. */
  #summary() {
    const labels = this.selectedOptions.map((o) => o.label);

    return labels.length > 2 ? this.localize.term('selectedCount', labels.length) : labels.join(', ');
  }

  /** @override */
  render() {
    const ids = this.#ids;
    const shown = this.#summary() || this.placeholder;
    const describedBy = [...(this.required ? [ids.required] : []), ...this.describedByIds()].join(' ');
    const label = html`<label part="label" id=${ids.label} for=${ids.trigger}>${this.label}</label>`;

    const body = html`<div part="field">
      <button
        part="trigger control"
        id=${ids.trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded=${String(this.open)}
        aria-controls=${ids.listbox}
        aria-labelledby="${ids.label} ${ids.value}"
        aria-disabled=${this.isDisabled ? 'true' : nothing}
        aria-describedby=${describedBy || nothing}
        @keydown=${this.#onTriggerKeyDown}
        @pointerdown=${this.#onTriggerPointerDown}
        @click=${this.#onTriggerClick}
      >
        <span part="value" id=${ids.value} ?data-placeholder=${!this.selectedOptions.length}>${shown}</span>
        <span part="indicator" aria-hidden="true"></span>
      </button>
      <button
        part="clear"
        type="button"
        aria-label=${this.localize.term('clearNamed', this.label)}
        ?hidden=${!this.clearable || !this.selectedOptions.length || this.isDisabled}
        @click=${this.#onClear}
      >
        ${iconSvg('x', 'icon')}
      </button></div>
      ${this.required ? html`<span id=${ids.required} hidden>${this.localize.term('required')}</span>` : nothing}
      <div part="popup" popover="auto" @beforetoggle=${this.#onBeforeToggle} @toggle=${this.#onToggle}>
        ${
          this.searchable
            ? html`<input
              part="search"
              type="search"
              aria-label=${this.localize.term('filterNamed', this.label)}
              aria-controls=${ids.listbox}
              autocomplete="off"
              .value=${this._query}
              @input=${this.#onSearchInput}
              @keydown=${this.#onSearchKeyDown}
            />`
            : nothing
        }
        ${
          this.multiple && this.selectAll
            ? html`<button part="select-all" type="button" @click=${this.#onSelectAll}>
              ${this.localize.term(this.#allChosen ? 'deselectAll' : 'selectAll')}
            </button>`
            : nothing
        }
        <div
          part="listbox"
          id=${ids.listbox}
          role="listbox"
          aria-labelledby=${ids.label}
          aria-multiselectable=${this.multiple ? 'true' : nothing}
          @keydown=${this.#onListboxKeyDown}
          @click=${this.#onListboxClick}
        >
          <slot @slotchange=${this.#onSlotChange}></slot>
        </div>
        <span part="status" id=${ids.status} role="status" class="focsd-visually-hidden"
          >${this.multiple && this.max > 0 && this.selectedOptions.length >= this.max ? this.localize.term('maxSelected', this.max) : ''}</span
        >
      </div>
    `;

    return renderFieldLayout(this, label, body);
  }
}

// The brand focsd-option reads (see OPTION_OWNER); set on the prototype so it stays out of the public API.
Object.defineProperty(FocsdSelectBase.prototype, OPTION_OWNER, { value: true });
