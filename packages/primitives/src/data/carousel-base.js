import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';
import { FocsdCarouselSlideBase } from './carousel-slide-base.js';

/**
 * APG carousel with previous/next and optional autoplay (pauses on hover/focus; off under reduced motion).
 *
 * @slot - Default content.
 * @csspart carousel - The carousel element.
 * @csspart control - The control element.
 * @csspart controls - The row of carousel buttons.
 * @csspart next - The next slide button.
 * @csspart previous - The previous slide button.
 * @csspart rotation - The play or pause button (with `autoplay`).
 * @csspart slides - The container of the slides.
 */
export class FocsdCarouselBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    autoplay: { type: Number },
    index: { type: Number },
    _playing: { state: true },
    _hovered: { state: true },
    _focused: { state: true },
  };

  #timer = 0;

  constructor() {
    super();
    /** The accessible name of the carousel. */
    this.label = '';
    /** Advances every this many milliseconds; 0 turns autoplay off. It pauses on hover and focus and is off under reduced motion. */
    this.autoplay = 0;
    /** The index of the slide shown. */
    this.index = 0;
    this._playing = false;
    this._hovered = false;
    this._focused = false;
    this.addEventListener('pointerenter', () => {
      this._hovered = true;
    });
    this.addEventListener('pointerleave', () => {
      this._hovered = false;
    });
    this.addEventListener('focusin', () => {
      this._focused = true;
    });
    this.addEventListener('focusout', (event) => {
      if (!this.contains(/** @type {Node | null} */ (event.relatedTarget))) this._focused = false;
    });
  }

  /** Slides advance only while playing and neither hovered nor focused. */
  /** @returns {boolean} */
  get rotating() {
    return this._playing && this.autoplay > 0 && !this._hovered && !this._focused;
  }

  /**
   * The slides, in order.
   * @returns {FocsdCarouselSlideBase[]}
   */
  get slides() {
    return [...(this.children ?? [])].filter((c) => c instanceof FocsdCarouselSlideBase);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._playing = this.autoplay > 0 && !reduced;
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    clearInterval(this.#timer);
  }

  #schedule() {
    clearInterval(this.#timer);

    if (this.rotating) this.#timer = setInterval(() => this.go(this.index + 1), this.autoplay);
  }

  /**
   * Show slide `index` (wraps around).
   * @param {number} index
   */
  go(index) {
    const count = this.slides.length;

    if (!count) return;
    this.index = ((index % count) + count) % count;
  }

  #sync = () => {
    const slides = this.slides;

    // An index set before the slides arrived (or not a number) lands on a real slide.
    if (slides.length && !(Number.isInteger(this.index) && this.index >= 0 && this.index < slides.length)) {
      const index = Number.isFinite(this.index) ? ((Math.trunc(this.index) % slides.length) + slides.length) % slides.length : 0;

      if (index !== this.index) {
        this.index = index;

        return;
      }
    }

    slides.forEach((slide, i) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', this.localize.term('slide'));
      slide.setAttribute('aria-label', this.localize.term('slideOf', i + 1, slides.length));
      slide.hidden = i !== this.index;
      slide.inert = i !== this.index;
    });
  };

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // An index set from code wraps into range, like go().
    const count = this.slides.length;

    if (changed.has('index') && count && (this.index < 0 || this.index >= count || !Number.isInteger(this.index)))
      this.index = Number.isFinite(this.index) ? ((Math.trunc(this.index) % count) + count) % count : 0;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    this.#sync();
    const watched = /** @type {const} */ (['_playing', '_hovered', '_focused', 'autoplay']);

    if (watched.some((k) => changed.has(k))) this.#schedule();
  }

  /** @override */
  render() {
    /* eslint-disable lit-a11y/no-redundant-role -- explicit role keeps region semantics even when an author omits the label */
    return html`<section part="carousel" role="region" aria-roledescription=${this.localize.term('carousel')} aria-label=${this.label || nothing}>
      <div part="controls">
        ${
          this.autoplay > 0
            ? html`<button part="control rotation" type="button" @click=${() => {
                this._playing = !this._playing;
              }}>${this.localize.term(this._playing ? 'stopRotation' : 'startRotation')}</button>`
            : nothing
        }
        <button part="control previous" type="button" aria-label=${this.localize.term('previousSlide')} @click=${() => this.go(this.index - 1)}>${iconSvg('chevron-left')}</button>
        <button part="control next" type="button" aria-label=${this.localize.term('nextSlide')} @click=${() => this.go(this.index + 1)}>${iconSvg('chevron-right')}</button>
      </div>
      <div part="slides" aria-live=${this.rotating ? 'off' : 'polite'}><slot @slotchange=${this.#sync}></slot></div>
    </section>`;
  }
  /* eslint-enable lit-a11y/no-redundant-role */
}
