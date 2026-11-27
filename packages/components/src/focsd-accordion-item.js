import { css } from 'lit';
import { FocsdAccordionItemBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';
import { disclosureStyles } from '@focsd/primitives/styles/disclosure.js';

export class FocsdAccordionItem extends FocsdAccordionItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdAccordionItemBase.styles,
    hostStyles,
    disclosureStyles,
    css`
      :host {
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      }
    `,
    enterMotion("[part~='panel']:not([hidden])"),
  ];
}

defineElement('focsd-accordion-item', FocsdAccordionItem);
