import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg, slottedIconStyles } from '../internal/icons.js';
import { uid } from '../internal/id.js';

/**
 * Disclosure: a button (aria-expanded/controls) and a panel, both in one shadow root. Fires `toggle`
 * whenever it opens or closes, however (click, `toggle()`, setting `open`, its group), like
 * `<details>`. Disclosures sharing a `name` in the same tree form an exclusive group, like
 * `<details name>`.
 *
 * @fires toggle - Fired when the element opens or closes. Like `<details>`, it does not bubble.
 * @slot - Default content.
 * @slot icon - Replaces the expand indicator (keep it decorative).
 * @csspart icon - The icon element.
 * @csspart panel - The panel element.
 * @csspart trigger - The trigger element.
 */
export class FocsdDisclosureBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, slottedIconStyles];

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    summary: {},
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    name: { reflect: true },
  };

  /** For subclasses: the IDs of the button and panel in the shadow root. */
  ids = { button: uid('focsd-disclosure-button'), panel: uid('focsd-disclosure-panel') };

  constructor() {
    super();
    /** The text of the button that opens and closes the panel. */
    this.summary = '';
    /** Whether the panel is open. */
    this.open = false;
    /** Disables the button. */
    this.disabled = false;
    /** Disclosures with the same name in a tree form a group where only one is open, like `<details name>`. */
    this.name = '';
    // A controller runs around every update even when a subclass overrides willUpdate() or updated().
    this.addController({ hostUpdate: () => this.#beforeFirstUpdate(), hostUpdated: () => this.#afterUpdate() });
  }

  #wasOpen = false;

  #rendered = false;

  /**
   * Arriving already open (markup or insertion) while an earlier member of its group is open: like
   * <details name>, the first open one in document order stays open and this one closes. Settled
   * before the first render, so the closed state renders in that same pass.
   */
  #beforeFirstUpdate() {
    if (!this.isConnected || this.#rendered || !this.open || !this.name) return;

    if (this.#groupOthers().some((other) => other.compareDocumentPosition(this) & Node.DOCUMENT_POSITION_FOLLOWING)) this.open = false;
  }

  /** Fire `toggle` when `open` changed (not for the first render), then close the group. */
  #afterUpdate() {
    const opened = this.open && !this.#wasOpen;
    const changed = this.open !== this.#wasOpen;
    const first = !this.#rendered;
    this.#rendered = true;
    this.#wasOpen = this.open;

    if (changed && !first) this.dispatchEvent(new Event('toggle'));

    // This one opened: close the others with the same name in this tree (each fires its own toggle).
    if (opened && this.name) for (const other of this.#groupOthers()) other.open = false;
  }

  /**
   * The other open disclosures with the same name in this tree.
   * @returns {FocsdDisclosureBase[]}
   */
  #groupOthers() {
    const root = /** @type {Document | ShadowRoot} */ (this.getRootNode());

    return [...(root.querySelectorAll?.('[name][open]') ?? [])].filter(
      /** @returns {other is FocsdDisclosureBase} */ (other) =>
        other !== this && other instanceof FocsdDisclosureBase && other.name === this.name,
    );
  }

  /** Open or close the panel (does nothing while disabled); `toggle` fires once it has. */
  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
  }

  /**
   * Render the trigger button around `content`.
   * @param {unknown} content
   */
  renderButton(content) {
    return html`<button
      part="trigger"
      id=${this.ids.button}
      type="button"
      aria-expanded=${String(this.open)}
      aria-controls=${this.ids.panel}
      aria-disabled=${this.disabled ? 'true' : nothing}
      @click=${() => this.toggle()}
    >${content}<span part="icon" aria-hidden="true"><slot name="icon">${iconSvg('chevron-down')}</slot></span></button>`;
  }

  /**
   * Render the panel, optionally with a landmark `role` labeled by the button.
   * @param {string} [role]
   */
  renderPanel(role) {
    return html`<div part="panel" id=${this.ids.panel} role=${role ?? nothing} aria-labelledby=${role ? this.ids.button : nothing} ?hidden=${!this.open}><slot></slot></div>`;
  }

  /** @override */
  render() {
    return html`${this.renderButton(this.summary)}${this.renderPanel()}`;
  }
}
