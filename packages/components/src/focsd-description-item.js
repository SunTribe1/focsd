import { css } from 'lit';
import { FocsdDescriptionItemBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

export class FocsdDescriptionItem extends FocsdDescriptionItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdDescriptionItemBase.styles,
    hostStyles,
    css`
    :host { display: block; container-type: inline-size; }
    [part~='dl'] { display: grid; grid-template-columns: minmax(8rem, 1fr) 2fr; gap: var(--focsd-space-3); margin: 0; }
    [part~='term'] { color: var(--focsd-ink-muted); font-size: var(--focsd-text-small-size); }
    [part~='description'] { margin: 0; }
    @container (max-width: 24rem) { [part~='dl'] { grid-template-columns: 1fr; gap: var(--focsd-space-1); } }
  `,
  ];
}

defineElement('focsd-description-item', FocsdDescriptionItem);
