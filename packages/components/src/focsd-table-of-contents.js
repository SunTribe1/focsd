import { css } from 'lit';
import { FocsdTableOfContentsBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

/**
 * Table of contents: a navigation list of links to the headings of a region, marking the section
 * in view as the current location.
 */
export class FocsdTableOfContents extends FocsdTableOfContentsBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTableOfContentsBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='list'] {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      [part~='list'] [part~='list'] {
        padding-inline-start: var(--focsd-space-3);
      }
      [part~='link'] {
        display: flex;
        align-items: center;
        min-block-size: var(--focsd-target-min);
        padding-block: var(--focsd-space-1);
        padding-inline-start: var(--focsd-space-3);
        border-inline-start: 2px solid transparent;
        color: var(--focsd-ink-muted);
        text-decoration: none;
      }
      [part~='link']:hover {
        color: var(--focsd-ink);
        text-decoration: underline;
      }
      [part~='link'][aria-current='location'] {
        border-inline-start-color: var(--focsd-action);
        color: var(--focsd-ink);
        font-weight: var(--focsd-text-label-weight);
      }
      @media (forced-colors: active) {
        [part~='link'][aria-current='location'] {
          border-inline-start-color: Highlight;
        }
      }
    `,
  ];
}

defineElement('focsd-table-of-contents', FocsdTableOfContents);
