import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { icon, iconSvg, slottedIconStyles } from '../internal/icons.js';
import { hueNamed, syncHue } from '../internal/hue.js';
import { labelText } from '../internal/text.js';

/** @typedef {import('../internal/types.js').Tone} Tone */

/**
 * A tag/chip: a short label, with an optional icon before it and an optional remove button after
 * it. When `removable`, renders a named remove button that fires `focsd-remove` (the host does not
 * remove itself). The icon is decoration: the label names the tag.
 *
 * @fires {Event} focsd-remove - Fired when the remove button is activated.
 * @slot - The label.
 * @slot icon - A custom icon (an `svg` or `focsd-icon`) before the label, used instead of the `icon` attribute.
 * @csspart icon - The icon before the label.
 * @csspart remove - The remove button (with `removable`).
 * @csspart tag - The tag element.
 */
export class FocsdTagBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    tone: { reflect: true },
    removable: { type: Boolean, reflect: true },
    removeLabel: { attribute: 'remove-label' },
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    size: { reflect: true },
    shape: { reflect: true },
    color: { reflect: true },
    _slottedIcon: { state: true },
  };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, slottedIconStyles];

  constructor() {
    super();
    /** @type {Tone} The tag's tone: sets its color. */
    this.tone = 'neutral';
    /** Adds a remove button, which fires `focsd-remove`. */
    this.removable = false;
    /** The accessible name of the remove button; defaults to "Remove" and the tag's text. */
    this.removeLabel = '';
    /** The name of an icon from the default icon library, shown before the label. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** @type {'s' | 'm' | 'l'} The tag's size: `s`, `m` (default) or `l`. The remove button stays at least 24 px. */
    this.size = 'm';
    /** @type {'rounded' | 'pill'} The corners: `rounded` (default, the tag radius) or `pill` (fully round ends). */
    this.shape = 'rounded';
    /** A category color (`blue`, `violet`, `pink`, `red`, `orange`, `amber`, `green`, `teal`), shown by colorful presets such as Prismatic; others keep the tone. */
    this.color = '';
    /** @internal True while something is slotted as the icon. */
    this._slottedIcon = false;
  }

  /** @param {Event} event */
  #onIconSlot = (event) => {
    this._slottedIcon = /** @type {HTMLSlotElement} */ (event.target).assignedElements().length > 0;
  };

  #onRemove = () => {
    this.dispatchEvent(new Event('focsd-remove', { bubbles: true }));
  };

  /** @override */
  updated() {
    syncHue(this, hueNamed(this.color));
  }

  /** @override */
  render() {
    // The label only: not the text of anything slotted as the icon.
    const text = labelText(this);

    return html`<span part="tag"
      ><span part="icon" aria-hidden="true" ?hidden=${!this.icon && !this._slottedIcon}
        >${this.icon ? icon({ name: this.icon, library: this.iconLibrary || undefined }, 'svg') : nothing}<slot name="icon" @slotchange=${this.#onIconSlot}></slot></span
      ><slot @slotchange=${() => this.requestUpdate()}></slot>${
        this.removable
          ? html`<button part="remove" type="button" aria-label="${this.removeLabel || this.localize.term('remove')} ${text}" @click=${this.#onRemove}>${iconSvg('x')}</button>`
          : nothing
      }</span>`;
  }
}
