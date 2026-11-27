import { css } from 'lit';
import { FocsdSkipLinkBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles, visuallyHidden } from '@focsd/primitives/styles/shared.js';
import { linkStyles } from '@focsd/primitives/styles/link.js';

export class FocsdSkipLink extends FocsdSkipLinkBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSkipLinkBase.styles,
    hostStyles,
    linkStyles,
    css`
      :host {
        position: fixed;
        inset-block-start: var(--focsd-space-3);
        inset-inline-start: var(--focsd-space-3);
        z-index: var(--focsd-layer-skip-link);
      }
      :host(:not(:focus-within)) {
        ${visuallyHidden}
        position: fixed !important;
      }
      [part~='link'] {
        display: inline-block;
        padding: var(--focsd-space-3) var(--focsd-space-4);
        background: var(--focsd-surface-raised);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        box-shadow: var(--focsd-shadow-overlay);
        font-weight: var(--focsd-text-label-weight);
      }
    `,
  ];
}

defineElement('focsd-skip-link', FocsdSkipLink);
