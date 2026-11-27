import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { deepActiveElement, restoreFocusAfterClose } from '../internal/focus.js';
import { trackModal } from '../internal/open-modals.js';
import { iconSvg } from '../internal/icons.js';
import { uid } from '../internal/id.js';
import { clamp } from '../internal/number.js';

/** Downward speed (px per ms) that counts as a flick to dismiss. */
const FLICK = 0.8;

/** Viewport height (px) assumed where there is no window, as in server rendering. */
const FALLBACK_VIEWPORT_HEIGHT = 800;

/** The tallest snap point, as a share of the viewport. */
const MAX_HEIGHT_RATIO = 0.9;

/** The shortest snap point (px), so the grip stays reachable. */
const MIN_SNAP_HEIGHT = 48;

/** Movement (px) before a press becomes a drag. */
const DRAG_SLOP = 3;

/** Pointer samples (ms) used to measure the release velocity. */
const VELOCITY_WINDOW_MS = 100;

/** Released below this share of the smallest snap point, a sheet that is not persistent closes. */
const DISMISS_RATIO = 0.75;

/** @typedef {{ y: number, t: number }} Sample */
/** @typedef {{ y: number, start: number, fromBody: boolean, samples: Sample[], moved: boolean }} DragState */

/**
 * `detail` of `focsd-snap-change`: the index of the snap point the sheet now rests at.
 * @typedef {{ index: number }} SnapChangeDetail
 */

/**
 * Bottom sheet: a panel at the bottom edge that rests at snap points (`snap-points="40%,90%"`).
 * Modal by default (a native dialog: focus trap, inert page, Escape, focus returns to the opener);
 * with `non-modal` it is a named region and the page stays usable (Escape inside it closes it).
 * The handle is a slider: Up/Down, Enter and Space change the height, and a Close button closes it,
 * so dragging is never required (WCAG 2.5.7). Dragging follows the finger and snaps; a downward
 * flick dismisses. Setting `snap` moves the sheet. With `persistent` only the Close button,
 * `data-dialog-close` and `close()` close it: no Escape, backdrop click or flick.
 * A non-modal sheet sits on the dialog layer (`--focsd-layer-dialog`): above sticky headers and
 * in-flow panels, but below anything in the browser's top layer, such as open popovers, menus and
 * tooltips, which always stack above it.
 *
 * @fires {CustomEvent<SnapChangeDetail>} focsd-snap-change - Fired when the person moves the sheet to another snap point; `detail.index`.
 * @fires close - Fired when the sheet closes.
 * @slot - The sheet content.
 * @csspart dialog - The dialog (modal) or region (non-modal).
 * @csspart panel - The sheet itself.
 * @csspart header - The header with the handle, title and close button.
 * @csspart handle - The resize handle.
 * @csspart grip - The handle's visible bar.
 * @csspart headline - The title.
 * @csspart close - The close button.
 * @csspart body - The scrolling content area.
 */
