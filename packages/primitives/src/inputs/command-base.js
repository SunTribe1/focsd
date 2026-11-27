import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { VisualViewportController } from '../internal/viewport.js';
import { deepActiveElement } from '../internal/focus.js';
import { uid } from '../internal/id.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { queryMatcher } from '../internal/text.js';
import { FocsdCommandItemBase } from './command-item-base.js';
import { icon } from '../internal/icons.js';

/**
 * A command as plain data: an option (`value`, `label`, `group`, `disabled`) plus its `shortcut`.
 * @typedef {import('../internal/options.js').ComboboxOption & { shortcut: string, icon?: string, iconLibrary?: string, iconNode?: Element | null }} CommandEntry
 */

/**
 * `detail` of `focsd-select` on a command palette: the chosen command's value.
 * @typedef {{ value: string }} CommandSelectDetail
 */

/** Disabled commands are filtered out of the list, so every row can be active. */
const noneDisabled = () => false;

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/**
 * A command's icon: a copy of its item's `slot="icon"` child (any icon kit), else its named icon.
 * @param {CommandEntry} c
 */
function commandIcon(c) {
  if (c.iconNode) {
    const copy = /** @type {Element} */ (c.iconNode.cloneNode(true));

    copy.removeAttribute('slot');

    return html`<span part="option-icon" aria-hidden="true">${copy}</span>`;
  }

  return c.icon
    ? html`<span part="option-icon" aria-hidden="true">${icon({ name: c.icon, library: c.iconLibrary || undefined }, 'svg')}</span>`
    : nothing;
}

/**
 * Command palette: modal dialog with a filtering combobox over grouped commands. Fires `focsd-select`.
 *
 * @fires {CustomEvent<CommandSelectDetail>} focsd-select - Fired when an item is chosen. `detail.value` is its value.
 * @csspart active - Added to the highlighted option.
 * @csspart control - The control element.
 * @csspart dialog - The dialog element.
 * @csspart empty - The message shown when no command matches.
 * @csspart group - The group element.
 * @csspart group-label - The group label element.
 * @csspart input - The input element.
 * @csspart listbox - The listbox element.
 * @csspart option - The option element.
 * @csspart option-label - An option's label.
 * @csspart shortcut - An option's keyboard shortcut.
 * @csspart option-icon - An option's icon (decorative).
 */
