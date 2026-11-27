import { css } from 'lit';
import { FocsdRelativeTimeBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';

/**
 * Relative time: shows a date as text such as "3 hours ago" in a `<time>` element and keeps it current,
 * with the full date as its title and in visually hidden text. It takes the surrounding font and color.
 */
export class FocsdRelativeTime extends FocsdRelativeTimeBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdRelativeTimeBase.styles,
    css`
      :host {
        display: inline;
      }
      :host([hidden]) {
        display: none;
      }
    `,
  ];
}

defineElement('focsd-relative-time', FocsdRelativeTime);
