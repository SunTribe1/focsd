import { html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdTextFieldBase } from '../text-field/text-field-base.js';
import { uid } from '../internal/id.js';
import { announce } from '../internal/announce.js';

/** How long typing must pause (ms) before the character count is announced. */
const COUNT_ANNOUNCE_DELAY = 750;

/**
 * Multiline text field. Enter inserts a newline; `maxlength` adds a polite character counter.
 *
 * @csspart control - The control element.
 * @csspart counter - The character count (with `maxlength`).
 * @csspart counter-live - Deprecated alias kept for existing selectors: a visually hidden copy of the last announced count, hidden from screen readers (the count is heard through the shared announcer).
 * @attr autosize - Grow with the text, from `rows` up to `max-rows`, where CSS `field-sizing` is supported.
 * @attr max-rows - The tallest `autosize` grows, in lines (unlimited when unset).
 */
export class FocsdTextareaBase extends FocsdTextFieldBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    rows: { type: Number },
    autosize: { type: Boolean, reflect: true },
    maxRows: { type: Number, attribute: 'max-rows' },
    maxlength: { type: Number },
    cols: { type: Number },
    wrap: {},
    _announcedCount: { state: true },
  };

  /** @override @type {Record<string, (el: FocsdTextFieldBase) => unknown>} */
  static forwardedAttributes = {
    ...FocsdTextFieldBase.forwardedAttributes,
    cols: (el) => /** @type {FocsdTextareaBase} */ (el).cols,
    wrap: (el) => /** @type {FocsdTextareaBase} */ (el).wrap,
  };

  /** Length of the current value, as on native textareas. */
  get textLength() {
    return (this.value ?? '').length;
  }

  #counterId = uid('focsd-textarea-counter');

  constructor() {
    super();
    /** @type {number | undefined} The width in characters, as on `<textarea cols>`. */
    this.cols = undefined;
    /** @type {string | undefined} How lines wrap when submitted, as on `<textarea wrap>`. */
    this.wrap = undefined;
    /** The height in lines; with `autosize`, the fewest lines. */
    this.rows = 3;
    /** Grow with the text, from `rows` up to `max-rows` (where CSS `field-sizing` is supported). */
    this.autosize = false;
    /** @type {number | undefined} The tallest `autosize` grows, in lines; unlimited when unset. */
    this.maxRows = undefined;
    /** @type {number | undefined} */
    this.maxlength = undefined;
    /** The last announced count, mirrored in the deprecated `counter-live` part. */
    this._announcedCount = '';
    // A controller runs after every update even though the text field base overrides updated().
    this.addController({
      hostUpdated: () => {
        this.#scheduleAnnouncement();
        this.#applySizing();
      },
    });
    // Only typing announces the count: a prefilled, reset or scripted value stays quiet.
    this.addEventListener('input', () => {
      this.#typed = true;
    });
  }

  #typed = false;

  #announceTimer = 0;
  #lastLength = 0;

  /** Announce the count once typing has paused, not on every key. */
  #scheduleAnnouncement() {
    const length = (this.value ?? '').length;

    if (!this.maxlength || length === this.#lastLength) return;
    this.#lastLength = length;

    if (!this.#typed) return;
    this.#typed = false;
    clearTimeout(this.#announceTimer);
    this.#announceTimer = setTimeout(() => {
      const count = this.localize.term('characterCount', length, this.maxlength);

      // The shared announcer (one live region per document; inside an open modal when this is).
      this._announcedCount = count;
      announce(count, { from: this });
    }, COUNT_ANNOUNCE_DELAY);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#announceTimer);
  }

  /**
   * Line counts for `autosize`, set through the CSSOM (allowed under a strict style CSP). Without
   * `max-rows` the variable stays unset, so the height is unlimited.
   */
  #applySizing() {
    const control = /** @type {HTMLTextAreaElement | null} */ (this.renderRoot.querySelector('textarea'));

    if (!control) return;

    const { style } = control;

    style.setProperty('--_rows', this.autosize ? String(this.rows) : null);
    style.setProperty('--_max-rows', this.autosize && this.maxRows ? String(this.maxRows) : null);
  }

  /** @override @param {import('../text-field/text-field-base.js').ControlContext} ctx */
  renderControl(ctx) {
    return html`<textarea
      part="control"
      id=${ctx.id}
      rows=${this.rows}
      maxlength=${this.maxlength ?? nothing}
      .value=${live(this.value)}
      ?required=${this.required}
      ?disabled=${this.isDisabled}
      placeholder=${this.placeholder || nothing}
      aria-describedby=${ctx.describedBy || nothing}
      @input=${ctx.onInput}
      @change=${ctx.onChange}
    ></textarea>`;
  }

  /** @override @returns {string[]} */
  extraDescribedBy() {
    return this.maxlength ? [this.#counterId] : [];
  }

  /** @override */
  renderExtra() {
    if (!this.maxlength) return nothing;

    // The visible count updates on every key; screen readers hear it once typing pauses.
    // counter-live is a deprecated alias (ruling L58): not a live region, so the count is heard once.
    return html`<p part="counter" id=${this.#counterId}>${this.localize.term('characterCount', this.value.length, this.maxlength)}</p>
      <span part="counter-live" class="focsd-visually-hidden" aria-hidden="true">${this._announcedCount}</span>`;
  }
}
