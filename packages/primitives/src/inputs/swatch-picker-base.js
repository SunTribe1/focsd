import { html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { iconSvg } from '../internal/icons.js';
import { colorName, formatColor, parseColor } from '../internal/color.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { TriggerToggle, focusWithin } from '../internal/popup.js';

/**
 * One swatch on offer.
 * @typedef {object} SwatchItem
 * @property {string} key The color as lower-case hex (8 digits when translucent); also the value it sets.
 * @property {string} name The accessible name: the option's label, a CSS color name, or the hex.
 * @property {boolean} disabled
 */

/** Attributes of a slotted option the swatch list reads. */
const OPTION_ATTRIBUTES = ['color', 'label', 'value', 'disabled'];

/**
 * The color as lower-case hex (any CSS color syntax in), or null when it is not a color.
 * @param {unknown} text
 * @returns {string | null}
 */
const hexOf = (text) => {
  const color = parseColor(String(text ?? ''));

  return color ? formatColor(color, 'hex', true) : null;
};

/**
 * Swatch picker: a color radio group (arrows move and choose, one tab stop) with an optional
 * custom color from a `focsd-color-picker` in a popup. Swatches come from `swatches` (a comma
 * separated list of CSS colors) and from slotted `focsd-option` children: an option's `color`
 * attribute is its color (its `value` stands in when it has no `color`) and its text is its name.
 * The value that is set and submitted is always the color as lower-case hex. A swatch is named by
 * its label, else the CSS color name that matches exactly, else its hex. The chosen swatch shows a check mark as
 * well as a ring, so color is never the only signal.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart label - The label element.
 * @csspart layout - The wrapper that places the label beside or above the body.
 * @csspart body - The swatches, the custom color control, the hint and the message.
 * @csspart row - The swatches and the custom color button on one line.
 * @csspart group - The radio group holding the swatches.
 * @csspart swatch - One swatch (a radio button).
 * @csspart chip - The color chip inside a swatch or the custom color button.
 * @csspart check - The check mark in the chosen swatch, or on the custom color button when a custom color is chosen.
 * @csspart icon - The plus icon on the custom color button.
 * @csspart custom - The button that opens the custom color popup.
 * @csspart popup - The popup holding the color picker.
 * @csspart picker - The color picker in the popup.
 * @csspart hint - The hint text.
 * @csspart message - The shown error, warning or success message (also `error`, `warning` or `success`).
 * @csspart message-icon - The message's icon.
 * @csspart announcer - The visually hidden status region.
 */
export class FocsdSwatchPickerBase extends FormControlMixin(FocsdElement) {
  /** Tag of the color picker rendered in the custom color popup. */
  static colorPickerTag = 'focsd-color-picker';

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    swatches: {},
    allowCustom: { attribute: 'allow-custom', type: Boolean },
  };

  #ids = { label: uid('focsd-swatch-label'), popup: uid('focsd-swatch-popup') };

  /** @type {MutationObserver | undefined} */
  #observer;

  /** True from a custom color edit until its `change` has been fired. */
  #pending = false;

  /** Whether the custom color popup is open. */
  #open = false;

  #toggle = new TriggerToggle(() => this.#popup?.matches(':popover-open') ?? false);

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /**
     * The chosen color as lower-case hex, or an empty string. A color that is not offered (and no
     * `allow-custom`) reads back as written but selects, submits and validates nothing; it applies
     * once a swatch of that color is added.
     */
    this.value = '';
    /** The swatches to offer: a comma-separated list of CSS colors, added before any `focsd-option` children. */
    this.swatches = '';
    /** Adds a custom color button after the swatches. */
    this.allowCustom = false;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // Every read during this update (render, tab stop, sanitize) shares one parse of the swatches.
    this.#memo = null;
    this.#memo = this.#readItems();

    // A disabled control closes its popup (the popover's toggle event then clears the open flag),
    // before rendering, so the closed state renders in this same pass. Disabling is not a user
    // commit: a pending edit ends without a `change`.
    if (this.hasUpdated && this.isDisabled && this.#popup?.matches(':popover-open')) this.#reset();

    // A valid color is kept as lower-case hex; anything else stays as written (it submits nothing).
    if (changed.has('value')) {
      const key = hexOf(this.value);

      if (key && key !== this.value) this.value = key;
    }
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    // The options are read from the light DOM: watch their text, attributes and the child list.
    this.#observer ??= new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
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

  /** The items read once for the update in progress (cleared after it). @type {SwatchItem[] | null} */
  #memo = null;

  /**
   * The swatches in order: the `swatches` list, then the options. Invalid colors are dropped and
   * a color already listed is not repeated; a later entry with a label names it when the first had none.
   * @returns {SwatchItem[]}
   */
  get items() {
    return this.#memo ?? this.#readItems();
  }

  /** @returns {SwatchItem[]} */
  #readItems() {
    /** @type {SwatchItem[]} */
    const items = [];
    const labeled = new Set();

    /** @type {(text: string, name: string, disabled: boolean) => void} */
    const add = (text, name, disabled) => {
      const key = hexOf(text);

      if (!key) return;
      const found = items.findIndex((item) => item.key === key);

      if (found >= 0) {
        if (name && !labeled.has(key)) items[found] = { .../** @type {typeof items[number]} */ (items[found]), name };
      } else items.push({ key, name: name || colorName(parseColor(key) ?? { r: 0, g: 0, b: 0, a: 0 }) || key, disabled });

      if (name) labeled.add(key);
    };

    for (const text of String(this.swatches ?? '').split(/[,\s]+(?![^(]*\))/)) add(text, '', false);

    for (const child of this.children ?? []) {
      if (child.localName === 'focsd-option') this.#addOption(child, add, child.hasAttribute('disabled'));
      else if (child.localName === 'focsd-option-group')
        for (const option of child.querySelectorAll(':scope > focsd-option'))
          this.#addOption(option, add, child.hasAttribute('disabled') || option.hasAttribute('disabled'));
    }

    return items;
  }

  /**
   * @param {Element} option
   * @param {(text: string, name: string, disabled: boolean) => void} add
   * @param {boolean} disabled
   */
  #addOption(option, add, disabled) {
    const name = option.getAttribute('label') ?? option.textContent.replaceAll(/\s+/g, ' ').trim();

    add(option.getAttribute('color') ?? option.getAttribute('value') ?? '', name, disabled);
  }

  /**
   * The value a text may become: its hex when it is a color and, unless `allow-custom`, a swatch.
   * @param {unknown} text
   * @returns {string}
   */
  #sanitize(text) {
    const key = hexOf(text);

    return key && (this.allowCustom || this.items.some((item) => item.key === key)) ? key : '';
  }

  /** The value in use: `value` as lower-case hex, or '' when it is not an offered color. */
  get #current() {
    return this.#sanitize(this.value);
  }

  get #popup() {
    return /** @type {HTMLElement | null} */ (this.renderRoot?.querySelector?.('[part~="popup"]') ?? null);
  }

  /** @returns {HTMLButtonElement[]} */
  get #swatchButtons() {
    return [.../** @type {NodeListOf<HTMLButtonElement>} */ (this.renderRoot.querySelectorAll('[part~="swatch"]'))];
  }

  /** The tab stop: the chosen swatch, else the first one that can be chosen. */
  get #tabStop() {
    const items = this.items;
    const current = this.#current;
    const chosen = items.findIndex((item) => item.key === current && !item.disabled);

    return chosen >= 0 ? chosen : edgeIndex('first', items.length, (i) => Boolean(items[i]?.disabled));
  }

  /** The radio group, where forwarded ARIA and invalid state go. */
  get ariaTarget() {
    return /** @type {HTMLElement | undefined} */ (this.renderRoot?.querySelector?.('[part~="group"]') ?? undefined);
  }

  /** @param {number} index */
  #choose(index) {
    const item = this.items[index];

    if (!item || item.disabled || this.isDisabled || item.key === this.#current) return;
    this.value = item.key;
    this.emitValue(true);
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (this.isDisabled) return;
    const items = this.items;
    const current = this.#swatchButtons.indexOf(/** @type {HTMLButtonElement} */ (event.target));

    if (current < 0) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const forward = ['ArrowDown', rtl ? 'ArrowLeft' : 'ArrowRight'];
    const backward = ['ArrowUp', rtl ? 'ArrowRight' : 'ArrowLeft'];
    const off = (/** @type {number} */ i) => Boolean(items[i]?.disabled);
    let next;

    if (forward.includes(event.key)) next = nextIndex(current, 1, items.length, off);
    else if (backward.includes(event.key)) next = nextIndex(current, -1, items.length, off);
    else if (event.key === 'Home') next = edgeIndex('first', items.length, off);
    else if (event.key === 'End') next = edgeIndex('last', items.length, off);
    else return;
    event.preventDefault();
    this.#swatchButtons[next]?.focus();
    this.#choose(next);
  };

  /** Open or close the custom color popup from its button. */
  #onCustomClick = () => {
    const popup = this.#popup;

    if (!popup) return;

    if (this.#toggle.release()) {
      popup.hidePopover();

      return;
    }

    if (this.isDisabled) return;
    popup.showPopover();

    const picker = /** @type {(HTMLElement & { renderRoot?: ParentNode, updateComplete?: Promise<unknown> }) | null} */ (
      popup.querySelector('[part~="picker"]')
    );

    void picker?.updateComplete?.then(() =>
      /** @type {HTMLElement | null} */ (picker.renderRoot?.querySelector('[part~="field"]'))?.focus(),
    );
  };

  /** @param {ToggleEvent} event */
  #onBeforeToggle = (event) => {
    // An edit ends when the popup closes (Escape, light dismiss): an `input` is always followed by `change`.
    if (event.newState === 'closed' && this.#pending) {
      this.#pending = false;
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (event.newState === 'closed' && focusWithin(this))
      /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="custom"]'))?.focus();
  };

  /** @param {ToggleEvent} event */
  #onToggle = (event) => {
    this.#setOpen(event.newState === 'open');
  };

  /**
   * A color from the popup's picker. `input` follows the picker's own `input` events; `change`
   * is fired once, when the picker commits and a change is pending. The picker's events stop here.
   * @param {Event} event
   * @param {boolean} commit
   */
  #onPicker(event, commit) {
    event.stopPropagation();

    // The picker's text field also fires native `input` events that cross its shadow root: not a color edit.
    if (event.composedPath()[0] !== event.currentTarget) return;
    const key = hexOf(/** @type {HTMLInputElement} */ (event.target).value);

    if (!key || this.isDisabled) return;

    if (key !== this.#current) {
      this.value = key;
      this.#pending = true;
      this.emitValue(false);
    }

    if (commit && this.#pending) {
      this.#pending = false;
      this.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /** @param {boolean} open */
  #setOpen(open) {
    this.#open = open;
    this.requestUpdate();
  }

  /** Close the popup and drop transient state. */
  #reset() {
    this.#pending = false;
    const popup = this.#popup;

    if (popup?.matches(':popover-open')) popup.hidePopover();
    this.#setOpen(false);
  }

  formResetCallback() {
    this.#reset();
    this.value = this.#sanitize(this.defaultValue);
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.#reset();
    this.value = this.#sanitize(restoredText(state) ?? '');
  }

  /** @override */
  updated() {
    for (const node of this.renderRoot.querySelectorAll('[data-color]')) {
      const el = /** @type {HTMLElement} */ (node);

      el.style.setProperty('--_swatch-color', /** @type {string} */ (el.dataset.color));
    }

    const current = this.#current;
    const tabStop = this.#swatchButtons[this.#tabStop];

    this.internals.setFormValue(current || null);

    if (this.required && !current)
      this.setValidityState({ valueMissing: true }, this.localize.term('chooseColor'), tabStop ?? this.ariaTarget);
    else this.setValidityState({});
    // Outside an update, `items` reads the light DOM again (options may have changed since).
    this.#memo = null;
  }

  /**
   * @param {SwatchItem} item
   * @param {number} index
   * @param {string} current
   * @param {number} tabStop
   */
  #renderSwatch(item, index, current, tabStop) {
    const checked = item.key === current;

    return html`<button
      part="swatch"
      type="button"
      role="radio"
      aria-label=${item.name}
      aria-checked=${checked ? 'true' : 'false'}
      aria-disabled=${item.disabled ? 'true' : nothing}
      tabindex=${index === tabStop ? '0' : '-1'}
      data-color=${item.key}
      ?disabled=${this.isDisabled}
      @click=${() => this.#choose(index)}
    >
      <span part="chip"></span>${checked ? html`<span part="check" aria-hidden="true">${iconSvg('check')}</span>` : nothing}
    </button>`;
  }

  /**
   * @param {string} current
   * @param {boolean} custom True when the value is a color that is not one of the swatches.
   */
  #renderCustom(current, custom) {
    const t = (/** @type {string} */ key) => this.localize.term(key);
    const tag = unsafeStatic(/** @type {typeof FocsdSwatchPickerBase} */ (this.constructor).colorPickerTag);

    return html`<button
        part="custom"
        type="button"
        aria-label=${custom ? `${t('customColor')}: ${colorName(parseColor(current) ?? { r: 0, g: 0, b: 0, a: 0 }) ?? current}` : t('customColor')}
        aria-haspopup="dialog"
        aria-expanded=${this.#open ? 'true' : 'false'}
        aria-controls=${this.#ids.popup}
        data-color=${custom ? current : nothing}
        data-custom=${custom ? '' : nothing}
        ?disabled=${this.isDisabled}
        @pointerdown=${() => this.#toggle.press()}
        @click=${this.#onCustomClick}
      >
        <span part="chip"></span><span part="${custom ? 'check' : 'icon'}" aria-hidden="true">${iconSvg(custom ? 'check' : 'plus')}</span>
      </button>
      <div part="popup" role="dialog" aria-label=${t('customColor')} id=${this.#ids.popup} popover="auto" @beforetoggle=${this.#onBeforeToggle} @toggle=${this.#onToggle}>
        ${staticHtml`<${tag}
          part="picker"
          inline
          label=${t('customColor')}
          .value=${current || '#000000'}
          ?disabled=${this.isDisabled}
          @input=${(/** @type {Event} */ e) => this.#onPicker(e, false)}
          @change=${(/** @type {Event} */ e) => this.#onPicker(e, true)}
        ></${tag}>`}
      </div>`;
  }

  /** @override */
  render() {
    const items = this.items;
    const current = this.#current;
    const tabStop = this.#tabStop;
    const describedBy = this.describedByIds().join(' ');
    const custom = Boolean(current) && !items.some((item) => item.key === current);
    const label = html`<span part="label" id=${this.#ids.label}>${this.label}</span>`;

    const body = html`<div part="row">
      <div
        part="group"
        role="radiogroup"
        aria-labelledby=${this.#ids.label}
        aria-describedby=${describedBy || nothing}
        aria-required=${this.required ? 'true' : nothing}
        aria-disabled=${this.isDisabled ? 'true' : nothing}
        @keydown=${this.#onKeyDown}
      >
        ${items.map((item, i) => this.#renderSwatch(item, i, current, tabStop))}
      </div>
      ${this.allowCustom ? this.#renderCustom(current, custom) : nothing}
    </div>`;

    return renderFieldLayout(this, label, body);
  }
}
