import { css } from 'lit';
import { FocsdScrollAreaBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

/**
 * @cssprop --focsd-scroll-area-max - The tallest the area grows before it scrolls (default 20rem); `max-block-size` overrides it.
 */
export class FocsdScrollArea extends FocsdScrollAreaBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdScrollAreaBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='viewport'] {
      max-block-size: var(--focsd-scroll-area-max, 20rem);
      overflow: auto;
      padding: var(--focsd-space-3);
      border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      border-radius: var(--focsd-radius-surface);
      background: var(--focsd-surface);
    }
    [part~='viewport']:focus-visible { outline: 2px solid transparent; box-shadow: var(--focsd-focus-ring); }
    ::slotted(*) { margin-block: 0 var(--focsd-space-2); }
  `,
  ];
}

defineElement('focsd-scroll-area', FocsdScrollArea);
