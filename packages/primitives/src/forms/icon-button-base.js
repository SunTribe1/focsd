import { html } from 'lit';
import { FocsdButtonBase } from '../button/button-base.js';
import { icon, slottedIconStyles } from '../internal/icons.js';

/**
 * Icon-only button named by `label`. `icon` names an icon in the default library; slotted content
 * (your own SVG or icon element) replaces it.
 *
 * @slot - Your own icon, replacing the named one.
 * @csspart icon - The named icon.
 * @omit slot:icon
 */
export class FocsdIconButtonBase extends FocsdButtonBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdButtonBase.styles, slottedIconStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { icon: {}, label: {} };

  constructor() {
    super();
    /** The name of the built-in icon shown. */
    this.icon = '';
    /** The accessible name of the button (and its tooltip). */
    this.label = '';
  }

  /** @override */
  render() {
    // Slotted content (your own SVG or icon element) replaces the named icon.
    return this.renderButton(html`<slot>${icon({ name: this.icon, library: this.iconLibrary || undefined }, 'icon')}</slot>`, {
      label: this.label,
    });
  }
}
