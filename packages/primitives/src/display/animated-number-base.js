import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { formatIntl, frameValue, intlOptions, parseDuration, prefersReducedMotion } from '../internal/count-up.js';
import { finiteOrUndefined } from '../internal/number.js';
import { warnOnce } from '../internal/warn.js';

/** The count's length when `--focsd-duration-slow` cannot be read (the token's own value). */
const FALLBACK_MS = 240;

/**
 * Animated number: counts the shown text from the previous value (or `from`) to `value` over
 * `--focsd-duration-slow`, formatted with `format` for the nearest `lang`. Only the text changes;
 * nothing moves. Under `prefers-reduced-motion: reduce` it shows the final value at once.
 *
 * Screen readers only ever get the final value: the counting text is hidden from them, and a
 * visually hidden copy holds the final formatted value from the first frame. It is not a live
 * region; put it in one (or announce the change) if a change must be spoken.
 *
 * @csspart number - The counting text (hidden from assistive technology).
 */
export class FocsdAnimatedNumberBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: { type: Number },
    format: { converter: intlOptions },
    from: { type: Number },
    duration: { type: Number },
    _shown: { state: true },
  };

  /** The value the next count starts from when `from` is not set. @type {number | undefined} */
  #previous = undefined;

  #frame = 0;

  constructor() {
    super();
    /** The number to show. */
    this.value = 0;
    /** @type {Intl.NumberFormatOptions | undefined} `Intl.NumberFormat` options; as an attribute, a short form (`format="currency USD"`, `format="percent 1"`, `format="compact"`) or JSON. */
    this.format = undefined;
    /** @type {number | undefined} Where every count starts; by default the previous value (so the first value shows at once). */
    this.from = undefined;
    /** @type {number | undefined} The count's length in milliseconds; by default `--focsd-duration-slow`. */
    this.duration = undefined;
    /** @internal The number on screen while counting. @type {number} */
    this._shown = 0;
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#stop();
    this._shown = this.#target;
  }

  /** The value as a finite number (0 when it is not one). */
  get #target() {
    return finiteOrUndefined(this.value) ?? 0;
  }

  #stop() {
    if (this.#frame) globalThis.cancelAnimationFrame?.(this.#frame);
    this.#frame = 0;
  }

  /** The count's length: `duration`, else the `--focsd-duration-slow` token (0 ms under reduced motion in tokens.css). */
  #durationMs() {
    const own = finiteOrUndefined(this.duration);

    if (own !== undefined) return Math.max(0, own);

    return parseDuration(getComputedStyle(this).getPropertyValue('--focsd-duration-slow'), FALLBACK_MS);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (!changed.has('value') && !changed.has('from')) return;
    const end = this.#target;

    if (finiteOrUndefined(this.value) === undefined)
      warnOnce('animated-number:value', 'focsd-animated-number value is not a number; showing 0.');
    // A count in progress hands over from the number on screen, so the text never jumps back.
    const start = finiteOrUndefined(this.from) ?? (this.#frame ? this._shown : this.#previous);

    this.#previous = end;
    this.#stop();

    const still = start === undefined || start === end || !this.isConnected || !globalThis.requestAnimationFrame || prefersReducedMotion();
    const ms = still ? 0 : this.#durationMs();

    if (still || ms <= 0) {
      this._shown = end;

      return;
    }

    this._shown = /** @type {number} */ (start);
    this.#count(/** @type {number} */ (start), end, ms);
  }

  /**
   * Counts the shown number from `start` to `end` over `ms`, one frame at a time.
   * @param {number} start
   * @param {number} end
   * @param {number} ms
   */
  #count(start, end, ms) {
    const began = performance.now();
    /** @param {number} now */

    const step = (now) => {
      const progress = (now - began) / ms;

      this._shown = frameValue(start, end, progress);
      this.#frame = progress < 1 ? requestAnimationFrame(step) : 0;
    };

    this.#frame = requestAnimationFrame(step);
  }

  /** @param {number} n */
  #text(n) {
    return formatIntl(n, this.format, this.localize.locale());
  }

  /** @override */
  render() {
    return html`<span part="number" aria-hidden="true">${this.#text(this._shown)}</span><span class="focsd-visually-hidden"
        >${this.#text(this.#target)}</span
      >`;
  }
}
