import { css } from 'lit';
import { FocsdToggleGroupBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import './focsd-toggle.js';

export class FocsdToggleGroup extends FocsdToggleGroupBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdToggleGroupBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: inline-block;
        max-inline-size: 100%;
      }
      :host([label-position='start']),
      :host([label-position='end']) {
        display: block;
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='group'] {
        justify-self: start;
        display: inline-flex;
        gap: var(--focsd-space-1);
        padding: var(--focsd-space-1);
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge-quiet));
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
      }
    `,
  ];
}

defineElement('focsd-toggle-group', FocsdToggleGroup);
