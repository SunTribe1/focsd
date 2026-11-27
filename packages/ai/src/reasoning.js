import { css, html } from 'lit';
import { FocsdElement, iconSvg } from '@focsd/primitives';
import { defineElement, uid } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './terms.js';

/**
 * Reasoning: the model's reasoning in a disclosure, collapsed by default. The button says
 * "Reasoning", or "Reasoning…" while it streams. The text is never announced: there is no live
 * region, so a screen reader hears it only when the reader opens it.
 *
 * @fires toggle - Fired when it opens or closes. Like `<details>`, it does not bubble.
 * @csspart summary - The button that opens and closes it.
 * @csspart body - The reasoning text.
 */
export class FocsdReasoning extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host {
        display: block;
      }
      [part~='summary'] {
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-2);
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-2);
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink-muted);
        font: inherit;
        cursor: pointer;
      }
      .chevron {
        display: inline-grid;
        transition: transform var(--focsd-duration-base) var(--focsd-ease-move);
      }
      [part~='summary']:hover {
        background: var(--focsd-surface-sunk);
      }
      [part~='summary'][aria-expanded='true'] .chevron {
        transform: rotate(180deg);
      }
      [part~='body'] {
        margin: 0;
        padding: var(--focsd-space-2) var(--focsd-space-3);
        border-inline-start: 3px solid var(--focsd-edge-quiet);
        color: var(--focsd-ink-muted);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    text: {},
    streaming: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
  };

  #ids = { button: uid('focsd-reasoning-button'), body: uid('focsd-reasoning-body') };

  #rendered = false;

  constructor() {
    super();
    /** The reasoning text (plain text). */
    this.text = '';
    /** Whether the reasoning is still streaming. */
    this.streaming = false;
    /** Whether the text is shown. */
    this.open = false;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('open') && this.#rendered) this.dispatchEvent(new Event('toggle'));
    this.#rendered = true;
  }

  /** @override */
  render() {
    const label = this.localize.term(this.streaming ? 'ai.reasoningStreaming' : 'ai.reasoning');

    return html`<button
        part="summary"
        id=${this.#ids.button}
        type="button"
        aria-expanded=${String(this.open)}
        aria-controls=${this.#ids.body}
        @click=${() => (this.open = !this.open)}
      >
        <span>${label}</span><span class="chevron" aria-hidden="true">${iconSvg('chevron-down')}</span></button
      ><div part="body" id=${this.#ids.body} ?hidden=${!this.open}>${this.text}</div>`;
  }
}

defineElement('focsd-reasoning', FocsdReasoning);
