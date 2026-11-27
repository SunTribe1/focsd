import { css } from 'lit';
import { FocsdOptionBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hatch, hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import { activeOption, optionBox, selectedOption, selectedOptionForced } from '@focsd-dev/primitives/styles/listbox.js';
import { cycleHueStyles } from '@focsd-dev/primitives/styles/hue.js';

export class FocsdOption extends FocsdOptionBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdOptionBase.styles,
    cycleHueStyles,
    hostStyles,
    css`
      :host {
        ${optionBox}
        font-size: var(--focsd-text-body-size);
      }
      :host(:hover),
      :host(:focus) {
        background: var(--focsd-surface-sunk);
      }
      :host([aria-selected='true']) {
        ${selectedOption}
      }
      :host([aria-disabled='true']),
      :host([aria-disabled='true']:hover) {
        color: var(--focsd-ink-muted);
        background: ${hatch};
        cursor: not-allowed;
      }
      @media (forced-colors: active) {
        :host([aria-selected='true']) {
          ${selectedOptionForced}
        }
      }
    `,
    activeOption(':host(:focus-visible)'),
    hoverMotion(':host'),
  ];
}

defineElement('focsd-option', FocsdOption);
