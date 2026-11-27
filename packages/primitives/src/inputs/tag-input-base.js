import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { repeat } from 'lit/directives/repeat.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { onFocusLeave } from '../internal/popup.js';
import { queryMatcher } from '../internal/text.js';
import { iconSvg } from '../internal/icons.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { readOptions, stepIndex } from '../internal/options.js';
import { SortableController, reorder, sortableTerms } from '../internal/sortable.js';

/** @typedef {import('../internal/options.js').ComboboxOption} ComboboxOption */

/**
 * `detail` of `focsd-reorder` on a tag input: the moved tag and its old and new indexes.
 * @typedef {{ from: number, to: number, value: string }} TagInputReorderDetail
 */

/**
 * A rendered tag: its text and a key that stays with it while tags move (duplicates are numbered).
 * @typedef {{ key: string, tag: string }} TagEntry
 */

/** The tag order while a tag is being moved, or null. @typedef {TagEntry[] | null} TagDraft */

/** Suggestions are already the enabled options only. */
const noneDisabled = () => false;

/**
 * Tag input: type text and press Enter, the separator or Tab to turn it into a tag. Pasted lists
 * become several tags, at the caret. The tags are one tab stop: Backspace, Shift+Tab and the arrow
 * keys move into them, Backspace or Delete removes one. With slotted `focsd-option`s the input is a
 * combobox that suggests values; a suggestion is always one tag (separators inside its value are
 * dropped, as `values` does). With `sortable`, each tag gets a reorder handle in the same tab stop:
 * Space or Enter grabs, the arrow keys move, Space or Enter drops and Escape cancels; the handle can
 * also be dragged with a pointer or touch.
 *
 * @fires input - Fired when a tag is added, removed or moved.
 * @fires change - Fired when a tag is added, removed or moved.
 * @fires {CustomEvent<TagInputReorderDetail>} focsd-reorder - Fired before a moved tag is committed; cancel it to put the tag back.
 * @slot - `focsd-option` suggestions (data only).
 * @csspart label - The label.
 * @csspart layout - The label and the body (see label position).
 * @csspart body - The box with its hint and message.
 * @csspart hint - The author hint.
 * @csspart message - The shown error, warning or success message.
 * @csspart message-icon - The icon of the message.
 * @csspart field - The box holding the tags and the input.
 * @csspart tags - The list of tags.
 * @csspart tag - One tag.
 * @csspart remove - A tag's remove button.
 * @csspart handle - A tag's reorder button (sortable only).
 * @csspart control - The text input.
 * @csspart popup - The suggestions popup.
 * @csspart listbox - The suggestions list.
 * @csspart option - One suggestion.
 * @csspart status - The live status (visually hidden).
 * @csspart announcer - The visually hidden status region that announces a new message.
 */
