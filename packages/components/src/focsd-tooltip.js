import { css } from 'lit';
import { FocsdTooltipBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { enterMotion } from '@focsd/primitives/styles/motion.js';

export class FocsdTooltip extends FocsdTooltipBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTooltipBase.styles,
    css`
      :host {
        display: inline-block;
      }
      ::slotted(*) {
        anchor-name: --_tooltip-anchor;
      }
      [part~='tooltip'] {
        position-anchor: --_tooltip-anchor;
        position-area: block-start;
        position-try-fallbacks: flip-block;
        inset: auto;
        margin: 0 0 var(--focsd-space-2);
        max-inline-size: 18rem;
        padding: var(--focsd-space-2) var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-ink);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-ink);
        color: var(--focsd-ground);
        font-family: var(--focsd-font-sans);
        font-size: var(--focsd-text-label-size);
        line-height: var(--focsd-text-label-line-height);
      }
    `,
    enterMotion("[part~='tooltip']:popover-open", { from: 'none', duration: 'quick' }),
  ];
}

defineElement('focsd-tooltip', FocsdTooltip);
