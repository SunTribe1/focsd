import { FocsdElement } from '../internal/focsd-element.js';

/** @typedef {import('../internal/types.js').Tone} Tone */

/**
 * One notification in a notification center, written as markup: its fields are attributes, and the
 * center renders it. Its own `id` and `title` attributes are the notification's id and title. It shows
 * nothing by itself.
 */
export class FocsdNotificationBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    body: { reflect: true },
    time: { reflect: true },
    read: { type: Boolean, reflect: true },
    href: { reflect: true },
    tone: { reflect: true },
  };

  constructor() {
    super();
    /** The text under the title. */
    this.body = '';
    /** When it happened, as an ISO 8601 date-time. */
    this.time = '';
    /** Whether it has been read; the app sets it (the center only fires `focsd-read`). */
    this.read = false;
    /** Makes the title a link to this URL. */
    this.href = '';
    /** @type {Tone} Styling only. */
    this.tone = 'neutral';
  }

  /** @override */
  render() {
    return null;
  }
}
