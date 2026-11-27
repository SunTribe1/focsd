import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { icon, iconSvg } from '../internal/icons.js';
import { slottedIconBox } from '../internal/icon-slot.js';

/** @typedef {import('../internal/types.js').Tone} Tone */

/** @type {Record<string, string | undefined>} */
const TONE_ICON = { neutral: 'info', info: 'info', positive: 'check', caution: 'alert-triangle', critical: 'alert-circle' };

/**
 * Alert / banner. Static by default; `live` = polite → role=status, assertive → role=alert.
 *
 * @slot - Default content.
 * @slot actions - Buttons or links for the alert.
 * @slot icon - Any icon markup (an SVG, an icon component, an icon-font element) instead of the tone's icon.
 * @fires close - Fired when the close button is pressed, before the alert hides; cancel it to keep the alert.
 * @csspart actions - The actions element.
 * @csspart alert - The alert element.
 * @csspart body - The body element.
 * @csspart close - The close (×) button, with `closable`.
 * @csspart content - The content element.
 * @csspart headline - The headline element.
 * @csspart icon - The icon element.
 */
export class FocsdAlertBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, slottedIconBox];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    tone: { reflect: true },
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    headline: {},
    live: { reflect: true },
    closable: { type: Boolean },
  };

  constructor() {
    super();
    /** An icon in place of the tone's: a name from the default icon library (or `icon-library`). For any other icon kit, use `slot="icon"`. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** @type {Tone} The alert's tone: sets its color and icon. */
    this.tone = 'neutral';
    /** A short heading shown above the message. */
    this.headline = '';
    /**
     * @type {'off' | 'polite' | 'assertive'}
     * Announces the alert: `polite` is a status (role=status), `assertive` interrupts (role=alert), `off` is static.
     */
    this.live = 'off';
    /** Adds a close (×) button. Pressing it fires a cancelable `close`, then hides the alert. */
    this.closable = false;
  }

  /** The close button: a cancelable `close`, then the alert hides (`hidden`). */
  #onClose = () => {
    if (this.dispatchEvent(new Event('close', { cancelable: true }))) this.hidden = true;
  };

  /**
   * The live role must exist before content arrives, or the first message is not announced.
   * @override
   */
  connectedCallback() {
    super.connectedCallback();
    this.#syncRole();
  }

  /** @override */
  updated() {
    this.#syncRole();
  }

  #syncRole() {
    const role = /** @type {Partial<Record<string, string>>} */ ({ polite: 'status', assertive: 'alert' })[this.live];

    if (role) this.setAttribute('role', role);
    else this.removeAttribute('role');
  }

  /** @override */
  render() {
    return html`<div part="alert">
      <span part="icon" aria-hidden="true"
        ><slot name="icon"
          >${this.icon ? icon({ name: this.icon, library: this.iconLibrary || undefined }, 'svg') : iconSvg(TONE_ICON[this.tone] ?? 'info')}</slot
        ></span
      >
      <div part="content">
        ${this.headline ? html`<p part="headline">${this.headline}</p>` : nothing}
        <div part="body"><slot></slot></div>
        <div part="actions"><slot name="actions"></slot></div>
      </div>
      ${
        this.closable
          ? html`<button part="close" type="button" aria-label=${this.localize.term('close')} @click=${this.#onClose}>${iconSvg('x')}</button>`
          : nothing
      }
    </div>`;
  }
}
