import { css } from 'lit';
import { FocsdVisuallyHiddenBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { visuallyHidden } from '@focsd-dev/primitives/styles/shared.js';

export class FocsdVisuallyHidden extends FocsdVisuallyHiddenBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdVisuallyHiddenBase.styles,
    css`
      :host(:not(:focus-within)) {
        ${visuallyHidden}
      }
    `,
  ];
}

defineElement('focsd-visually-hidden', FocsdVisuallyHidden);
