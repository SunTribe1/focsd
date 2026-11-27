import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { warnOnce } from '../internal/warn.js';
import { hueNamed, syncHue } from '../internal/hue.js';

/** @typedef {import('../internal/types.js').Tone} Tone */

/** @typedef {'top-end' | 'top-start' | 'bottom-end' | 'bottom-start'} BadgePlacement */

/**
 * Inline status label, or an indicator over an avatar or icon. Text content is the label; `tone`
 * is styling only.
 *
 * With `dot` or `count`, the default slot is the anchor (an avatar or icon) and the badge draws an
 * indicator at one of its corners. The indicator is hidden from assistive technology; visually
 * hidden text says the same thing ("3 unread", or the dot's `label`), so it joins the accessible
 * name of a button or link around the badge, set off by a space on each side ("Inbox 3 unread").
 * The visible count is capped at `max` (`99+`); the hidden text keeps the real count. A `count` of
 * 0 shows the anchor alone and says nothing. A dot without `label` adds no text: it is decorative
 * (and warns once), so give a dot that carries meaning a `label`.
 *
 * @slot - Default content: the label, or the anchor with `dot` or `count`.
 * @csspart badge - The inline badge (without `dot` or `count`).
 * @csspart anchor - The wrapper around the anchor (with `dot` or `count`).
 * @csspart indicator - The dot or the count at the anchor's corner; hidden from assistive technology.
 * @csspart hidden-text - Visually hidden text that names the indicator.
 */
export class FocsdBadgeBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    tone: { reflect: true },
    dot: { type: Boolean, reflect: true },
    count: { type: Number },
    max: { type: Number },
    placement: { reflect: true },
    label: {},
    color: { reflect: true },
  };

  constructor() {
    super();
    /** @type {Tone} The badge's tone: sets its color. */
    this.tone = 'neutral';
    /** Show a dot over the anchor instead of a count; set `label` to say what it means. */
    this.dot = false;
    /** @type {number | undefined} The number shown over the anchor; 0 hides the indicator. */
    this.count = undefined;
    /** The largest count shown as a number; higher counts show as `max+`. */
    this.max = 99;
    /** @type {BadgePlacement} The corner of the anchor the indicator sits on (start and end follow the reading direction). */
    this.placement = 'top-end';
    /** What the indicator means, read after the count ("unread" reads "3 unread"), or as is for a dot. */
    this.label = '';
    /** A category color (`blue`, `violet`, `pink`, `red`, `orange`, `amber`, `green`, `teal`), shown by colorful presets such as Prismatic; others keep the tone. */
    this.color = '';
  }

  /** The count as a whole number of 0 or more. */
  get #count() {
    const count = Math.trunc(Number(this.count));

    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    super.updated(changed);
    syncHue(this, hueNamed(this.color));

    // A dot with no label means nothing to a screen reader: say so once per page (R36).
    if (this.dot && !this.label) warnOnce('badge:dot-label', 'A <focsd-badge> dot needs a label, such as label="Online".');
  }

  /** The visible count, capped at `max`. */
  get #shown() {
    const count = this.#count;
    const max = Math.trunc(Number(this.max));

    return Number.isFinite(max) && max > 0 && count > max ? `${max}+` : String(count);
  }

  /** The text read for the indicator. */
  get #text() {
    if (this.dot) return this.label;

    return this.label ? `${this.#count} ${this.label}` : String(this.#count);
  }

  /** @override */
  render() {
    if (!this.dot && this.count == null) return html`<span part="badge"><slot></slot></span>`;
    const on = this.dot || this.#count > 0;
    const text = on ? this.#text : '';

    return html`<span part="anchor"
        ><slot></slot
        >${on ? html`<span part="indicator" aria-hidden="true">${this.dot ? '' : this.#shown}</span>` : nothing}</span
      >${text ? html`<span part="hidden-text" class="focsd-visually-hidden">${` ${text} `}</span>` : nothing}`;
  }
}
