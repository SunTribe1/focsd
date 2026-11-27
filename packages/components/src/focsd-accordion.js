import { css } from 'lit';
import { FocsdAccordionBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './focsd-accordion-item.js';

export class FocsdAccordion extends FocsdAccordionBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdAccordionBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        border-block-start: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      }
    `,
  ];
}

defineElement('focsd-accordion', FocsdAccordion);
