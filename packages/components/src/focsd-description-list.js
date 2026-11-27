import { css } from 'lit';
import { FocsdDescriptionListBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './focsd-description-item.js';

export class FocsdDescriptionList extends FocsdDescriptionListBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdDescriptionListBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='list'] { display: grid; gap: var(--focsd-space-3); }
  `,
  ];
}

defineElement('focsd-description-list', FocsdDescriptionList);
