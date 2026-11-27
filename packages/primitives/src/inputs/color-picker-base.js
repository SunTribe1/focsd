import { css, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { focusWithin } from '../internal/popup.js';
import { iconSvg } from '../internal/icons.js';
import { contrastRatio, formatColor, fromHsv, parseColor, toHsv } from '../internal/color.js';
import { clamp } from '../internal/number.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';

/** @typedef {import('../internal/color.js').Color} Color */
/** @typedef {import('../internal/color.js').Hsv} Hsv */
/** @typedef {'area' | 'h' | 'a'} DragTarget */
/** @typedef {{ commit?: boolean }} ApplyOptions */
/** @typedef {{ new (): { open(): Promise<{ sRGBHex: string }> } }} EyeDropperConstructor */

/** Every swatch can be chosen. */
const noneDisabled = () => false;

/** @type {Color} */
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

/**
 * Color picker: a saturation/brightness area, hue and opacity sliders, a text field that accepts
 * any CSS color, and optional swatches. Every part works by keyboard; dragging is never required
 * (WCAG 2.5.7). Opens from a swatch button unless `inline`.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value.
 * @csspart label - The label.
 * @csspart layout - The label and the body (see label position).
 * @csspart body - The control with its hint and message.
 * @csspart hint - The author hint.
 * @csspart message - The shown error, warning or success message.
 * @csspart message-icon - The icon of the message.
 * @csspart trigger - The button that opens the picker.
 * @csspart swatch - The color chip in the trigger.
 * @csspart panel - The popover (or inline container) holding the controls.
 * @csspart area - The saturation and brightness area.
 * @csspart area-thumb - The area's thumb.
 * @csspart hue - The hue slider.
 * @csspart alpha - The opacity slider.
 * @csspart thumb - A slider thumb.
 * @csspart field - The text field.
 * @csspart swatches - The swatch group.
 * @csspart swatch-option - One swatch.
 * @csspart eyedropper - The pick-from-screen button.
 * @csspart contrast - The contrast status.
 * @csspart announcer - The visually hidden status region that announces a new message.
 */
export class FocsdColorPickerBase extends FormControlMixin(FocsdElement) {
  static supportsReadOnly = true;

  /** The color spaces themselves: these gradients are what the controls mean, not theme styling. */
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      [part~='area'],
      [part~='hue'],
      [part~='alpha'] {
        position: relative;
        touch-action: none;
      }
      [part~='area'] {
        background:
          linear-gradient(to top, #000, transparent),
          linear-gradient(to right, #fff, var(--_color-pure-hue));
      }
      :host(:dir(rtl)) [part~='area'] {
        background:
          linear-gradient(to top, #000, transparent),
          linear-gradient(to left, #fff, var(--_color-pure-hue));
      }
      [part~='hue'] {
        background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
      }
      :host(:dir(rtl)) [part~='hue'] {
        background: linear-gradient(to left, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    format: { reflect: true },
    alpha: { type: Boolean, reflect: true },
    swatches: {},
    inline: { type: Boolean, reflect: true },
    contrastWith: { attribute: 'contrast-with' },
    _hsv: { state: true },
    _text: { state: true },
    _bad: { state: true },
    _open: { state: true },
  };

  #ids = { panel: uid('focsd-color-panel'), label: uid('focsd-color-label') };
  /** The color as last parsed or produced, so hex values survive without an HSV round trip. */
  #rgb = BLACK;
  /** The value this element produced itself (anything else came from outside and is parsed). */
  /** @type {string | null} */
  #own = null;
  /** @type {{ target: DragTarget, el: HTMLElement, moved: boolean } | null} */
  #drag = null;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The color, in `format`. */
    this.value = '#000000';
    /** @type {'hex' | 'rgb' | 'hsl' | 'oklch'} The color format of `value`. */
    this.format = 'hex';
    /** Adds the opacity slider; `value` then includes the alpha channel. */
    this.alpha = false;
    /** Comma-separated preset colors shown as swatches. */
    this.swatches = '';
    /** Shows the picker in place instead of in a popover opened by a swatch button. */
    this.inline = false;
    /** A color to report the contrast ratio against, such as the background the color will sit on. */
    this.contrastWith = '';
    /** @type {Hsv} */
    this._hsv = { h: 0, s: 0, v: 0, a: 1 };
    this._text = '';
    this._bad = false;
    this._open = false;
    // The single writer of the text field's aria-invalid for bad text. Added after the mixin's own
    // controller, so it runs last: bad text keeps aria-invalid even when the mixin drops the one it
    // wrote for a cleared `error`, and an author error keeps the one the mixin wrote.
    this.addController({
      hostUpdated: () => {
        const field = /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="field"]'));

        if (this._bad) field?.setAttribute('aria-invalid', 'true');
        else if (this.shownMessage?.kind !== 'error') field?.removeAttribute('aria-invalid');
      },
    });
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if ((changed.has('value') && this.value !== this.#own) || changed.has('format') || changed.has('alpha')) {
      const parsed = parseColor(this.value);

      if (parsed) {
        const hsv = toHsv(parsed);
        // A gray or black has no hue of its own: keep the one the person chose.
        const keepHue = hsv.s === 0 || hsv.v === 0;
        this.#rgb = parsed;
        this._hsv = keepHue ? { ...hsv, h: this._hsv.h } : hsv;
        this.#setOwn(formatColor(parsed, this.format, this.alpha));
        this._bad = false;
      } else if (!this.value) {
        this.#own = '';
      }

      this._text = this.value;
    }
  }

  /** @param {string} value */
  #setOwn(value) {
    this.#own = value;
    this.value = value;
  }

  get #editable() {
    return !this.isDisabled && !this.readOnlyActive;
  }

  /** Set the color from the user, by HSV (sliders) or by a parsed color (text, swatch, eyedropper). */
  /**
   * @param {{ hsv?: Hsv, rgb?: Color }} source
   * @param {ApplyOptions} [options]
   */
  #apply({ hsv, rgb }, { commit = true } = {}) {
    if (!this.#editable) return;

    if (hsv) {
      this._hsv = hsv;
      this.#rgb = fromHsv(hsv);
    } else {
      // No hsv: the caller passed a color.
      const color = /** @type {Color} */ (rgb);
      const next = toHsv(color);
      this._hsv = next.s === 0 || next.v === 0 ? { ...next, h: this._hsv.h } : next;
      this.#rgb = color;
    }

    const value = formatColor(this.#rgb, this.format, this.alpha);
    this._bad = false;
    this._text = value;

    if (value === this.value) return;
    this.#setOwn(value);
    this.emitValue(commit);
  }

  /**
   * @param {Partial<Hsv>} changes
   * @param {ApplyOptions} [options]
   */
  #nudge(changes, options) {
    const { h, s, v, a } = { ...this._hsv, ...changes };
    this.#apply({ hsv: { h: clamp(h, 0, 360), s: clamp(s, 0, 100), v: clamp(v, 0, 100), a: clamp(a, 0, 1) } }, options);
  }

  get #rtl() {
    return getComputedStyle(this).direction === 'rtl';
  }

  /** @param {KeyboardEvent} event */
  #onAreaKey(event) {
    const step = event.shiftKey ? 10 : 1;
    const side = this.#rtl ? -step : step;
    const { s, v } = this._hsv;

    /** @type {Record<string, Partial<Hsv>>} */
    const moves = {
      ArrowRight: { s: s + side },
      ArrowLeft: { s: s - side },
      ArrowUp: { v: v + step },
      ArrowDown: { v: v - step },
      PageUp: { v: v + 10 },
      PageDown: { v: v - 10 },
      Home: { s: 0 },
      End: { s: 100 },
    };

    if (!(event.key in moves)) return;
    event.preventDefault();
    this.#nudge(/** @type {Partial<Hsv>} */ (moves[event.key]));
  }

  /**
   * Keyboard for a one-dimensional slider over `key` (h: 0–360, a: 0–1).
   * @param {'h' | 'a'} key
   * @param {KeyboardEvent} event
   */
  #onSliderKey(key, event) {
    const hue = key === 'h';
    const max = hue ? 360 : 1;
    const unit = hue ? (event.shiftKey ? 15 : 1) : event.shiftKey ? 0.1 : 0.01;
    const big = hue ? 30 : 0.1;
    const side = this.#rtl ? -unit : unit;
    const now = this._hsv[key];

    /** @type {Record<string, number>} */
    const moves = {
      ArrowRight: now + side,
      ArrowLeft: now - side,
      ArrowUp: now + unit,
      ArrowDown: now - unit,
      PageUp: now + big,
      PageDown: now - big,
      Home: 0,
      End: max,
    };

    if (!(event.key in moves)) return;
    event.preventDefault();
    const move = /** @type {number} */ (moves[event.key]);

    this.#nudge({ [key]: hue ? move : Math.round(move * 100) / 100 });
  }

  /**
   * @param {PointerEvent} event
   * @param {HTMLElement} el
   */
  #ratio(event, el) {
    const rect = el.getBoundingClientRect();
    let x = clamp((event.clientX - rect.left) / rect.width, 0, 1);

    if (this.#rtl) x = 1 - x;

    return { x, y: clamp((event.clientY - rect.top) / rect.height, 0, 1) };
  }

  /**
   * @param {DragTarget} target
   * @param {PointerEvent} event
   */
  #onPointerDown(target, event) {
    if (!this.#editable || event.button !== 0) return;
    const el = /** @type {HTMLElement} */ (event.currentTarget);
    el.setPointerCapture?.(event.pointerId);
    el.focus();
    this.#drag = { target, el, moved: false };
    this.#dragTo(event, false);
  }

  /**
   * @param {PointerEvent} event
   * @param {boolean} commit
   */
  #dragTo(event, commit) {
    const { target, el } = /** @type {{ target: DragTarget, el: HTMLElement }} */ (this.#drag);
    const { x, y } = this.#ratio(event, el);

    if (target === 'area') this.#nudge({ s: Math.round(x * 100), v: Math.round((1 - y) * 100) }, { commit });
    else if (target === 'h') this.#nudge({ h: Math.round(x * 360) }, { commit });
    else this.#nudge({ a: Math.round(x * 100) / 100 }, { commit });
  }

  /** @param {PointerEvent} event */
  #onPointerMove(event) {
    if (!this.#drag) return;
    this.#drag.moved = true;
    this.#dragTo(event, false);
  }

  /** @param {PointerEvent} event */
  #onPointerUp(event) {
    if (!this.#drag) return;
    this.#dragTo(event, false);
    this.#drag = null;
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #commitText() {
    const text = this._text.trim();

    if (!text) {
      this._bad = false;

      if (this.value === '') return;
      this.#setOwn('');
      this.emitValue();

      return;
    }

    const parsed = parseColor(text);

    if (!parsed) {
      this._bad = true;

      return;
    }

    this.#apply({ rgb: this.alpha ? parsed : { ...parsed, a: 1 } });
    this._text = this.value;
  }

  /**
   * The swatches, from `swatches` or the slotted swatch elements.
   * @returns {{ value: string, label: string }[]}
   */
  get swatchList() {
    const fromAttr = String(this.swatches ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((value) => ({ value, label: value }));

    const slotted = [...(this.querySelectorAll?.(':scope > focsd-swatch') ?? [])].map((el) => ({
      value: el.getAttribute('value') ?? '',
      label: el.getAttribute('label') || el.textContent.trim() || (el.getAttribute('value') ?? ''),
    }));

    return [...fromAttr, ...slotted].filter((s) => parseColor(s.value));
  }

  /** @param {string} value */
  #chooseSwatch(value) {
    const parsed = parseColor(value);

    if (parsed) this.#apply({ rgb: parsed });
  }

  /**
   * @param {number} index
   * @param {KeyboardEvent} event
   */
  #onSwatchKey(index, event) {
    const list = this.swatchList;
    const back = this.#rtl ? 'ArrowRight' : 'ArrowLeft';
    const forward = this.#rtl ? 'ArrowLeft' : 'ArrowRight';
    let next = index;

    if (event.key === forward || event.key === 'ArrowDown') next = nextIndex(index, 1, list.length, noneDisabled);
    else if (event.key === back || event.key === 'ArrowUp') next = nextIndex(index, -1, list.length, noneDisabled);
    else if (event.key === 'Home') next = edgeIndex('first', list.length, noneDisabled);
    else if (event.key === 'End') next = edgeIndex('last', list.length, noneDisabled);
    else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.#chooseSwatch(/** @type {{ value: string }} */ (list[index]).value);

      return;
    } else return;
    event.preventDefault();
    this.#swatchFocus = next;
    this.requestUpdate();
    this.updateComplete.then(() => /** @type {HTMLElement} */ (this.renderRoot.querySelectorAll('[part~="swatch-option"]')[next])?.focus());
  }

  #swatchFocus = -1;

  async #pickFromScreen() {
    try {
      // EyeDropper is not in TypeScript's DOM types yet.
      const scope = /** @type {{ EyeDropper: EyeDropperConstructor }} */ (/** @type {unknown} */ (globalThis));
      const { sRGBHex } = await new scope.EyeDropper().open();
      this.#chooseSwatch(sRGBHex);
    } catch {
      /* the person canceled */
    }
  }

  /** @returns {HTMLElement | null} */
  get #panel() {
    return this.renderRoot.querySelector('[part~="panel"]');
  }

  /** @returns {HTMLButtonElement | null} */
  get #trigger() {
    return this.renderRoot.querySelector('[part~="trigger"]');
  }

  /** Open the picker and focus the color area (not with `inline`). */
  show() {
    if (this.inline || this.isDisabled) return;
    const panel = /** @type {HTMLElement} */ (this.#panel);

    if (!panel.matches(':popover-open')) panel.showPopover();
    /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="area"]'))?.focus();
  }

  /** Close the picker. */
  hide() {
    const panel = this.#panel;

    if (panel?.matches(':popover-open')) /** @type {HTMLElement} */ (panel).hidePopover();
  }

  #onBeforeToggle = (/** @type {ToggleEvent} */ event) => {
    if (event.newState === 'closed' && focusWithin(this)) /** @type {HTMLElement} */ (this.#trigger)?.focus();
  };

  #onToggle = (/** @type {ToggleEvent} */ event) => {
    this._open = event.newState === 'open';
  };

  /** Open state when the press began: light dismiss closes the popover before the click arrives. */
  #wasOpen = false;

  #onTriggerClick = () => {
    const open = this.#wasOpen || /** @type {HTMLElement} */ (this.#panel).matches(':popover-open');
    this.#wasOpen = false;

    if (open) this.hide();
    else this.show();
  };

  /** @override */
  updated() {
    const { h, s, v, a } = this._hsv;
    const picker = this.renderRoot.querySelector('[part~="controls"]');

    if (picker) {
      /** @type {HTMLElement} */ (picker).style.setProperty('--_color-pure-hue', `hsl(${h} 100% 50%)`);
      /** @type {HTMLElement} */ (picker).style.setProperty('--_color-s', `${s}%`);
      /** @type {HTMLElement} */ (picker).style.setProperty('--_color-v', `${100 - v}%`);
      /** @type {HTMLElement} */ (picker).style.setProperty('--_color-a', `${a * 100}%`);
      /** @type {HTMLElement} */ (picker).style.setProperty('--_color-h-pos', `${(h / 360) * 100}%`);
      /** @type {HTMLElement} */ (picker).style.setProperty('--_color-current', formatColor(this.#rgb, 'rgb', true));
      /** @type {HTMLElement} */ (picker).style.setProperty('--_color-opaque', formatColor({ ...this.#rgb, a: 1 }, 'hex'));
    }

    /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="swatch"]'))?.style.setProperty(
      '--_color-current',
      formatColor(this.#rgb, 'rgb', true),
    );
    this.renderRoot.querySelectorAll('[part~="swatch-option"]').forEach((node) => {
      const el = /** @type {HTMLElement} */ (node);
      el.style.setProperty('--_color-swatch', /** @type {string} */ (el.dataset.color));
    });
    this.internals.setFormValue(this.value || null);
    const field = this.renderRoot.querySelector('[part~="field"]');

    if (this._bad) this.setValidityState({ badInput: true }, this.localize.term('enterColor'), field);
    else if (this.required && !this.value) this.setValidityState({ valueMissing: true }, this.localize.term('enterColor'), field);
    else this.setValidityState({});
  }

  formResetCallback() {
    this._bad = false;
    this.value = this.defaultValue || '#000000';
    // The value may be unchanged (only the text was edited): show it again either way.
    this._text = this.value;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    const text = restoredText(state);

    if (text !== null) this.value = text;
  }

  /**
   * @param {'h' | 'a'} key
   * @param {string} label
   * @param {number} now
   * @param {number} min
   * @param {number} max
   * @param {string} text
   */
  #slider(key, label, now, min, max, text) {
    return html`<div
      part=${key === 'h' ? 'hue' : 'alpha'}
      role="slider"
      tabindex=${this.isDisabled ? -1 : 0}
      aria-label=${label}
      aria-valuemin=${min}
      aria-valuemax=${max}
      aria-valuenow=${now}
      aria-valuetext=${text}
      aria-disabled=${this.isDisabled ? 'true' : nothing}
      @keydown=${(/** @type {KeyboardEvent} */ e) => this.#editable && this.#onSliderKey(key, e)}
      @pointerdown=${(/** @type {PointerEvent} */ e) => this.#onPointerDown(key, e)}
      @pointermove=${this.#onPointerMove}
      @pointerup=${this.#onPointerUp}
      @pointercancel=${this.#onPointerUp}
    >
      <span part="thumb"></span>
    </div>`;
  }

  /** @param {string | typeof nothing} [describedBy] The ids that describe the text field (inline only). */
  #controls(describedBy = nothing) {
    const { h, s, v, a } = this._hsv;
    const t = (/** @type {string} */ k, /** @type {unknown[]} */ ...args) => this.localize.term(k, ...args);
    const swatches = this.swatchList;
    const current = formatColor(this.#rgb, 'hex');
    const checkedIndex = swatches.findIndex((sw) => formatColor(/** @type {Color} */ (parseColor(sw.value)), 'hex') === current);
    const focusIndex = this.#swatchFocus >= 0 ? this.#swatchFocus : Math.max(0, checkedIndex);
    const other = parseColor(this.contrastWith);

    return html`<div part="controls">
      <div
        part="area"
        role="slider"
        tabindex=${this.isDisabled ? -1 : 0}
        aria-label=${t('saturationBrightness')}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow=${Math.round(s)}
        aria-valuetext=${t('saturationBrightnessValue', Math.round(s), Math.round(v))}
        aria-disabled=${this.isDisabled ? 'true' : nothing}
        @keydown=${(/** @type {KeyboardEvent} */ e) => this.#editable && this.#onAreaKey(e)}
        @pointerdown=${(/** @type {PointerEvent} */ e) => this.#onPointerDown('area', e)}
        @pointermove=${this.#onPointerMove}
        @pointerup=${this.#onPointerUp}
        @pointercancel=${this.#onPointerUp}
      >
        <span part="area-thumb"></span>
      </div>
      ${this.#slider('h', t('hue'), Math.round(h), 0, 360, `${Math.round(h)}°`)}
      ${this.alpha ? this.#slider('a', t('opacity'), Math.round(a * 100), 0, 100, `${Math.round(a * 100)}%`) : nothing}
      <div part="field-row">
        <input
          part="field"
          aria-label=${this.label}
          autocomplete="off"
          spellcheck="false"
          .value=${live(this._text)}
          ?disabled=${this.isDisabled}
          ?readonly=${this.readOnlyActive}
          aria-describedby=${describedBy}
          @input=${(/** @type {Event} */ e) => (this._text = /** @type {HTMLInputElement} */ (e.target).value)}
          @change=${() => this.#commitText()}
          @keydown=${(/** @type {KeyboardEvent} */ e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              this.#commitText();
            }
          }}
        />
        ${
          'EyeDropper' in globalThis
            ? html`<button part="eyedropper" type="button" aria-label=${t('pickFromScreen')} ?disabled=${!this.#editable} @click=${this.#pickFromScreen}>
              ${iconSvg('pipette')}
            </button>`
            : nothing
        }
      </div>
      ${
        swatches.length
          ? html`<div part="swatches" role="radiogroup" aria-label=${t('swatches')}>
            ${swatches.map(
              (sw, i) =>
                html`<button
                  part="swatch-option"
                  type="button"
                  role="radio"
                  data-color=${sw.value}
                  aria-label=${sw.label}
                  aria-checked=${i === checkedIndex ? 'true' : 'false'}
                  tabindex=${i === focusIndex ? 0 : -1}
                  ?disabled=${!this.#editable}
                  @click=${() => this.#chooseSwatch(sw.value)}
                  @keydown=${(/** @type {KeyboardEvent} */ e) => this.#onSwatchKey(i, e)}
                  @focus=${() => (this.#swatchFocus = i)}
                ></button>`,
            )}
          </div>`
          : nothing
      }
      ${other ? html`<p part="contrast" role="status">${t('contrastWith', contrastRatio(/** @type {Color} */ ({ ...this.#rgb, a: 1 }), other), this.contrastWith)}</p>` : nothing}
    </div>`;
  }

  /**
   * The popover trigger, or the text field when `inline`.
   * @returns {HTMLElement | undefined}
   */
  get ariaTarget() {
    const part = this.inline ? 'field' : 'trigger';

    return /** @type {HTMLElement | undefined} */ (this.renderRoot?.querySelector?.(`[part~="${part}"]`) ?? undefined);
  }

  /** @override */
  render() {
    const describedBy = this.describedByIds().join(' ') || nothing;
    const label = html`<span part="label" id=${this.#ids.label}>${this.label}</span>`;

    if (this.inline) {
      const panel = html`<div part="panel" role="group" aria-labelledby=${this.#ids.label}>${this.#controls(describedBy)}</div>`;

      return renderFieldLayout(this, label, panel);
    }

    const body = html`<button
        part="trigger"
        type="button"
        aria-label=${`${this.label}: ${this.value}`}
        aria-describedby=${describedBy}
        aria-haspopup="dialog"
        aria-expanded=${this._open ? 'true' : 'false'}
        aria-controls=${this.#ids.panel}
        ?disabled=${this.isDisabled}
        @pointerdown=${() => (this.#wasOpen = /** @type {HTMLElement} */ (this.#panel).matches(':popover-open'))}
        @click=${this.#onTriggerClick}
      >
        <span part="swatch"></span><span part="value" aria-hidden="true">${this.value}</span>
      </button>
      <div
        part="panel"
        id=${this.#ids.panel}
        role="dialog"
        aria-label=${this.label}
        popover="auto"
        @beforetoggle=${this.#onBeforeToggle}
        @toggle=${this.#onToggle}
      >
        ${this.#controls()}
      </div>`;

    return renderFieldLayout(this, label, body);
  }
}