export class FocsdTagInputBase extends FormControlMixin(FocsdElement) {
  static supportsReadOnly = true;

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    separator: {},
    max: { type: Number },
    placeholder: {},
    allowDuplicates: { type: Boolean, attribute: 'allow-duplicates' },
    sortable: { type: Boolean, reflect: true },
    _draft: { state: true },
    _text: { state: true },
    _status: { state: true },
    _open: { state: true },
    _active: { state: true },
    _options: { state: true },
    _rove: { state: true },
  };

  /** For subclasses: the IDs of the parts in the shadow root. */
  ids = { label: uid('focsd-tags-label'), input: uid('focsd-tags-input'), listbox: uid('focsd-tags-listbox') };

  /** @type {MutationObserver | null} */
  #observer = null;

  /** The tag keys after the last move, in order (see `#entries`). @type {string[]} */
  #keys = [];

  #sortable = new SortableController(this, {
    axis: 'both',
    items: () => [...this.renderRoot.querySelectorAll('[part~="tag"]')].map((li) => /** @type {HTMLElement} */ (li)),
    handleOf: (item) => item.querySelector('[part~="handle"]'),
    labelOf: (item) => this.#labelOf(this.#entryOf(item)?.tag ?? ''),
    announce: (text) => (this._status = text),
    place: (item, index) => this.#place(item, index),
    commit: (from, to) => this.#commitMove(from, to),
    terms: sortableTerms(this.localize),
  });

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The tags, joined by `separator`. */
    this.value = '';
    /** The character that ends a tag as you type, and joins the tags in `value`. */
    this.separator = ',';
    /** The most tags allowed; 0 means no limit. */
    this.max = 0;
    /** Placeholder text for the input. */
    this.placeholder = '';
    /** Accepts the same tag more than once. */
    this.allowDuplicates = false;
    /** Whether each tag gets a reorder handle (keyboard, pointer and touch). */
    this.sortable = false;
    /**
     * The order while a tag is being moved, before it is committed.
     * @internal
     * @type {TagDraft}
     */
    this._draft = null;
    this._text = '';
    this._status = '';
    this._open = false;
    this._active = -1;
    /** @type {ComboboxOption[]} */
    this._options = [];
    /** The tag that holds the tab stop; -1 (or out of range) means the last. */
    this._rove = -1;
    onFocusLeave(this, () => {
      this._open = false;
    });
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this._options = readOptions(this);
    this.#observer ??= new MutationObserver(() => (this._options = readOptions(this)));
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true });
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /**
   * The tags, in order. Setting it drops empty tags, separators inside tags and (unless allowed) duplicates.
   * @returns {string[]}
   */
  get values() {
    return this.#split(this.value);
  }

  /** @param {string[]} list */
  set values(list) {
    this.value = this.#clean(list).join(this.separator);
  }

  /** @param {string | null | undefined} text */
  #split(text) {
    return String(text ?? '')
      .split(this.separator || ',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  /**
   * One tag from any text: separators dropped, trimmed.
   * @param {unknown} raw
   */
  #tagOf(raw) {
    return String(raw)
      .replaceAll(this.separator || ',', '')
      .trim();
  }

  /** @param {Iterable<unknown> | null | undefined} list */
  #clean(list) {
    /** @type {string[]} */
    const out = [];

    for (const raw of list ?? []) {
      const tag = this.#tagOf(raw);

      if (tag && (this.allowDuplicates || !this.#has(out, tag))) out.push(tag);
    }

    return out;
  }

  /**
   * @param {string[]} list
   * @param {string} tag
   */
  #has(list, tag) {
    const key = tag.toLocaleLowerCase();

    return list.some((t) => t.toLocaleLowerCase() === key);
  }

  /**
   * @returns {TagEntry[]} The tags with keys: the nth copy of a tag is keyed `tag` + n, unless the
   * keys from the last move still match the tags. Then equal tags that changed places keep their
   * keys, so their elements (and focus) stay where the move put them.
   */
  #entries() {
    /** @type {Map<string, number>} */
    const seen = new Map();
    const kept = this.#keys;

    const entries = this.values.map((tag) => {
      const n = seen.get(tag) ?? 0;

      seen.set(tag, n + 1);

      return { key: `${n}:${tag}`, tag };
    });

    const same = kept.length === entries.length && entries.every(({ tag }, i) => kept[i]?.slice(kept[i].indexOf(':') + 1) === tag);

    return same ? entries.map(({ tag }, i) => ({ key: /** @type {string} */ (kept[i]), tag })) : entries;
  }

  /** The tags as shown: the draft order while a tag is being moved. */
  #shown() {
    return this._draft ?? this.#entries();
  }

  /** @param {HTMLElement} item */
  #entryOf(item) {
    return this.#shown().find((entry) => entry.key === item.dataset.key);
  }

  /**
   * Move a tag in the draft order (the render moves its element).
   * @param {HTMLElement} item
   * @param {number} index
   */
  #place(item, index) {
    const base = this.#shown();

    const draft = reorder(
      base,
      base.findIndex((entry) => entry.key === item.dataset.key),
      index,
    );

    this._draft = draft;
    // The moved handle keeps the tab stop.
    this._rove = draft.findIndex((entry) => entry.key === item.dataset.key) * 2;
  }

  /**
   * Commit the draft order unless `focsd-reorder` is canceled.
   * @param {number} from
   * @param {number} to
   */
  #commitMove(from, to) {
    const draft = this.#shown();
    const detail = /** @type {TagInputReorderDetail} */ ({ from, to, value: draft[to]?.tag ?? '' });

    if (!this.dispatchEvent(new CustomEvent('focsd-reorder', { bubbles: true, cancelable: true, detail }))) return false;
    this.values = draft.map((entry) => entry.tag);
    this.#keys = draft.map((entry) => entry.key);
    this._draft = null;
    this.emitValue();

    return true;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    super.willUpdate?.(changed);

    // The draft lives only while a tag is grabbed or dragged.
    if (this._draft && !this.#sortable.active) this._draft = null;
  }

  get #full() {
    return this.max > 0 && this.values.length >= this.max;
  }

  get #editable() {
    return !this.isDisabled && !this.readOnlyActive;
  }

  /**
   * The suggestions, from the slotted options.
   * @returns {ComboboxOption[]}
   */
  get suggestions() {
    if (!this._options.length) return [];
    const matches = queryMatcher(this._text);
    const chosen = this.values;

    return this._options.filter((o) => !o.disabled && !this.#has(chosen, this.#tagOf(o.value)) && (matches(o.label) || matches(o.value)));
  }

  /** @param {string} tag */
  #labelOf(tag) {
    return this._options.find((o) => o.value === tag || this.#tagOf(o.value) === tag)?.label ?? tag;
  }

  /**
   * Add the tags in `text` (split on the separator and new lines). Returns true when any was added.
   * @param {string} text
   * @returns {boolean}
   */
  add(text) {
    if (!this.#editable) return false;

    const pieces = String(text)
      .split(/\r?\n/)
      .flatMap((line) => line.split(this.separator || ','))
      .map((t) => t.trim())
      .filter(Boolean);

    const next = this.values;
    /** @type {string[]} */
    const messages = [];

    for (const tag of pieces) {
      if (this.max > 0 && next.length >= this.max) {
        messages.push(this.localize.term('maxSelected', this.max));
        break;
      }

      if (!this.allowDuplicates && this.#has(next, tag)) {
        messages.push(this.localize.term('alreadyAdded', tag));
        continue;
      }

      next.push(tag);
      messages.push(this.localize.term('tagAdded', this.#labelOf(tag)));
    }

    // The last thing that happened is the most useful thing to hear.
    if (messages.length) this._status = /** @type {string} */ (messages.at(-1));
    const added = next.length !== this.values.length;

    if (added) {
      this.value = next.join(this.separator);
      this.emitValue();
    }

    return added;
  }

  /**
   * Remove the tag at `index`.
   * @param {number} index
   */
  removeAt(index) {
    if (!this.#editable) return;
    const list = this.values;
    const [gone] = list.splice(index, 1);

    if (gone === undefined) return;
    this.value = list.join(this.separator);
    this._status = this.localize.term('tagRemoved', this.#labelOf(gone));
    this.emitValue();
  }

  /**
   * The text input, never a tag's remove button.
   * @returns {HTMLElement | undefined}
   */
  get ariaTarget() {
    return this.input ?? undefined;
  }

  /**
   * For subclasses: the text input in the shadow root.
   * @returns {HTMLInputElement | null}
   */
  get input() {
    return this.renderRoot?.querySelector?.('[part~="control"]') ?? null;
  }

  #removeButtons() {
    return [...this.renderRoot.querySelectorAll('[part~="remove"]')];
  }

  /** The tag buttons in order: each tag's handle (when sortable), then its remove button. */
  #tagButtons() {
    return [...this.renderRoot.querySelectorAll('[part~="handle"], [part~="remove"]')];
  }

  /** @param {number} index A tag button index; out of range is the input. */
  #focusButton(index) {
    const buttons = this.#tagButtons();

    if (index < 0 || index >= buttons.length) /** @type {HTMLElement} */ (this.input)?.focus();
    else /** @type {HTMLElement} */ (buttons[index]).focus();
  }

  /** @param {number} index */
  #focusTag(index) {
    const buttons = this.#removeButtons();

    if (index < 0 || index >= buttons.length) /** @type {HTMLElement} */ (this.input)?.focus();
    else /** @type {HTMLElement} */ (buttons[index]).focus();
  }

  get #rtl() {
    return getComputedStyle(this).direction === 'rtl';
  }

  #commitText() {
    if (!this._text.trim()) return false;
    const added = this.add(this._text);
    this._text = '';
    this._open = false;

    return added || true;
  }

  #onInput = (/** @type {Event} */ event) => {
    // Typing a draft is not a change of value: only added or removed tags fire input on the host.
    event.stopPropagation();
    const input = /** @type {HTMLInputElement} */ (event.target);
    const text = input.value;

    if (this.#full && text) {
      input.value = '';
      this._text = '';
      this._status = this.localize.term('maxSelected', this.max);

      return;
    }

    // A typed separator commits what came before it.
    if (this.separator && text.includes(this.separator)) {
      const parts = text.split(this.separator);
      const rest = parts.pop();
      this.add(parts.join(this.separator));
      this._text = /** @type {string} */ (rest);

      return;
    }

    this._text = text;
    this._active = -1;
    this._open = this.suggestions.length > 0 && Boolean(text.trim());
  };

  #onPaste = (/** @type {ClipboardEvent} */ event) => {
    const text = event.clipboardData?.getData('text/plain') ?? '';

    if (!(this.separator && text.includes(this.separator)) && !/\r?\n/.test(text)) return;
    event.preventDefault();
    // The paste goes where the caret is, replacing any selection, as a native paste would.
    const input = /** @type {HTMLInputElement} */ (event.target);
    const draft = input.value;
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? start;
    this.add(`${draft.slice(0, start)}${text}${draft.slice(end)}`);
    this._text = '';
  };

  /**
   * Add a suggestion as exactly one tag, even when its value holds the separator.
   * @param {ComboboxOption} option
   */
  #addOption(option) {
    this.add(this.#tagOf(option.value));
    this._text = '';
    this._open = false;
    this._active = -1;
  }

  /**
   * Add the active suggestion, if the list is open on one.
   * @param {ComboboxOption[]} options
   */
  #pickActive(options) {
    const option = this._open && this._active >= 0 && options[this._active];

    if (!option) return false;
    this.#addOption(option);

    return true;
  }

  /**
   * Moves focus from the start of the draft to the last tag.
   * @param {boolean} atStart Whether the caret is at the start of the draft.
   * @returns {boolean} Whether focus moved.
   */
  #backIntoTags(atStart) {
    if (!atStart || !this.values.length) return false;
    this.#focusTag(this.values.length - 1);

    return true;
  }

  #onInputKey = (/** @type {KeyboardEvent} */ event) => {
    const input = /** @type {HTMLInputElement} */ (event.target);
    const atStart = input.selectionStart === 0 && input.selectionEnd === 0;
    const back = this.#rtl ? 'ArrowRight' : 'ArrowLeft';
    const options = this.suggestions;

    switch (event.key) {
      case 'ArrowDown':
        if (!options.length) return;
        this._open = true;
        this._active = stepIndex(this._active, 1, options.length, noneDisabled);
        break;
      case 'ArrowUp':
        if (!options.length) return;
        this._open = true;
        this._active = stepIndex(this._active, -1, options.length, noneDisabled);
        break;
      case 'Escape':
        if (!this._open) return;
        this._open = false;
        break;
      case 'Enter':
        if (!this.#pickActive(options) && !this.#commitText()) return;
        break;
      case 'Tab':
        if (this._text.trim()) this.#commitText();

        return;
      case 'Backspace':
        // An empty draft backs into the tags like the back arrow.
        if (this._text || !this.#backIntoTags(atStart)) return;
        break;
      case back:
        if (!this.#backIntoTags(atStart)) return;
        break;
      default:
        return;
    }

    event.preventDefault();
  };

  /**
   * @param {number} index The tag's index.
   * @param {number} button The button's index among all tag buttons.
   * @param {KeyboardEvent} event
   */
  #onTagKey(index, button, event) {
    // While a tag is grabbed, the keys move it (the sortable controller).
    if (this.#sortable.active) return;
    const count = this.#tagButtons().length;
    const forward = this.#rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = this.#rtl ? 'ArrowRight' : 'ArrowLeft';

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      // Backspace moves back to the previous tag; Delete stays in place (the next tag moves up).
      const target = event.key === 'Backspace' ? Math.max(0, index - 1) : index;
      this.removeAt(index);
      this.updateComplete.then(() => this.#focusTag(target < this.values.length ? target : -1));
    } else if (event.key === forward) {
      event.preventDefault();
      this.#focusButton(button + 1 < count ? button + 1 : -1);
    } else if (event.key === back) {
      event.preventDefault();
      this.#focusButton(Math.max(0, button - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.#focusButton(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      this.#focusButton(-1);
    }
  }

  /** @param {number} index */
  #onRemoveClick(index) {
    this.removeAt(index);
    this.updateComplete.then(() => /** @type {HTMLElement} */ (this.input)?.focus());
  }

  /** @override */
  updated() {
    const data = new FormData();

    for (const tag of this.values) data.append(this.name, tag);
    this.internals.setFormValue(this.name && this.values.length ? data : null);

    if (this.required && !this.values.length) this.setValidityState({ valueMissing: true }, this.localize.term('addTag'), this.input);
    else this.setValidityState({});
    const popup = this.renderRoot.querySelector('[part~="popup"]');
    const show = this._open && this.suggestions.length > 0;

    if (popup && show && !popup.matches(':popover-open')) /** @type {HTMLElement} */ (popup).showPopover();

    if (popup && !show && popup.matches(':popover-open')) /** @type {HTMLElement} */ (popup).hidePopover();
  }

  formResetCallback() {
    this.value = this.defaultValue;
    this._text = '';
    this._status = '';
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.value = state instanceof FormData ? state.getAll(this.name).join(this.separator) : (restoredText(state) ?? '');
  }

  /* eslint-disable lit-a11y/click-events-have-key-events -- focus stays in the input (aria-activedescendant); keys are handled there */
  /**
   * @param {ComboboxOption} option
   * @param {number} i
   */
  #renderOption(option, i) {
    const active = i === this._active;

    return html`<div
      part="option ${active ? 'active' : ''}"
      id=${`${this.ids.listbox}-${i}`}
      role="option"
      aria-selected="false"
      @pointerdown=${(/** @type {PointerEvent} */ e) => e.preventDefault()}
      @click=${() => {
        this.#addOption(option);
        /** @type {HTMLElement} */ (this.input)?.focus();
      }}
    >
      ${option.label}
    </div>`;
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */

  /**
   * One tag: its handle (sortable), its text and its remove button.
   * @param {string} tag
   * @param {number} i
   * @param {string} key
   * @param {number} stop The tag button that holds the tab stop.
   */
  #renderTag(tag, i, key, stop) {
    const label = this.#labelOf(tag);
    const per = this.sortable ? 2 : 1;
    const remove = i * per + per - 1;

    /** @param {number} button */
    const keys = (button) => (/** @type {KeyboardEvent} */ e) => this.#onTagKey(i, button, e);

    const handle = this.sortable
      ? html`<button
          part="handle"
          type="button"
          aria-label=${this.localize.term('reorderNamed', label)}
          tabindex=${i * 2 === stop ? '0' : '-1'}
          ?disabled=${!this.#editable}
          @focus=${() => (this._rove = i * 2)}
          @keydown=${keys(i * 2)}
        >
          ${iconSvg('grip')}
        </button>`
      : nothing;

    return html`<li part="tag" data-key=${key}>
      ${handle}${label}<button
        part="remove"
        type="button"
        aria-label=${this.localize.term('removeItem', label)}
        tabindex=${remove === stop ? '0' : '-1'}
        ?disabled=${!this.#editable}
        @focus=${() => (this._rove = remove)}
        @click=${() => this.#onRemoveClick(i)}
        @keydown=${keys(remove)}
      >
        ${iconSvg('x')}
      </button>
    </li>`;
  }

  /** @override */
  render() {
    const ids = this.ids;
    const options = this.suggestions;
    const entries = this.#shown();
    // Roving tab stop: one tag button is in the tab order; the arrows move between them.
    const count = entries.length * (this.sortable ? 2 : 1);
    const stop = this._rove >= 0 && this._rove < count ? this._rove : count - 1;
    const combo = this._options.length > 0;
    const expanded = combo && this._open && options.length > 0;

    /* eslint-disable lit-a11y/no-redundant-role -- role="list" is not redundant: Safari drops list semantics from <ul> styled with list-style: none */
    const label = html`<label part="label" id=${ids.label} for=${ids.input}>${this.label}</label>`;
    const describedBy = this.describedByIds().join(' ') || nothing;

    const body = html`<div part="field">
        <ul part="tags" role="list" aria-labelledby=${ids.label}>
          ${repeat(
            entries,
            (entry) => entry.key,
            (entry, i) => this.#renderTag(entry.tag, i, entry.key, stop),
          )}
        </ul>
        <input
          part="control"
          id=${ids.input}
          type="text"
          role=${combo ? 'combobox' : nothing}
          aria-autocomplete=${combo ? 'list' : nothing}
          aria-expanded=${combo ? String(expanded) : nothing}
          aria-controls=${combo ? ids.listbox : nothing}
          aria-activedescendant=${expanded && this._active >= 0 ? `${ids.listbox}-${this._active}` : nothing}
          aria-describedby=${describedBy}
          autocomplete="off"
          placeholder=${this.placeholder || nothing}
          .value=${live(this._text)}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnlyActive}
          @input=${this.#onInput}
          @keydown=${this.#onInputKey}
          @paste=${this.#onPaste}
        />
      </div>
      ${
        combo
          ? html`<div part="popup" popover="manual">
            <div part="listbox" id=${ids.listbox} role="listbox" aria-labelledby=${ids.label}>
              ${options.map((o, i) => this.#renderOption(o, i))}
            </div>
          </div>`
          : nothing
      }
      <span part="status" role="status" class="focsd-visually-hidden">${this._status}</span>`;

    return renderFieldLayout(this, label, body);
    /* eslint-enable lit-a11y/no-redundant-role */
  }
}