export class FocsdBottomSheetBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    open: { type: Boolean, reflect: true },
    snapPoints: { attribute: 'snap-points' },
    snap: { type: Number, reflect: true },
    nonModal: { type: Boolean, attribute: 'non-modal' },
    persistent: { type: Boolean },
    _offset: { state: true },
    _dragging: { state: true },
  };

  #ids = { headline: uid('focsd-sheet-title') };
  /** @type {HTMLElement | null} */
  #opener = null;
  #returnValue = '';
  /** @type {number[]} */
  #heights = [];
  /** @type {DragState | null} */
  #drag = null;

  constructor() {
    super();
    /** The accessible name of the sheet. */
    this.label = '';
    /** Whether the sheet is open. */
    this.open = false;
    /**
     * @type {'auto' | (string & {})}
     * Comma-separated heights the sheet rests at: `auto` (fits the content), a percentage of the viewport or pixels, such as `40%, 90%`.
     */
    this.snapPoints = 'auto';
    /** The index of the snap point the sheet rests at, smallest first. */
    this.snap = 0;
    /** Makes the sheet non-modal: a named region, with the page behind it still usable and no backdrop. */
    this.nonModal = false;
    /** Stops Escape, a backdrop click and a downward drag or flick from closing the sheet. */
    this.persistent = false;
    this._offset = 0;
    this._dragging = false;
    this.addEventListener('click', this.#onClick);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    globalThis.addEventListener?.('resize', this.#layout);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    trackModal(this, false);
    globalThis.removeEventListener?.('resize', this.#layout);
  }

  /**
   * The value passed to the last `close()`, as on `<dialog>`.
   * @returns {string}
   */
  get returnValue() {
    return this.#returnValue;
  }

  get #dialog() {
    return this.renderRoot.querySelector('[part~="dialog"]');
  }

  get #panel() {
    return this.renderRoot.querySelector('[part~="panel"]');
  }

  get #body() {
    return /** @type {HTMLElement | null} */ (this.renderRoot.querySelector('[part~="body"]'));
  }

  /**
   * Open the sheet; focus returns to `opener` (default: the focused element) on close.
   * @param {HTMLElement | null} [opener]
   */
  show(opener) {
    this.#opener = opener ?? deepActiveElement();
    this.#returnValue = '';
    this.snap = 0;
    this.open = true;
  }

  /**
   * Same as `show()` (the sheet is modal by default), so `<focsd-button commandfor="…" command="show-modal">` opens it.
   * @param {HTMLElement | null} [opener]
   */
  showModal(opener) {
    this.show(opener);
  }

  /**
   * Close the sheet.
   * @param {unknown} [returnValue]
   */
  close(returnValue = '') {
    if (!this.open) return;
    this.#returnValue = String(returnValue);
    this.open = false;
  }

  /** Snap point heights in px, smallest first. */
  #measure() {
    const vh = globalThis.innerHeight ?? FALLBACK_VIEWPORT_HEIGHT;
    const cap = vh * MAX_HEIGHT_RATIO;

    const points = String(this.snapPoints || 'auto')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const content = () => {
      const header = /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="header"]'))?.offsetHeight ?? 0;

      return header + (this.#body?.scrollHeight ?? 0);
    };

    const heights = points.map((p) => {
      if (p === 'auto') return Math.min(content(), cap);

      if (p.endsWith('%')) return (Number.parseFloat(p) / 100) * vh;

      if (p.endsWith('px')) return Number.parseFloat(p);

      return Number.parseFloat(p) || cap;
    });

    return [...new Set(heights.map((h) => clamp(Math.round(h), MIN_SNAP_HEIGHT, vh)))].toSorted((a, b) => a - b);
  }

  get #max() {
    return this.#heights.at(-1) ?? 0;
  }

  #layout = () => {
    if (!this.open) return;
    this.#heights = this.#measure();
    this.#place();
    this.requestUpdate();
  };

  /** Rest at the `snap` point (clamped to the snap points there are). */
  #place() {
    this.snap = clamp(this.snap, 0, this.#heights.length - 1);
    this._offset = this.#max - /** @type {number} */ (this.#heights[this.snap]);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // Set from outside (not a drag in progress): move there. No event: snap is a value, and values
    // set from script fire none, like input.value (open and close do fire, however they happen).
    if (changed.has('snap') && this.#heights.length && !this._dragging) this.#place();
  }

  /** @param {number} index */
  #setSnap(index) {
    const next = clamp(index, 0, this.#heights.length - 1);
    this._offset = this.#max - /** @type {number} */ (this.#heights[next]);

    if (next === this.snap) return;
    this.snap = next;
    /** @type {SnapChangeDetail} */
    const detail = { index: next };

    this.dispatchEvent(new CustomEvent('focsd-snap-change', { bubbles: true, detail }));
  }

  /** @param {KeyboardEvent} event */
  #onHandleKey = (event) => {
    const last = this.#heights.length - 1;

    /** @type {Record<string, number>} */
    const moves = {
      ArrowUp: this.snap + 1,
      ArrowRight: this.snap + 1,
      ArrowDown: this.snap - 1,
      ArrowLeft: this.snap - 1,
      Home: 0,
      End: last,
      Enter: this.snap >= last ? 0 : this.snap + 1,
      ' ': this.snap >= last ? 0 : this.snap + 1,
    };

    if (!(event.key in moves)) return;
    event.preventDefault();
    this.#setSnap(/** @type {number} */ (moves[event.key]));
  };

  /**
   * True when a drag from `path` belongs to the content: controls, editable text, anything with its
   * own touch handling, or a scroll container (between the target and the body) that is scrolled.
   * @param {EventTarget[]} path
   */
  #contentOwns(path) {
    const body = /** @type {HTMLElement} */ (this.#body);

    for (const node of path) {
      if (node === body) return body.scrollTop > 0;

      if (!(node instanceof Element)) continue;

      if (node.matches('input, select, textarea, button, a[href], [contenteditable], [role="slider"], [draggable="true"]')) return true;
      const style = getComputedStyle(node);

      if (style.touchAction === 'none') return true;

      if (/auto|scroll/.test(style.overflowY) && node.scrollHeight > node.clientHeight && node.scrollTop > 0) return true;
    }

    return false;
  }

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    if (event.button > 0 || !event.isPrimary || event.defaultPrevented) return;
    const path = event.composedPath();
    const onHeader = path.includes(/** @type {Element} */ (this.renderRoot.querySelector('[part~="header"]')));
    const fromBody = !onHeader && path.includes(/** @type {HTMLElement} */ (this.#body));

    if (path.some((n) => n instanceof Element && n.matches?.('[part~="close"]'))) return;

    if (!onHeader && !fromBody) return;

    // Only a finger pulls the sheet from its content; a mouse there selects text or works a control.
    if (fromBody && (event.pointerType !== 'touch' || this.#contentOwns(path))) return;

    try {
      /** @type {HTMLElement} */ (event.currentTarget).setPointerCapture?.(event.pointerId);
    } catch {
      /* synthetic or already released pointer */
    }

    this.#drag = { y: event.clientY, start: this._offset, fromBody, samples: [{ y: event.clientY, t: event.timeStamp }], moved: false };
  };

  /** The browser took the gesture over (a scroll, a system gesture): go back to where the drag began. */
  #onPointerCancel = () => {
    const drag = this.#drag;
    this.#drag = null;

    if (!drag) return;
    this._dragging = false;
    this._offset = drag.start;
  };

  /** @param {PointerEvent} event */
  #onPointerMove = (event) => {
    const drag = this.#drag;

    if (!drag) return;
    const dy = event.clientY - drag.y;

    if (drag.fromBody && !drag.moved && dy < 0) {
      // Pulling content up scrolls it: hand the gesture back.
      this.#drag = null;

      return;
    }

    drag.moved = drag.moved || Math.abs(dy) > DRAG_SLOP;

    if (!drag.moved) return;
    this._dragging = true;
    const floor = this.#max + (this.persistent ? 0 : this.#max);
    this._offset = clamp(drag.start + dy, 0, floor);
    drag.samples = [...drag.samples, { y: event.clientY, t: event.timeStamp }].filter((s) => event.timeStamp - s.t <= VELOCITY_WINDOW_MS);
  };

  /** @param {PointerEvent} event */
  #onPointerUp = (event) => {
    const drag = this.#drag;
    this.#drag = null;

    if (!drag?.moved) return;
    this._dragging = false;
    const first = /** @type {Sample} */ (drag.samples[0]);
    const dt = Math.max(1, event.timeStamp - first.t);
    const velocity = (event.clientY - first.y) / dt;
    const visible = this.#max - this._offset;

    if (!this.persistent && (velocity > FLICK || visible < /** @type {number} */ (this.#heights[0]) * DISMISS_RATIO)) {
      this.close();

      return;
    }

    const nearest = this.#heights.reduce(
      (best, h, i) => (Math.abs(h - visible) < Math.abs(/** @type {number} */ (this.#heights[best]) - visible) ? i : best),
      0,
    );

    this._offset = this.#max - /** @type {number} */ (this.#heights[nearest]);
    this.#setSnap(nearest);
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const path = event.composedPath();

    if (path.find((n) => n instanceof FocsdBottomSheetBase) !== this) return;
    const trigger = /** @type {Element | undefined} */ (path.find((n) => n instanceof Element && n.hasAttribute('data-dialog-close')));

    if (trigger) this.close(trigger.getAttribute('value') ?? '');
  };

  /** Clicks on the modal's backdrop (the dialog outside the panel) close a sheet that is not `persistent`. */
  /** @param {MouseEvent} event */
  #onDialogClick = (event) => {
    if (!this.persistent && event.target === this.#dialog) this.close();
  };

  /** @param {Event} event */
  #onCancel = (event) => {
    event.preventDefault();

    if (!this.persistent) this.close();
  };

  /**
   * Escape: a non-modal sheet has no native cancel, so it closes here; a persistent modal
   * cancels the keydown, which stops the close request in every engine. Escape meant for an open
   * popover or dialog inside the sheet is left to it, as is one a tooltip or nav menu inside it has
   * already consumed (they cancel the keydown; the tooltip listens in the capture phase so it runs first).
   */
  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || (!this.nonModal && !this.persistent)) return;
    const dialog = this.#dialog;

    const nested = event
      .composedPath()
      .some((n) => n !== dialog && n instanceof Element && (n.matches(':popover-open') || (n instanceof HTMLDialogElement && n.open)));

    if (nested) return;
    event.preventDefault();

    if (!this.persistent) this.close();
  };

  #restoreFocus() {
    restoreFocusAfterClose(this, this.#opener);
    this.#opener = null;
  }

  /** Records whether the sheet is an open modal, for page shortcuts. @param {import('lit').PropertyValues<this>} changed */
  #trackModal(changed) {
    if (changed.has('open') || changed.has('nonModal')) trackModal(this, this.open && !this.nonModal);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    const dialog = this.#dialog;

    this.#trackModal(changed);

    if (changed.has('open') || changed.has('nonModal') || changed.has('snapPoints')) {
      if (this.open) {
        if (!this.nonModal && dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
        // Layout-driven: the snap heights are measured from the open, rendered sheet, so the
        // re-render that places it is scheduled after this update (still before paint).
        queueMicrotask(this.#layout);
        // Content may still be upgrading: measure again once it has settled.
        requestAnimationFrame(() => this.#layout());
      } else if (changed.get('open')) {
        if (dialog instanceof HTMLDialogElement && dialog.open) dialog.close();
        this.#restoreFocus();
        this.dispatchEvent(new Event('close'));
      }
    }

    const panel = this.#panel;

    if (panel) {
      /** @type {HTMLElement} */ (panel).style.setProperty('--_sheet-height', `${this.#max}px`);
      /** @type {HTMLElement} */ (panel).style.setProperty('--_offset', `${this._offset}px`);
      // The scrolling area ends at the screen's edge, so everything in it can be scrolled into view.
      const header = /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="header"]'))?.offsetHeight ?? 0;
      /** @type {HTMLElement} */ (panel).style.setProperty('--_body-height', `${Math.max(0, this.#max - this._offset - header)}px`);
    }
  }

  #panelTemplate() {
    /** @type {(k: string, ...a: (string | number)[]) => string} */
    const t = (k, ...a) => this.localize.term(k, ...a);
    const vh = globalThis.innerHeight ?? FALLBACK_VIEWPORT_HEIGHT;
    const height = this.#heights[this.snap] ?? 0;
    const pct = this.#heights.length ? Math.round((height / vh) * 100) : 0;

    return html`<div
      part="panel"
      ?data-dragging=${this._dragging}
      @pointerdown=${this.#onPointerDown}
      @pointermove=${this.#onPointerMove}
      @pointerup=${this.#onPointerUp}
      @pointercancel=${this.#onPointerCancel}
    >
      <div part="header">
        <div
          part="handle"
          role="slider"
          tabindex="0"
          aria-label=${t('resizeSheet')}
          aria-orientation="vertical"
          aria-valuemin="0"
          aria-valuemax=${Math.max(0, this.#heights.length - 1)}
          aria-valuenow=${this.snap}
          aria-valuetext=${t('sheetHeight', pct)}
          @keydown=${this.#onHandleKey}
        >
          <span part="grip"></span>
        </div>
        <h2 part="headline" id=${this.#ids.headline}>${this.label}</h2>
        <button part="close" type="button" aria-label=${t('close')} @click=${() => this.close()}>${iconSvg('x')}</button>
      </div>
      <div part="body"><slot></slot></div>
    </div>`;
  }

  /** @override */
  render() {
    if (this.nonModal)
      return html`<section part="dialog" aria-labelledby=${this.#ids.headline} ?hidden=${!this.open} @keydown=${this.#onKeyDown}>
        ${this.#panelTemplate()}
      </section>`;

    // The backdrop click is a pointer shortcut; Escape and Close cover keyboards.
    return html`<dialog part="dialog" aria-labelledby=${this.#ids.headline} @cancel=${this.#onCancel} @click=${this.#onDialogClick} @keydown=${this.#onKeyDown}>
      ${this.open ? this.#panelTemplate() : nothing}
    </dialog>`;
  }
}
