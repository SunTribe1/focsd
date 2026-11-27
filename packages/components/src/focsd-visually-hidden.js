import { css } from 'lit';
import { FocsdVisuallyHiddenBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { visuallyHidden } from '@focsd/primitives/styles/shared.js';

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
