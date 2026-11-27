import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSlotStyles, leadingIcon, hasSlottedIcon } from '../internal/icon-slot.js';

/** @typedef {import('../internal/types.js').Tone} Tone */

/**
 * Timeline item: list item with a <time> and a heading.
 *
 * @slot - Default content.
 * @csspart body - The body element.
 * @csspart content - The content element.
 * @csspart heading - The heading element.
 * @csspart marker - The marker element.
 * @csspart time - The time element.
 * @slot icon - Any icon markup (an SVG, an icon component, an icon-font element) shown in the marker, instead of `icon`.
 * @csspart icon - The icon inside the marker (decorative).
 */
export class FocsdTimelineItemBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { icon: {}, iconLibrary: { attribute: 'icon-library' }, datetime: {}, heading: {}, tone: { reflect: true } };

  constructor() {
    super();
    /** An icon before the label: a name from the default icon library (or `icon-library`). For any other icon kit, put it in `slot="icon"`. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** When the event happened, as a date string; shown in the reader's locale. */
    this.datetime = '';
    /** The item's heading. */
    this.heading = '';
    /** @type {Tone} The marker's tone. */
    this.tone = 'neutral';
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'listitem');
    // Styles grow the marker to hold an icon.
    this.toggleAttribute('data-icon', Boolean(this.icon) || hasSlottedIcon(this));
  }

  #formatted() {
    const date = new Date(this.datetime);

    if (Number.isNaN(date.getTime())) return this.datetime;
    // Date-only strings parse as UTC midnight; format them in UTC so they never shift a day.
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(this.datetime);

    /** @type {Intl.DateTimeFormatOptions} */
    const options = { dateStyle: 'medium' };

    if (dateOnly) options.timeZone = 'UTC';

    // The default locale (`setLocale()`), else the nearest `lang`, else the browser's.
    return new Intl.DateTimeFormat(this.localize.locale(), options).format(date);
  }

  /** @override */
  render() {
    return html`<span part="marker" aria-hidden="true">${leadingIcon(this)}</span>
      <div part="content">
        <time part="time" datetime=${this.datetime}>${this.#formatted()}</time>
        <span part="heading">${this.heading}</span>
        <div part="body"><slot></slot></div>
      </div>`;
  }
}
