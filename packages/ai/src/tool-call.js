import { css, html, nothing } from 'lit';
import { FocsdElement, iconSvg } from '@focsd-dev/primitives';
import { defineElement, overflowRegions, uid } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './terms.js';

/** @typedef {'running' | 'done' | 'error'} ToolStatus */

/** The word (term key) and icon for each status; running shows a spinning ring. */
const STATUS = {
  running: { term: 'ai.toolRunning', icon: '' },
  done: { term: 'ai.toolDone', icon: 'check' },
  error: { term: 'ai.toolError', icon: 'alert-circle' },
};

/**
 * A value as display text: strings as they are, anything else as indented JSON, and its string
 * form when JSON cannot hold it (a cycle, a BigInt).
 * @param {unknown} value
 * @returns {string}
 */
function asText(value) {
  if (Object.prototype.toString.call(value) === '[object String]') return String(value);

  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Tool call: a disclosure for one tool the model called. The button is named "{name}, {status}"
 * and shows the status as an icon plus a word. Opened, it shows the input and output as JSON text;
 * they are only ever text (Lit text bindings, never parsed as HTML).
 *
 * @fires toggle - Fired when it opens or closes. Like `<details>`, it does not bubble.
 * @csspart summary - The button that opens and closes it.
 * @csspart status - The status icon and word.
 * @csspart input - The input (`pre`).
 * @csspart output - The output (`pre`), when there is one.
 */
export class FocsdToolCall extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host {
        display: block;
        border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        border-radius: var(--focsd-radius-control);
        font-size: var(--focsd-text-small-size);
      }
      [part~='summary'] {
        display: flex;
        align-items: center;
        gap: var(--focsd-space-2);
        inline-size: 100%;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink);
        font: inherit;
        text-align: start;
        cursor: pointer;
      }
      [part~='summary']:hover {
        background: var(--focsd-surface-sunk);
      }
      .name {
        font-family: var(--focsd-font-mono);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='status'] {
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-1);
        margin-inline-start: auto;
        color: var(--focsd-ink-muted);
      }
      :host([status='done']) .icon {
        color: var(--focsd-positive);
      }
      :host([status='error']) [part~='status'] {
        color: var(--focsd-critical);
      }
      .icon {
        display: inline-grid;
      }
      .ring {
        inline-size: 0.9em;
        block-size: 0.9em;
        box-sizing: border-box;
        border: 2px solid currentColor;
        border-inline-end-color: transparent;
        border-radius: 50%;
        animation: focsd-tool-spin 0.8s linear infinite;
      }
      @keyframes focsd-tool-spin {
        to {
          transform: rotate(1turn);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .ring {
          animation: none;
        }
      }
      .chevron {
        display: inline-grid;
        transition: transform var(--focsd-duration-base) var(--focsd-ease-move);
      }
      [aria-expanded='true'] .chevron {
        transform: rotate(180deg);
      }
      .panel {
        display: grid;
        gap: var(--focsd-space-1);
        padding: 0 var(--focsd-space-3) var(--focsd-space-3);
      }
      .panel[hidden] {
        display: none;
      }
      .label {
        color: var(--focsd-ink-muted);
        font-weight: var(--focsd-text-label-weight);
      }
      pre {
        margin: 0 0 var(--focsd-space-2);
        padding: var(--focsd-space-2);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface-sunk);
        font-family: var(--focsd-font-mono);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        max-block-size: 20rem;
        overflow: auto;
      }
      pre:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    name: {},
    status: { reflect: true },
    input: { attribute: false },
    output: { attribute: false },
    open: { type: Boolean, reflect: true },
  };

  #panel = uid('focsd-tool-panel');

  #rendered = false;

  constructor() {
    super();
    /** The tool's name. */
    this.name = '';
    /** @type {ToolStatus} Whether the tool is running, done or failed (`error`). */
    this.status = 'running';
    /** @type {unknown} The tool's input, shown as JSON; nothing is shown while it is undefined. */
    this.input = undefined;
    /** @type {unknown} The tool's output, shown as JSON; nothing is shown while it is undefined. */
    this.output = undefined;
    /** Whether the input and output are shown. */
    this.open = false;
  }

  /** The input and output take focus only while they scroll (review item 90). */
  #regions = overflowRegions();

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    for (const pre of this.renderRoot?.querySelectorAll?.('pre') ?? []) this.#regions.watch(pre);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#regions.disconnect();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('open') && this.#rendered) this.dispatchEvent(new Event('toggle'));
    this.#rendered = true;

    for (const pre of this.renderRoot.querySelectorAll('pre')) this.#regions.watch(pre);
  }

  /**
   * A labeled block: the label, then the `pre`, named by it. While the `pre` scrolls it is a region
   * in the tab order (arrow keys scroll it); nothing is shown while `value` is undefined.
   * @param {string} part
   * @param {string} label
   * @param {unknown} value
   */
  #block(part, label, value) {
    if (value === undefined) return nothing;

    const id = `${this.#panel}-${part}`;

    return html`<span class="label" id=${id}>${label}</span
      ><pre part=${part} aria-labelledby=${id}>${asText(value)}</pre>`;
  }

  /** @override */
  render() {
    const status = STATUS[/** @type {ToolStatus} */ (this.status)] ?? STATUS.running;
    const word = this.localize.term(status.term);
    const t = (/** @type {string} */ key) => this.localize.term(key);

    return html`<button
        part="summary"
        type="button"
        aria-label=${this.localize.term('ai.toolCall', this.name, word)}
        aria-expanded=${String(this.open)}
        aria-controls=${this.#panel}
        @click=${() => (this.open = !this.open)}
      >
        <span class="name">${this.name}</span>
        <span part="status"
          ><span class="icon" aria-hidden="true">${status.icon ? iconSvg(status.icon) : html`<span class="ring"></span>`}</span
          >${word}</span
        >
        <span class="chevron" aria-hidden="true">${iconSvg('chevron-down')}</span>
      </button>
      <div class="panel" id=${this.#panel} ?hidden=${!this.open}>
        ${this.#block('input', t('ai.toolInput'), this.input)}
        ${this.#block('output', t('ai.toolOutput'), this.output)}
      </div>`;
  }
}

defineElement('focsd-tool-call', FocsdToolCall);
