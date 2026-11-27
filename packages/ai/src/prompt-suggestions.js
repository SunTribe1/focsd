import { css, html, nothing } from 'lit';
import { FocsdElement } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './terms.js';

/** The most suggestions shown; each is its own tab stop, so the list stays short. */
const MAX_SHOWN = 4;

/**
 * `detail` of `focsd-suggestion-select`: the chosen suggestion's text.
 * @typedef {{ text: string }} SuggestionSelectDetail
 */

/**
 * Prompt suggestions: a wrapping list of up to four buttons that each fill in a prompt. Every
 * button is a tab stop (no roving focus); the list is named by `label` ("Suggestions").
 *
 * @fires {CustomEvent<SuggestionSelectDetail>} focsd-suggestion-select - A suggestion was chosen. `detail` has `text`.
 * @csspart list - The list of suggestions.
 * @csspart suggestion - Each suggestion button.
 */
export class FocsdPromptSuggestions extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host { display: block; }
      [part~='list'] { display: flex; flex-wrap: wrap; gap: var(--focsd-space-2); margin: 0; padding: 0; list-style: none; }
      [part~='suggestion'] {
        min-block-size: max(var(--focsd-target-min, 24px), var(--focsd-control-height, 36px));
        padding: var(--focsd-space-1) var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        font: inherit;
        text-align: start;
        cursor: pointer;
      }
      [part~='suggestion']:hover { background: var(--focsd-surface-sunk); }
      @media (forced-colors: active) { [part~='suggestion'] { border-color: ButtonText; } }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    suggestions: { attribute: false },
    label: {},
  };

  constructor() {
    super();
    /** @type {readonly string[]} The suggestions; the first four are shown. */
    this.suggestions = [];
    /** The list's accessible name; defaults to "Suggestions". */
    this.label = '';
  }

  /** @param {string} text */
  #select(text) {
    /** @type {CustomEvent<SuggestionSelectDetail>} */
    const event = new CustomEvent('focsd-suggestion-select', { bubbles: true, detail: { text } });
    this.dispatchEvent(event);
  }

  /** @override */
  render() {
    const shown = (this.suggestions ?? []).slice(0, MAX_SHOWN);

    if (!shown.length) return nothing;

    /* eslint-disable lit-a11y/no-redundant-role -- role="list" is not redundant: Safari drops list semantics from <ul> styled with list-style: none */
    return html`<ul part="list" role="list" aria-label=${this.label || this.localize.term('ai.suggestions')}>
      ${shown.map((text) => html`<li><button part="suggestion" type="button" @click=${() => this.#select(text)}>${text}</button></li>`)}
    </ul>`;
    /* eslint-enable lit-a11y/no-redundant-role */
  }
}

defineElement('focsd-prompt-suggestions', FocsdPromptSuggestions);
