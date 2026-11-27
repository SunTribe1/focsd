import { css, html, isServer, nothing } from 'lit';
import { FocsdElement } from '@focsd-dev/primitives';
import { defineElement, overflowRegions, syncOverflowRegion } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import '@focsd-dev/components/focsd-copy-button.js';
import { renderMarkdown } from './markdown/index.js';
import './terms.js';

/** @typedef {import('./markdown/index.js').RenderState} RenderState */

/** Blocks the caret goes inside of, to sit after the last text of the last block. */
const BLOCKS = new Set(['P', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE']);

/**
 * Where the caret goes: into the last block (and its last list item or quote block) but never
 * into inline markup, so it follows the last text; in a code block, into its `code`, never into
 * the copy button or the language label.
 * @param {Element} root
 * @param {Element} caret
 * @returns {Element}
 */
function caretHome(root, caret) {
  for (let at = root; ;) {
    const last = at.lastChild === caret ? caret.previousSibling : at.lastChild;

    if (last?.nodeName === 'PRE') return /** @type {Element} */ (last).querySelector('code') ?? at;

    if (!last || !BLOCKS.has(last.nodeName)) return at;
    at = /** @type {Element} */ (last);
  }
}

/** The code blocks in (or at) a rendered block. */
const codeBlocks = (/** @type {Element} */ node) => [node, ...node.querySelectorAll('pre')].filter((n) => n.matches('pre[part~="code"]'));

/**
 * Streaming text: markdown (or plain text, with `plain`) that grows while a reply streams. Each update parses the
 * text again but rebuilds only the last block: finished blocks keep their nodes, so a selection or
 * focus inside them survives. Raw HTML in the text is shown as text; nothing is ever parsed as HTML.
 * A caret shows at the end while `streaming` (an opacity pulse, still under reduced motion).
 * Code blocks show their language and a copy button.
 *
 * @csspart text - The text.
 * @csspart caret - The caret shown while streaming (hidden from assistive technology).
 * @csspart code - Each code block (`pre`).
 * @csspart code-copy - The copy button of each code block.
 */
export class FocsdStreamingText extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host {
        display: block;
        overflow-wrap: anywhere;
      }
      .ssr,
      [part~='text'][data-plain] {
        white-space: pre-wrap;
      }
      [part~='text'] > :first-child {
        margin-block-start: 0;
      }
      [part~='text'] > :last-child {
        margin-block-end: 0;
      }
      p,
      ul,
      ol,
      blockquote,
      pre {
        margin-block: 0 var(--focsd-space-3);
      }
      h3,
      h4,
      h5,
      h6 {
        margin-block: var(--focsd-space-4) var(--focsd-space-2);
        font-size: var(--focsd-text-body-size);
        font-weight: var(--focsd-text-subheading-weight, 600);
      }
      h3 {
        font-size: var(--focsd-text-subheading-size);
      }
      blockquote {
        margin-inline: 0;
        padding-inline-start: var(--focsd-space-3);
        border-inline-start: 3px solid var(--focsd-edge);
        color: var(--focsd-ink-muted);
      }
      a {
        color: var(--focsd-link-color, var(--focsd-route));
        text-decoration: underline;
      }
      code {
        font-family: var(--focsd-font-mono);
        font-size: 0.925em;
      }
      :not(pre) > code {
        padding-inline: 0.25em;
        border-radius: var(--focsd-radius-tag);
        background: var(--focsd-surface-sunk);
      }
      [part~='code'] {
        position: relative;
        padding: var(--focsd-space-3);
        padding-inline-end: calc(var(--focsd-control-height) + var(--focsd-space-3));
        border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface-sunk);
        overflow-x: auto;
      }
      [part~='code']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      .language {
        display: block;
        margin-block-end: var(--focsd-space-1);
        color: var(--focsd-ink-muted);
        font-family: var(--focsd-font-sans);
        font-size: var(--focsd-text-small-size);
      }
      [part~='code-copy'] {
        position: absolute;
        inset-block-start: var(--focsd-space-1);
        inset-inline-end: var(--focsd-space-1);
      }
      [part~='caret'] {
        display: inline-block;
        inline-size: 0.5em;
        block-size: 1em;
        margin-inline-start: 0.1em;
        vertical-align: text-bottom;
        background: currentColor;
        animation: focsd-caret 1s steps(2, jump-none) infinite;
      }
      @keyframes focsd-caret {
        from {
          opacity: 1;
        }
        to {
          opacity: 0.2;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        [part~='caret'] {
          animation: none;
        }
      }
      @media (forced-colors: active) {
        [part~='caret'] {
          background: CanvasText;
        }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    text: {},
    plain: { type: Boolean },
    streaming: { type: Boolean, reflect: true },
  };

  /** @type {RenderState | undefined} */
  #state;

  /** @type {HTMLElement | null} */
  #caret = null;

  /** Block nodes whose code blocks are decorated already. */
  #decorated = new WeakSet();

  /** Code blocks take focus only while they scroll (review item 90). */
  #regions = overflowRegions();

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    // Moved or re-attached: watch the code blocks again.
    for (const pre of this.renderRoot?.querySelectorAll?.('pre[part~="code"]') ?? []) this.#regions.watch(pre);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#regions.disconnect();
  }

  constructor() {
    super();
    /** The text, markdown unless `plain` is set. */
    this.text = '';
    /** Shows the text as plain text, with no markdown. */
    this.plain = false;
    /** Whether the text is still streaming: shows the caret. */
    this.streaming = false;
  }

  /** @override */
  render() {
    // On the server the text is plain text (pre-wrap), so the content is there before hydration.
    // In the browser updated() builds the markdown into the box, which is no Lit binding's to own.
    // The binding sits in a span that updated() replaces, so Lit's markers never mix with the markdown.
    return html`<div part="text"><span class="ssr">${isServer ? this.text : nothing}</span></div>`;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    const box = /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="text"]'));

    if (changed.has('plain')) this.#state = undefined;

    if (changed.has('text') || changed.has('plain')) this.#fill(box);

    this.#placeCaret(box);
  }

  /** @param {HTMLElement} box */
  #fill(box) {
    const text = String(this.text ?? '');

    box.toggleAttribute('data-plain', this.plain);

    if (this.plain) {
      box.replaceChildren(text);
      this.#state = undefined;

      return;
    }

    this.#state = renderMarkdown(box, text, this.#state);

    const blocks = this.#state.blocks;

    // New blocks are at the end; kept ones were decorated when they were new.
    for (let k = blocks.length - 1; k >= 0; k--) {
      const node = /** @type {Element} */ (blocks[k]?.node);

      if (this.#decorated.has(node)) break;
      this.#decorated.add(node);

      for (const pre of codeBlocks(node)) this.#decorate(pre);
    }

    // A code block that is still growing keeps its copy button: give it the code so far.
    const last = /** @type {Element | undefined} */ (blocks.at(-1)?.node);

    for (const pre of last ? codeBlocks(last) : []) {
      const copy = /** @type {(HTMLElement & { value: string }) | null} */ (pre.querySelector('[part~="code-copy"]'));

      if (copy) copy.value = pre.querySelector('code')?.textContent ?? '';
      // Growing text can make it overflow without the box resizing.
      syncOverflowRegion(pre);
    }
  }

  /**
   * Names a code block (a focusable region while it scrolls) and adds the language label and the copy button.
   * @param {Element} pre
   */
  #decorate(pre) {
    const doc = this.ownerDocument;
    const language = pre.getAttribute('data-language');

    pre.setAttribute('aria-label', language ? this.localize.term('ai.codeLanguage', language) : this.localize.term('ai.code'));
    const copy = /** @type {HTMLElement & { value: string, label: string }} */ (doc.createElement('focsd-copy-button'));

    copy.setAttribute('part', 'code-copy');
    copy.value = pre.querySelector('code')?.textContent ?? '';
    copy.label = this.localize.term('ai.copyCode');

    if (language) {
      const label = doc.createElement('span');

      label.className = 'language';
      label.textContent = this.localize.term('ai.codeLanguage', language);
      pre.prepend(label);
    }

    pre.append(copy);
    this.#regions.watch(pre);
  }

  /** @param {HTMLElement} box */
  #placeCaret(box) {
    if (!this.streaming) {
      this.#caret?.remove();

      return;
    }

    if (!this.#caret) {
      this.#caret = this.ownerDocument.createElement('span');
      this.#caret.setAttribute('part', 'caret');
      this.#caret.setAttribute('aria-hidden', 'true');
    }

    const home = caretHome(box, this.#caret);

    if (home.lastChild !== this.#caret) home.append(this.#caret);
  }
}

defineElement('focsd-streaming-text', FocsdStreamingText);