export class FocsdCommandBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    open: { type: Boolean, reflect: true },
    shortcut: {},
    _query: { state: true },
    _active: { state: true },
  };

  #ids = { input: uid('focsd-command-input'), listbox: uid('focsd-command-listbox') };

  /** @type {HTMLElement | null} */
  #opener = null;

  constructor() {
    super();
    /** The accessible name of the palette. */
    this.label = '';
    /** Whether the palette is open. */
    this.open = false;
    /** @type {'' | 'mod+k'} `mod+k` opens and closes the palette with Ctrl+K (Command+K on macOS). */
    this.shortcut = '';
    this._query = '';
    this._active = 0;
  }

  /** Items added, removed or edited (even while open) re-render the list. */
  /** @type {MutationObserver | null} */
  #observer = null;

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.#onShortcut);
    this.#observer ??= new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true });
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    document.removeEventListener('keydown', this.#onShortcut);
  }

  /**
   * The commands, read from the slotted command items.
   * @returns {CommandEntry[]}
   */
  get commands() {
    return [...(this.children ?? [])].flatMap((c) =>
      c instanceof FocsdCommandItemBase
        ? [
            {
              value: c.value || c.label,
              label: c.label,
              group: c.group,
              shortcut: c.shortcut,
              disabled: c.disabled,
              icon: c.icon,
              iconLibrary: c.iconLibrary,
              iconNode: c.querySelector(':scope > [slot="icon"]'),
            },
          ]
        : [],
    );
  }

  get #filtered() {
    const matches = queryMatcher(this._query);
    const list = this.commands.filter((c) => !c.disabled && matches(c.label));
    // Render groups in order of first appearance; sort (stably) to match so arrow order equals screen order.
    const order = new Map();

    for (const c of list) if (!order.has(c.group || '')) order.set(c.group || '', order.size);

    return list
      .map((c, i) => ({ c, i }))
      .toSorted((a, b) => order.get(a.c.group || '') - order.get(b.c.group || '') || a.i - b.i)
      .map(({ c }) => c);
  }

  get #dialog() {
    return this.renderRoot.querySelector('dialog');
  }

  #onShortcut = (/** @type {KeyboardEvent} */ event) => {
    if (this.shortcut !== 'mod+k') return;
    const mod = isMac() ? event.metaKey : event.ctrlKey;

    if (!mod || event.key.toLowerCase() !== 'k' || event.altKey || event.shiftKey) return;
    event.preventDefault();

    if (this.open) this.hide();
    else this.show();
  };

  /**
   * Open the palette with an empty query; focus returns to `opener` (default: the focused element) on close.
   * @param {HTMLElement | null} [opener]
   */
  show(opener) {
    this.#opener = opener ?? /** @type {HTMLElement | null} */ (deepActiveElement());
    this._query = '';
    this._active = 0;
    this.open = true;
  }

  /** Close the palette. */
  hide() {
    this.open = false;
  }

  /**
   * Same as `show()`, so `<focsd-button commandfor="…" command="show-modal">` opens the palette.
   * @param {HTMLElement | null} [opener]
   */
  showModal(opener) {
    this.show(opener);
  }

  /** Same as `hide()`, for the `close` command. */
  close() {
    this.hide();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (!changed.has('open')) return;
    const dialog = /** @type {HTMLDialogElement} */ (this.#dialog);

    if (this.open && !dialog.open) {
      dialog.showModal();
      this.#viewport.set(true);
      /** @type {ShadowRoot} */ (this.renderRoot).getElementById(this.#ids.input)?.focus();
    } else if (!this.open && dialog.open) dialog.close();
  }

  #viewport = new VisualViewportController(this);

  #onClose = () => {
    this.open = false;
    this.#viewport.set(false);
    const active = deepActiveElement();

    if ((!active || active === document.body || this.renderRoot.contains(active)) && this.#opener?.isConnected) this.#opener.focus();
    this.#opener = null;
  };

  /** @param {CommandEntry | undefined} command */
  #run(command) {
    if (!command) return;
    /** @type {CommandSelectDetail} */
    const detail = { value: command.value };

    this.dispatchEvent(new CustomEvent('focsd-select', { bubbles: true, detail }));
    this.hide();
  }

  #onKeyDown = (/** @type {KeyboardEvent} */ event) => {
    const list = this.#filtered;
    /** @type {number | undefined} */
    let next;

    if (event.key === 'ArrowDown') next = nextIndex(this._active, 1, list.length, noneDisabled);
    else if (event.key === 'ArrowUp') next = nextIndex(this._active, -1, list.length, noneDisabled);
    else if (event.key === 'Home') next = edgeIndex('first', list.length, noneDisabled);
    else if (event.key === 'End') next = edgeIndex('last', list.length, noneDisabled);
    else if (event.key === 'Enter') this.#run(list[this._active]);
    else return;
    event.preventDefault();

    // An empty list keeps row 0 active, ready for the first match.
    if (next !== undefined) this._active = Math.max(0, next);
  };

  /** @override */
  render() {
    const list = this.#filtered;
    const groups = [...new Set(list.map((c) => c.group || ''))];
    const optionId = (/** @type {number} */ i) => `${this.#ids.listbox}-opt-${i}`;

    return html`<dialog part="dialog" aria-label=${this.label || this.localize.term('commandPalette')} @close=${this.#onClose}>
      <input
        part="control input"
        id=${this.#ids.input}
        type="text"
        role="combobox"
        aria-label=${this.label || this.localize.term('commandPalette')}
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls=${this.#ids.listbox}
        aria-activedescendant=${list.length ? optionId(this._active) : nothing}
        autocomplete="off"
        placeholder=${this.localize.term('typeCommand')}
        .value=${live(this._query)}
        @input=${(/** @type {Event} */ e) => {
          this._query = /** @type {HTMLInputElement} */ (e.target).value;
          this._active = 0;
        }}
        @keydown=${this.#onKeyDown}
      />
      <div part="listbox" id=${this.#ids.listbox} role="listbox" aria-label=${this.label || this.localize.term('commandPalette')}>
        ${groups.map((group) => {
          const items = list.map((c, i) => ({ c, i })).filter(({ c }) => (c.group || '') === group);

          /* eslint-disable lit-a11y/click-events-have-key-events -- focus stays in the input (aria-activedescendant); keys are handled there */
          const options = items.map(
            ({
              c,
              i,
            }) => html`<div part="option ${i === this._active ? 'active' : ''}" id=${optionId(i)} role="option" aria-selected=${String(i === this._active)} @pointerdown=${(/** @type {PointerEvent} */ e) => e.preventDefault()} @click=${() => this.#run(c)}>
            ${commandIcon(c)}<span part="option-label">${c.label}</span>${c.shortcut ? html`<kbd part="shortcut">${c.shortcut}</kbd>` : nothing}</div>`,
          );

          return group
            ? html`<div part="group" role="group" aria-label=${group}><div part="group-label" aria-hidden="true">${group}</div>${options}</div>`
            : options;
        })}
        ${list.length === 0 ? html`<div part="empty">${this.localize.term('noCommands')}</div>` : nothing}
      </div>
    </dialog>`;
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */
}
