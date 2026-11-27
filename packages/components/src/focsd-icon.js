import { css } from 'lit';
import { FocsdIconBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';

/**
 * @cssprop --focsd-icon-size - Width and height of the icon (default 1.25em, so it follows the font size).
 */
export class FocsdIcon extends FocsdIconBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdIconBase.styles,
    css`
      :host {
        display: inline-flex;
        vertical-align: -0.125em;
        font-size: var(--focsd-icon-size, 1.25em);
        color: inherit;
      }
      :host([hidden]) {
        display: none;
      }
    `,
  ];
}

defineElement('focsd-icon', FocsdIcon);
