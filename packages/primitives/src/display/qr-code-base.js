import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { encodeQr } from '../internal/qr.js';
import { warnOnce } from '../internal/warn.js';

/**
 * `detail` of `focsd-error` on a QR code: why no code was drawn.
 * @typedef {{ reason: 'too-long' }} QrCodeErrorDetail
 */

/** @typedef {'L' | 'M' | 'Q' | 'H'} QrErrorCorrection */

/** @type {ReadonlySet<string>} */
const LEVELS = new Set(['L', 'M', 'Q', 'H']);

/** The blank margin scanners need around the code, in modules. */
const QUIET = 4;

const DEFAULT_SIZE = 128;

/**
 * SVG path data for the dark modules, offset by the quiet zone: one `M x y h run v1 h -run z` per
 * horizontal run of dark modules, so the path stays small and needs no style attributes.
 * @param {boolean[][]} matrix
 */
function modulesPath(matrix) {
  /** @type {string[]} */
  const runs = [];

  matrix.forEach((row, y) => {
    let x = 0;

    while (x < row.length) {
      const start = x;

      while (x < row.length && row[x]) x++;

      if (x > start) runs.push(`M${start + QUIET} ${y + QUIET}h${x - start}v1h-${x - start}z`);
      else x++;
    }
  });

  return runs.join('');
}

/**
 * QR code: draws `value` as a QR code in a `role="img"` SVG named by `label`, with a quiet zone of
 * four modules around it. A value too long for any QR code draws an empty (still named) image and
 * fires `focsd-error`.
 *
 * @fires {CustomEvent<QrCodeErrorDetail>} focsd-error - Fired when the value cannot be encoded. `detail.reason` is `too-long`. It bubbles, so a listener on an ancestor also hears the first error from markup.
 * @csspart svg - The SVG image.
 * @csspart surface - The background square, quiet zone included.
 * @csspart modules - The dark modules, drawn as one path.
 */
export class FocsdQrCodeBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: {},
    label: {},
    size: { type: Number },
    errorCorrection: { attribute: 'error-correction' },
  };

  /** @type {boolean[][]} */
  #matrix = [];

  #tooLong = false;

  constructor() {
    super();
    /** The text to encode. */
    this.value = '';
    /** The image's accessible name: say where the code leads. */
    this.label = '';
    /** The width and height in pixels. */
    this.size = DEFAULT_SIZE;
    /** @type {QrErrorCorrection} How much damage the code survives, from low to high. */
    this.errorCorrection = 'M';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    // A QR code without a name is an unnamed image: say so once per page.
    if (!this.label) warnOnce('qr-code:label', '<focsd-qr-code> needs a label that says what the code links to.', this);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (changed.has('value') || changed.has('errorCorrection')) this.#encode();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (!this.#tooLong || !(changed.has('value') || changed.has('errorCorrection'))) return;
    warnOnce('qr-code:too-long', 'The <focsd-qr-code> value is too long for a QR code, so no code is drawn.');
    /** @type {CustomEvent<QrCodeErrorDetail>} */
    const event = new CustomEvent('focsd-error', { bubbles: true, detail: { reason: 'too-long' } });

    this.dispatchEvent(event);
  }

  #encode() {
    const text = this.value == null ? '' : String(this.value);
    // An unknown level falls back to the default, so it never reads as a value too long.
    const level = LEVELS.has(this.errorCorrection) ? this.errorCorrection : 'M';

    this.#tooLong = false;
    this.#matrix = [];

    if (!text) return;

    try {
      this.#matrix = encodeQr(text, level);
    } catch (error) {
      // A RangeError means the value does not fit version 40 (the level is valid by now).
      if (!(error instanceof RangeError)) throw error;
      this.#tooLong = true;
    }
  }

  /** @override */
  render() {
    const box = this.#matrix.length + 2 * QUIET;
    const size = Number.isFinite(this.size) && this.size > 0 ? this.size : DEFAULT_SIZE;

    return html`<svg
      part="svg"
      role="img"
      aria-label=${this.label || nothing}
      viewBox="0 0 ${box} ${box}"
      width=${size}
      height=${size}
      shape-rendering="crispEdges"
    ><rect part="surface" width="100%" height="100%"></rect><path part="modules" d=${modulesPath(this.#matrix)}></path></svg>`;
  }
}
