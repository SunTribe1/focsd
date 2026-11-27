import { css } from 'lit';
import { FocsdAvatarGroupBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import './focsd-avatar.js';

export class FocsdAvatarGroup extends FocsdAvatarGroupBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdAvatarGroupBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
      }
      [part~='group'] {
        display: inline-flex;
        align-items: center;
      }
      ::slotted(*:not(:first-child)) {
        margin-inline-start: calc(var(--focsd-space-2) * -1);
      }
      [part~='overflow'] {
        display: inline-grid;
        place-items: center;
        inline-size: 2.5rem;
        block-size: 2.5rem;
        margin-inline-start: calc(var(--focsd-space-2) * -1);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: 50%;
        background: var(--focsd-surface);
        font-size: var(--focsd-text-label-size);
        font-weight: var(--focsd-text-label-weight);
      }
    `,
  ];
}

defineElement('focsd-avatar-group', FocsdAvatarGroup);
