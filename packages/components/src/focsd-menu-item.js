import { css } from 'lit';
import { FocsdMenuItemBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hatch, hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import { cycleHueStyles } from '@focsd-dev/primitives/styles/hue.js';

export class FocsdMenuItem extends FocsdMenuItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdMenuItemBase.styles,
    cycleHueStyles,
    hostStyles,
    css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--focsd-space-2);
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        border-radius: var(--focsd-radius-control);
        font-size: var(--focsd-text-body-size);
        cursor: pointer;
      }
      :host(:hover),
      :host(:focus) {
        background: var(--focsd-surface-sunk);
      }
      :host([variant='critical']) {
        color: var(--focsd-critical);
      }
      :host([disabled]),
      :host([disabled]:hover) {
        color: var(--focsd-ink-muted);
        background: ${hatch};
        cursor: not-allowed;
      }
    `,
    hoverMotion(':host'),
  ];
}

defineElement('focsd-menu-item', FocsdMenuItem);
