import { css, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { watchTheme } from '../internal/theme-store.js';
import { addPoint, isBlank, paintStrokes, paintText, pngFile, startStroke, toSvg, undoStroke } from '../internal/strokes.js';

/** The drawn strokes: each a list of points in CSS pixels (internal/strokes.js `Strokes`). @typedef {readonly (readonly { x: number, y: number }[])[]} SignatureStrokes */

/** The ink of the saved image when no `pen-color` is set: readable on paper whatever the theme. */
const EXPORT_INK = '#000';

/** The saved image's pixels per CSS pixel, so it prints sharply on any screen. */
const EXPORT_SCALE = 2;

/** The pad's size before it is laid out (the canvas default). */
const FALLBACK = { width: 300, height: 150 };

const FORCED = '(forced-colors: active)';

/**
 * Signature pad: draw a signature with a mouse, finger or pen, or choose "Type instead" and type
 * a name, which is drawn in italic (WCAG 2.1.1 and 2.5.7: nothing needs a pointer). The drawing is
 * a canvas `role=img` named "{label}, signed" or "{label}, empty". Undo removes the last stroke and
 * Clear removes everything. Form: a PNG `File` (`signature.png`) under `name`, plus `{name}-typed`
 * = `true` when the name was typed; nothing while empty, and `required` then gives `valueMissing`.
 * The pad shows the theme's ink (CanvasText in forced colors); the saved image uses `pen-color`,
 * else black.
 *
 * @fires input - Fired at the end of each stroke and on each typed character.
 * @fires change - Fired when the pointer or focus leaves after drawing, when the typed name is committed, and after Clear, Undo or a mode switch.
 * @csspart group - The group around the pad and its buttons, named by the label.
 * @csspart label - The label element.
 * @csspart layout - The wrapper that places the label beside or above the body.
 * @csspart body - The pad, its buttons, the hint and message.
 * @csspart typed-field - The text field for the typed name (typed mode only).
 * @csspart surface - The box around the canvas and its baseline.
 * @csspart canvas - The drawing (`role=img`).
 * @csspart baseline - The line to sign on.
 * @csspart actions - The row of buttons.
 * @csspart mode - The "Type instead" / "Draw instead" button.
 * @csspart undo - The Undo button (drawing mode only).
 * @csspart clear - The Clear button.
 * @csspart status - The visually hidden region that announces "Signature added" or "Signature cleared".
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message (also `error`, `warning` or `success`).
 * @csspart message-icon - The message's icon.
 * @csspart announcer - The visually hidden region for messages.
 */
export class FocsdSignaturePadBase extends FormControlMixin(FocsdElement) {
  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      [part~='surface'] {
        position: relative;
      }
      [part~='canvas'] {
        display: block;
        inline-size: 100%;
        touch-action: none;
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    penColor: { attribute: 'pen-color' },
    penWidth: { type: Number, attribute: 'pen-width' },
    typed: { type: Boolean, reflect: true },
    typedName: { attribute: 'typed-name' },
    _strokes: { state: true },
    _touched: { state: true },
  };

  #labelId = uid('focsd-signature-label');

  /** The pointer drawing the current stroke, or -1. */
  #pointer = -1;
  /** A drawn change not yet followed by `change`. */
  #dirty = false;
  #size = FALLBACK;
  #fontSize = 0;
  /** What the form value was last made from, to make the PNG only when the signature changed. */
  #valueKey = '';
  /** The strokes the form value was last made from. */
  /** @type {SignatureStrokes | null} */
  #valueStrokes = null;
  /** The mode the author wrote (`typed` reflects, so the attribute cannot say), which Reset restores. */
  #defaultTyped = false;
  /** @type {ResizeObserver | undefined} */
  #observer;
  /** @type {(() => void) | undefined} */
  #unwatch;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The ink of the saved image, and of the pad outside forced colors; empty uses the theme's ink (`--focsd-ink`) on screen and black in the image. */
    this.penColor = '';
    /** The pen's width in CSS pixels. */
    this.penWidth = 2;
    /** Typed mode: the name typed in the text field is the signature. */
    this.typed = false;
    /** The typed name (typed mode). */
    this.typedName = '';
    /** @internal The drawn strokes. */
    this._strokes = /** @type {SignatureStrokes} */ ([]);
    /** @internal True once the person has changed the signature (the status then speaks). */
    this._touched = false;
  }

  /** True when there is no signature in the current mode. */
  get isEmpty() {
    return this.typed ? !this.typedName.trim() : isBlank(this._strokes);
  }

  /** @returns {HTMLCanvasElement | null} */
  get #canvas() {
    return this.renderRoot?.querySelector?.('canvas') ?? null;
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#defaultTyped ||= this.typed;
    const forced = matchMedia(FORCED);
    const stop = watchTheme(document.documentElement, this.#paint);
    forced.addEventListener('change', this.#paint);
    this.#unwatch = () => {
      stop();
      forced.removeEventListener('change', this.#paint);
    };

    this.#observer = new ResizeObserver(([entry]) => entry && this.#resize(entry.contentRect));
    this.updateComplete.then(() => this.#canvas && this.#observer?.observe(this.#canvas));
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#unwatch?.();
    this.#observer?.disconnect();
  }

  /** Remove the signature (the drawing and the typed name), from code: no events fire, as for native value writes. */
  clear() {
    this._strokes = [];
    this.typedName = '';
  }

  /** Remove the last stroke, from code (no events). */
  undo() {
    this._strokes = undoStroke(this._strokes);
  }

  /**
   * The signature as a PNG data URL, or an empty string when there is none.
   * @returns {string}
   */
  toDataURL() {
    return this.isEmpty ? '' : this.#exportCanvas().toDataURL('image/png');
  }

  /**
   * The signature as SVG (stroke paths, or the typed name as text), or an empty string when there is none.
   * @returns {string}
   */
  toSVG() {
    if (this.isEmpty) return '';
    const font = this.#canvas ? getComputedStyle(this.#canvas).fontFamily : '';

    return toSvg(this._strokes, {
      ...this.#size,
      color: this.penColor || EXPORT_INK,
      lineWidth: this.penWidth,
      text: this.typed ? this.typedName : '',
      font,
      fontSize: this.#fontSize || undefined,
    });
  }

  /** @override */
  updated() {
    this.#paint();
    this.#commit();
  }

  formResetCallback() {
    this._strokes = [];
    this.typedName = '';
    this.typed = this.#defaultTyped;
    this._touched = false;
  }

  /** @param {DOMRectReadOnly} rect */
  #resize({ width, height }) {
    const canvas = this.#canvas;

    if (!canvas || !width || !height) return;
    this.#size = { width, height };
    canvas.width = Math.round(width * devicePixelRatio);
    canvas.height = Math.round(height * devicePixelRatio);
    this.#paint();
  }

  /**
   * Draw the signature on `ctx`, scaled from CSS pixels.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} scale
   * @param {string} color
   * @param {string} font
   */
  #draw(ctx, scale, color, font) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, this.#size.width, this.#size.height);

    if (this.typed) this.#fontSize = paintText(ctx, this.typedName, { ...this.#size, color, font });
    else paintStrokes(ctx, this._strokes, { color, lineWidth: this.penWidth });
  }

  /** Repaint the pad in the current theme's ink (CanvasText in forced colors). */
  #paint = () => {
    const canvas = this.#canvas;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;
    const style = getComputedStyle(canvas);
    const ink = (!matchMedia(FORCED).matches && this.penColor) || style.color;
    this.#draw(ctx, canvas.width / this.#size.width || devicePixelRatio, ink, style.fontFamily);
  };

  /** A detached canvas with the signature in the saved ink, at EXPORT_SCALE. */
  #exportCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(this.#size.width * EXPORT_SCALE);
    canvas.height = Math.round(this.#size.height * EXPORT_SCALE);
    const ctx = canvas.getContext('2d');
    const font = this.#canvas ? getComputedStyle(this.#canvas).fontFamily : 'sans-serif';

    if (ctx) this.#draw(ctx, EXPORT_SCALE, this.penColor || EXPORT_INK, font);

    return canvas;
  }

  /**
   * Bring the form value and the validity up to date, now: after a stroke ends, a character is typed,
   * Clear or Undo, so a submit right after never sends an old or empty value. While a stroke is being
   * drawn nothing is made (a PNG per pointer move would be far too much work).
   */
  #commit() {
    if (this.#pointer !== -1) return;
    this.#syncValue();
    const anchor = this.renderRoot?.querySelector(this.typed ? '[part~="typed-field"]' : '[part~="mode"]');

    if (this.required && this.isEmpty) this.setValidityState({ valueMissing: true }, this.localize.term('signatureRequired'), anchor);
    else this.setValidityState({});
  }

  /** Send the PNG to the form when the signature, its mode or the name changed; nothing while empty or when no PNG can be made. */
  #syncValue() {
    const content = this.typed ? this.typedName : '';
    const key = `${this.name}\n${this.typed}\n${content}\n${this.penColor}\n${this.penWidth}`;

    if (key === this.#valueKey && (this.typed || this._strokes === this.#valueStrokes)) return;
    this.#valueKey = key;
    this.#valueStrokes = this._strokes;
    const file = this.isEmpty || !this.name ? null : pngFile(this.#exportCanvas());

    if (!file) {
      this.internals.setFormValue(null);

      return;
    }

    const data = new FormData();
    data.append(this.name, file);

    if (this.typed) data.append(`${this.name}-typed`, 'true');
    this.internals.setFormValue(data);
  }

  /** @param {PointerEvent} event */
  #at(event) {
    const box = /** @type {HTMLCanvasElement} */ (this.#canvas).getBoundingClientRect();

    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }

  #onDown = (/** @type {PointerEvent} */ event) => {
    if (this.isDisabled || this.typed || this.#pointer !== -1 || event.button !== 0) return;
    event.preventDefault();
    this.#pointer = event.pointerId;
    this.#canvas?.setPointerCapture?.(event.pointerId);
    this._strokes = startStroke(this._strokes, this.#at(event));
  };

  #onMove = (/** @type {PointerEvent} */ event) => {
    if (event.pointerId !== this.#pointer) return;
    const coalesced = event.getCoalescedEvents?.() ?? [];
    this._strokes = (coalesced.length ? coalesced : [event]).reduce((strokes, e) => addPoint(strokes, this.#at(e)), this._strokes);
  };

  #onUp = (/** @type {PointerEvent} */ event) => {
    if (event.pointerId !== this.#pointer) return;
    this.#pointer = -1;
    this.#dirty = true;
    this._touched = true;
    this.#commit();
    this.emitValue(false);
  };

  /** Fire `change` once after drawing, when the pointer or focus leaves. */
  #flush = () => {
    if (this.#pointer !== -1 || !this.#dirty) return;
    this.#dirty = false;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  };

  #onType = (/** @type {InputEvent} */ event) => {
    this.typedName = /** @type {HTMLInputElement} */ (event.target).value;
    this._touched = true;
    this.#dirty = true;
    this.#commit();
    this.emitValue(false);
  };

  /**
   * A button's edit: apply it, fire `input` and `change`, then move focus to `focusPart` once
   * rendered (to the mode button when that part is gone or disabled).
   * @param {() => void} edit
   * @param {string} focusPart
   */
  async #edit(edit, focusPart) {
    edit();
    this._touched = true;
    this.#dirty = false;
    this.#commit();
    this.emitValue();
    await this.updateComplete;
    const find = (/** @type {string} */ part) => this.renderRoot.querySelector(`[part~="${part}"]:not(:disabled)`);
    /** @type {HTMLElement | null} */ (find(focusPart) ?? find('mode'))?.focus();
  }

  #onMode = () =>
    this.#edit(
      () => {
        this.typed = !this.typed;
      },
      this.typed ? 'mode' : 'typed-field',
    );

  #status() {
    if (!this._touched) return '';

    return this.localize.term(this.isEmpty ? 'signatureCleared' : 'signatureAdded');
  }

  /** @override */
  render() {
    const term = this.localize.term.bind(this.localize);
    const off = this.isDisabled;
    const empty = this.isEmpty;
    const describedby = this.describedByIds().join(' ') || nothing;

    return renderFieldLayout(
      this,
      html`<span part="label" id=${this.#labelId}>${this.label}</span>`,
      html`<div part="group" role="group" aria-labelledby=${this.#labelId} aria-describedby=${describedby} @focusout=${this.#flush}>
        ${
          this.typed
            ? html`<input part="typed-field" type="text" autocomplete="name" aria-label=${term('signatureTypedLabel', this.label)} .value=${live(this.typedName)} ?disabled=${off} @input=${this.#onType} @change=${this.#flush} />`
            : nothing
        }
        <div part="surface">
          <canvas part="canvas" role="img" aria-label=${term(empty ? 'signatureEmpty' : 'signatureSigned', this.label)} @pointerdown=${this.#onDown} @pointermove=${this.#onMove} @pointerup=${this.#onUp} @pointercancel=${this.#onUp} @pointerleave=${this.#flush}></canvas>
          <div part="baseline" aria-hidden="true"></div>
        </div>
        <div part="actions">
          <button part="mode" type="button" ?disabled=${off} @click=${this.#onMode}>${term(this.typed ? 'signatureDrawInstead' : 'signatureTypeInstead')}</button>
          ${
            this.typed
              ? nothing
              : html`<button part="undo" type="button" ?disabled=${off || empty} @click=${() => this.#edit(() => this.undo(), 'undo')}>${term('undo')}</button>`
          }
          <button part="clear" type="button" ?disabled=${off || empty} @click=${() => this.#edit(() => this.clear(), this.typed ? 'typed-field' : 'mode')}>${term('clear')}</button>
        </div>
        <span part="status" role="status" class="focsd-visually-hidden">${this.#status()}</span>
      </div>`,
    );
  }
}
