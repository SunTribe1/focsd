import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';
import { clamp } from '../internal/number.js';
import { cssomStyle } from '../internal/style.js';
import { warnOnce } from '../internal/warn.js';

/**
 * @typedef {{ position: number }} ImageComparePositionChangeDetail
 * @typedef {{ rtl: boolean, vertical: boolean }} CompareAxis
 * @typedef {{ left: number, top: number, width: number, height: number }} CompareRect
 */

/** Steps: an arrow moves 1, Shift+arrow and Page Up/Down move 10. */
const STEP = 1;
const BIG_STEP = 10;

/**
 * +1 for a key that shows more of the before image, -1 for one that shows less, 0 otherwise.
 * Up always adds, and so does Right when vertical (APG: Up and Right raise a slider's value, whatever
 * the slider's direction on screen; owner item 145). Horizontal: the before image starts at the
 * inline start, so Right adds in LTR and Left in RTL. Vertical: the before image is on top, so adding
 * moves the divider down.
 * @param {string} key
 * @param {CompareAxis} axis
 */
function arrowDirection(key, { rtl, vertical }) {
  if (vertical) return { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[key] ?? 0;
  const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
  const back = rtl ? 'ArrowRight' : 'ArrowLeft';

  return { [forward]: 1, ArrowUp: 1, [back]: -1, ArrowDown: -1 }[key] ?? 0;
}

/**
 * The position after a key press, or null for a key the slider does not use.
 * @param {number} position 0 to 100
 * @param {{ key: string, shiftKey: boolean }} event
 * @param {CompareAxis} axis
 * @returns {number | null}
 */
export function comparePositionForKey(position, { key, shiftKey }, axis) {
  /** @type {Record<string, number>} */
  const jumps = { Home: 0, End: 100, PageUp: position + BIG_STEP, PageDown: position - BIG_STEP };

  if (key in jumps) return clamp(/** @type {number} */ (jumps[key]), 0, 100);
  const direction = arrowDirection(key, axis);

  return direction ? clamp(position + direction * (shiftKey ? BIG_STEP : STEP), 0, 100) : null;
}

/**
 * The position under a pointer: the share of the figure on the before side of it, 0 to 100.
 * @param {CompareRect} rect
 * @param {number} x
 * @param {number} y
 * @param {CompareAxis} axis
 */
export function comparePositionAt(rect, x, y, { rtl, vertical }) {
  const size = vertical ? rect.height : rect.width;

  if (!(size > 0)) return 0;
  const offset = vertical ? y - rect.top : x - rect.left;
  const ratio = clamp(offset / size, 0, 1);

  return Math.round((rtl && !vertical ? 1 - ratio : ratio) * 100);
}

/**
 * Before/after image comparison: the before image is drawn over the after image and clipped at the
 * divider. The handle is a `role=slider` (0 to 100, "60% before image"); a pointer drag works
 * anywhere on the figure. The clip is a custom property written through the CSSOM (strict CSP).
 *
 * @fires {CustomEvent<ImageComparePositionChangeDetail>} focsd-position-change - Fired when the person commits a new position (each key press, the end of a drag).
 * @slot before - The before image (with `alt`), drawn on the inline-start (or top) side.
 * @slot after - The after image (with `alt`).
 * @csspart figure - The figure that holds both images.
 * @csspart before - The clipped wrapper of the before image.
 * @csspart after - The wrapper of the after image.
 * @csspart divider - The line between the images.
 * @csspart handle - The slider thumb on the divider.
 */
export class FocsdImageCompareBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    position: { type: Number },
    label: {},
    orientation: { reflect: true },
    _description: { state: true },
  };

  #descriptionId = uid('focsd-image-compare-description');

  /** @type {number | null} */
  #dragging = null;

  constructor() {
    super();
    /** How much of the before image shows, 0 to 100. */
    this.position = 50;
    /** The slider's accessible name (default "Compare images"). */
    this.label = '';
    /** @type {'horizontal' | 'vertical'} The divider's direction of travel. */
    this.orientation = 'horizontal';
    /** @internal The alts of both images, read into the slider's description. */
    this._description = '';
  }

  /** The position clamped to 0 to 100 (0 for a value that is not a number). */
  get #value() {
    return Number.isFinite(Number(this.position)) ? Math.round(clamp(Number(this.position), 0, 100)) : 0;
  }

  /** @returns {CompareAxis} */
  get #axis() {
    return { rtl: getComputedStyle(this).direction === 'rtl', vertical: this.orientation === 'vertical' };
  }

  /** @param {number} position */
  #commit(position) {
    if (position === this.#value && position === this.position) return;
    this.position = position;
    /** @type {ImageComparePositionChangeDetail} */
    const detail = { position };
    this.dispatchEvent(new CustomEvent('focsd-position-change', { detail, bubbles: true }));
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const next = comparePositionForKey(this.#value, event, this.#axis);

    if (next === null) return;
    event.preventDefault();
    this.#commit(next);
  };

  /** @param {PointerEvent} event */
  #positionAt(event) {
    const figure = /** @type {HTMLElement} */ (event.currentTarget);

    return comparePositionAt(figure.getBoundingClientRect(), event.clientX, event.clientY, this.#axis);
  }

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    if (event.button !== 0) return;
    const figure = /** @type {HTMLElement} */ (event.currentTarget);
    figure.setPointerCapture?.(event.pointerId);
    this.#dragging = this.#value;
    this.position = this.#positionAt(event);
    /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="handle"]'))?.focus({ preventScroll: true });
    event.preventDefault();
  };

  /** @param {PointerEvent} event */
  #onPointerMove = (event) => {
    if (this.#dragging !== null) this.position = this.#positionAt(event);
  };

  #onPointerUp = () => {
    if (this.#dragging === null) return;
    const start = this.#dragging;
    this.#dragging = null;
    const end = this.#value;
    // The drag already moved `position`; fire once for the whole gesture.
    this.position = start;
    this.#commit(end);
  };

  /** Read both alts into the slider's description; warn about an image without one. */
  #onSlotChange = () => {
    const images = ['before', 'after'].map((name) => this.querySelector(`[slot="${name}"]`));

    images.forEach((image) => {
      if (image && !image.hasAttribute('alt') && !image.querySelector('[alt]'))
        warnOnce(`image-compare:alt:${image.getAttribute('slot')}`, 'give each image in focsd-image-compare an alt.', image);
    });
    this._description = images
      .flatMap((image) => image?.getAttribute('alt') || image?.querySelector('[alt]')?.getAttribute('alt') || [])
      .join(', ');
  };

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    super.willUpdate(changed);

    // The images are light DOM: read their alts before the first render, so it renders once.
    if (!this.hasUpdated && this.isConnected) this.#onSlotChange();
  }

  /** @override */
  render() {
    const value = this.#value;
    const vertical = this.orientation === 'vertical';

    return html`<div
      part="figure"
      style=${cssomStyle({ '--_position': `${value}%` })}
      @pointerdown=${this.#onPointerDown}
      @pointermove=${this.#onPointerMove}
      @pointerup=${this.#onPointerUp}
      @pointercancel=${this.#onPointerUp}
    >
      <div part="after"><slot name="after" @slotchange=${this.#onSlotChange}></slot></div>
      <div part="before"><slot name="before" @slotchange=${this.#onSlotChange}></slot></div>
      <div part="divider">
        <div
          part="handle"
          role="slider"
          tabindex="0"
          aria-label=${this.label || this.localize.term('imageCompare')}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${value}
          aria-valuetext=${this.localize.term('comparePosition', value)}
          aria-orientation=${vertical ? 'vertical' : 'horizontal'}
          aria-describedby=${this.#descriptionId}
          @keydown=${this.#onKeyDown}
        ></div>
      </div>
      <span id=${this.#descriptionId} class="focsd-visually-hidden">${this._description}</span>
    </div>`;
  }
}
