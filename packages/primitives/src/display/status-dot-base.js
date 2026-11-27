import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/** @typedef {'online' | 'offline' | 'busy' | 'warning' | 'error' | 'neutral'} Status */

/**
 * The dot's shape per status, on a 10 × 10 grid, so the status never rests on color alone:
 * a filled circle, a ring, a square, a triangle, a cross and a dash. All are filled shapes (the
 * ring with an even-odd hole), so one fill draws them, `CanvasText` in forced colors.
 * @type {Readonly<Record<Status, string>>}
 */
export const STATUS_GLYPHS = Object.freeze({
  online: 'M5 0a5 5 0 1 0 0 10a5 5 0 1 0 0-10z',
  offline: 'M5 0a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM5 2.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z',
  busy: 'M1 1h8v8H1z',
  warning: 'M5 .5l4.8 9H.2z',
  error: 'M2 .6l3 3 3-3L9.4 2l-3 3 3 3L8 9.4l-3-3-3 3L.6 8l3-3-3-3z',
  neutral: 'M0 3.5h10v3H0z',
});

/** The translation key of each status's default label. */
const TERMS = {
  online: 'statusOnline',
  offline: 'statusOffline',
  busy: 'statusBusy',
  warning: 'statusWarning',
  error: 'statusError',
  neutral: 'statusNeutral',
};

/**
 * Status dot: a small shape that shows a status, an image named by its status ("Online" for
 * `status="online"`). A custom `label` goes first in the name, "Server 3, Online", so the status is
 * never lost to assistive technology; `label-visible` writes the label beside the dot. The shape
 * differs per status as well as the color. `pulse` draws a slow ring around an online dot that beats
 * twice and stops (none under reduced motion). An unknown status is drawn and named as `neutral`.
 *
 * @csspart base - The image: the dot and, with `label-visible`, the label.
 * @csspart dot - The shape (an SVG).
 * @csspart label - The visible label (with `label-visible`).
 */
export class FocsdStatusDotBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    status: { reflect: true },
    label: {},
    labelVisible: { type: Boolean, attribute: 'label-visible', reflect: true },
    pulse: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    /** @type {Status} The status shown. */
    this.status = 'neutral';
    /** The visible text with `label-visible`, and the start of the accessible name ("Server 3, Online"); by default the status's name, such as "Online". */
    this.label = '';
    /** Shows the label beside the dot; otherwise it is only read. */
    this.labelVisible = false;
    /** Draws a slow pulse around an online dot, twice (ignored for other statuses and under reduced motion). */
    this.pulse = false;
  }

  /** The status, or `neutral` for one that is not known. @returns {Status} */
  get #status() {
    return Object.hasOwn(STATUS_GLYPHS, this.status) ? this.status : 'neutral';
  }

  /** @override */
  render() {
    const status = this.#status;
    const word = this.localize.term(TERMS[status]);
    // A custom label alone would hide the status from assistive technology (shape and color carry
    // it for sighted people only), so the name is "label, status"; it still holds the visible text.
    const name = this.label && this.label !== word ? `${this.label}${this.localize.term('listSeparator')}${word}` : word;

    return html`<span part="base" role="img" aria-label=${name} data-status=${status}
      ><span class="dot"
        >${this.pulse && status === 'online' ? html`<span class="halo"></span>` : nothing}<svg part="dot" viewBox="0 0 10 10" aria-hidden="true">
          <path d=${STATUS_GLYPHS[status]} fill-rule="evenodd"></path></svg></span
      >${this.labelVisible ? html`<span part="label">${this.label || word}</span>` : nothing}</span
    >`;
  }
}
