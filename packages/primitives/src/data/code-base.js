import { html } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';

/**
 * Code block: labeled focusable scroll region with a copy button (tag from `static copyButtonTag`)
 * named "Copy code". A failed copy selects the code, so it can be copied by hand.
 *
 * @slot - Default content.
 * @csspart code - The code element.
 * @csspart copy - The copy button element.
 * @csspart copy-button - The copy button's own button.
 * @csspart header - The header element.
 * @csspart label - The label element.
 * @csspart viewport - The viewport element.
 */
export class FocsdCodeBase extends FocsdElement {
  /** The copy button the code block renders. */
  static copyButtonTag = 'focsd-copy-button';

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, language: { reflect: true } };

  #labelId = uid('focsd-code-label');

  /** @type {MutationObserver | undefined} */
  #observer;

  constructor() {
    super();
    /** The accessible name of the code block. */
    this.label = '';
    /** The code's language, such as `js`; reflected for styling. */
    this.language = '';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    // The copy button's value follows the code's text, also when it changes after the first render.
    this.#observer ??= new MutationObserver(() => this.requestUpdate());
    this.#observer.observe(this, { childList: true, characterData: true, subtree: true });
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** Copy failed: select the code so it can be copied by hand (Ctrl/Cmd+C). */
  #selectCode() {
    /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="viewport"]'))?.focus();
    const range = document.createRange();
    range.selectNodeContents(this);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  /** @override */
  render() {
    const tag = unsafeStatic(/** @type {typeof FocsdCodeBase} */ (this.constructor).copyButtonTag);

    return html`<div part="header">
        <span part="label" id=${this.#labelId}>${this.label}</span>
        ${staticHtml`<${tag} part="copy" exportparts="button: copy-button" label=${this.localize.term('copyCode')} .value=${this.textContent ?? ''} @focsd-error=${() => this.#selectCode()}></${tag}>`}
      </div>
      <pre part="viewport" role="region" aria-labelledby=${this.#labelId} tabindex="0"><code part="code"><slot></slot></code></pre>`;
  }
}
