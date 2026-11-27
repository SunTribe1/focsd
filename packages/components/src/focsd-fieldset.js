import { css } from 'lit';
import { FocsdFieldsetBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldsetStyles } from '@focsd-dev/primitives/styles/fieldset.js';

/**
 * @cssprop --focsd-fieldset-gap - Space between the controls in the group (default `--focsd-space-4`).
 */
export class FocsdFieldset extends FocsdFieldsetBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdFieldsetBase.styles,
    hostStyles,
    fieldsetStyles,
    css`
      :host {
        --focsd-fieldset-gap: var(--focsd-space-4);
      }
      [part~='legend'] {
        font-size: var(--focsd-text-subheading-size);
        font-weight: var(--focsd-text-subheading-weight);
      }
    `,
  ];
}

defineElement('focsd-fieldset', FocsdFieldset);
