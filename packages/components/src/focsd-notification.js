import { css } from 'lit';
import { FocsdNotificationBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';

/**
 * One notification inside `focsd-notification-center`, written as markup: `id`, `title`, `body`,
 * `time`, `read`, `href` and `tone` attributes. The center renders it; it shows nothing itself.
 */
export class FocsdNotification extends FocsdNotificationBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdNotificationBase.styles,
    css`
      :host {
        display: none;
      }
    `,
  ];
}

defineElement('focsd-notification', FocsdNotification);
