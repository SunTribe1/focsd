import { css, html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';
import { iconSvg } from '../internal/icons.js';
import { deepActiveElement } from '../internal/focus.js';
import { focusWithin, isFrom, setTriggerState } from '../internal/popup.js';

/** Arrow-key step for the move button, and with Shift held. */
const STEP = 10;
const BIG_STEP = 50;

/** Gap between the trigger and the panel, and between the panel and the screen edge. */
const GAP = 8;
const EDGE = 16;

/**
 * Open panels, oldest first: the last one is drawn on top. Shared by every instance, so it is only
 * ever replaced (never mutated in place), through `toTop` and `drop`.
 * @type {readonly FocsdFloatingPanelBase[]}
 */
let stack = [];

/**
 * Put `panel` on top of the stack (moving it there when it is already open).
 * @param {FocsdFloatingPanelBase} panel
 */
const toTop = (panel) => {
  stack = [...stack.filter((p) => p !== panel), panel];
};

/**
 * Take `panel` off the stack.
 * @param {FocsdFloatingPanelBase} panel
 */
const drop = (panel) => {
  stack = stack.filter((p) => p !== panel);
};

/** @typedef {{ x: number, y: number }} Point */

/**
 * `detail` of `focsd-move`: the panel's new position in CSS pixels from the top left of the viewport.
 * @typedef {Point} FloatingPanelMoveDetail
 */

/** @typedef {{ id: number, dx: number, dy: number, moved: boolean }} DragState */
/** @typedef {HTMLElement & { isDisabled?: boolean }} TriggerElement */

/**
 * Floating panel: a non-modal dialog that floats above the page and can be dragged anywhere on
 * screen by its header, or moved with the arrow keys from its move button (WCAG 2.5.7). It stays
 * fully on screen, remembers where it was moved, and opens from a trigger (`trigger` = the id of a
 * button in the same document or shadow root) or from code (`show()`, `close()`, `open`). Escape
 * closes it while focus is inside, and focus returns to the trigger. Several can be open at once;
 * the one you touch comes to the front.
 *
 * @fires {Event} focsd-open - Fired after the panel opens.
 * @fires {Event} close - Fired after the panel closes. Like `<dialog>`, it does not bubble.
 * @fires {CustomEvent<FloatingPanelMoveDetail>} focsd-move - Fired after the panel moves (drag end, arrow key, `moveTo`); `detail` is `{ x, y }` in CSS pixels from the top left of the viewport.
 * @slot - The panel content.
 * @csspart panel - The floating panel (role="dialog").
 * @csspart header - The draggable header.
 * @csspart title - The title.
 * @csspart move-handle - The move button (arrow keys move the panel).
 * @csspart close - The close button.
 * @csspart body - The content area.
 */
export class FocsdFloatingPanelBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, open: { type: Boolean, reflect: true }, trigger: {} };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      [part~='panel'] {
        position: fixed;
        /* physical: the panel is placed with viewport x/y coordinates, which do not flip */
        inset: 0 auto auto 0;
        margin: 0;
      }
      [part~='header'] {
        touch-action: none;
        user-select: none;
      }
    `,
  ];

  #ids = { title: uid('focsd-floating-title'), hint: uid('focsd-floating-hint') };
  /** Where the panel is, once placed: kept across close and reopen. */
  /** @type {Point | null} */
  #pos = null;
  /** @type {DragState | null} */
  #drag = null;
  /** @type {HTMLElement | null} */
  #opener = null;

  constructor() {
    super();
    /** The accessible name of the panel. */
    this.label = '';
    /** Whether the panel is open. */
    this.open = false;
    /** The ID of the button that opens the panel and gets focus back when it closes. */
    this.trigger = '';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    const root = /** @type {Document | ShadowRoot} */ (this.getRootNode());
    this.#root = root;
    root.addEventListener?.('click', this.#onRootClick);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#root?.removeEventListener?.('click', this.#onRootClick);
    globalThis.removeEventListener?.('resize', this.#onResize);
    drop(this);
  }

  /** @type {Document | ShadowRoot | null} */
  #root = null;

  /** @returns {HTMLElement | null} */
  get #panel() {
    return this.renderRoot?.querySelector('[part~="panel"]') ?? null;
  }

  /**
   * The trigger element, looked up by id in the panel's own document or shadow root.
   * @returns {TriggerElement | null}
   */
  get triggerElement() {
    return this.trigger ? (this.#root?.getElementById?.(this.trigger) ?? null) : null;
  }

  /** @param {Event} event */
  #onRootClick = (event) => {
    const trigger = this.triggerElement;

    if (!trigger || !isFrom(event, trigger) || trigger.isDisabled) return;

    if (this.open) this.close();
    else this.show();
  };

  /** Open the panel and move focus into it. */
  show() {
    const panel = this.#panel;

    if (!panel) return;

    if (!panel.matches(':popover-open')) {
      this.#opener = deepActiveElement();
      /** @type {HTMLElement} */ (panel).showPopover();
      toTop(this);
      globalThis.addEventListener('resize', this.#onResize);
      this.#place();
      this.open = true;
      this.dispatchEvent(new Event('focsd-open', { bubbles: true }));
    }

    /** @type {HTMLElement} */ (panel).focus();
  }

  /** Close the panel; focus returns to the trigger (or the element focused before opening). */
  close() {
    const panel = this.#panel;

    if (!panel?.matches(':popover-open')) {
      this.open = false;

      return;
    }

    const hadFocus = focusWithin(this);
    /** @type {HTMLElement} */ (panel).hidePopover();
    drop(this);
    globalThis.removeEventListener('resize', this.#onResize);
    this.open = false;

    if (hadFocus) (this.triggerElement ?? this.#opener)?.focus?.();
    this.#opener = null;
    this.dispatchEvent(new Event('close'));
  }

  /**
   * Move the panel to (x, y) CSS pixels from the top left of the viewport, kept on screen.
   * @param {number} x
   * @param {number} y
   */
  moveTo(x, y) {
    this.#apply(x, y);
    this.#emitMove();
  }

  /** Fire `focsd-move` with the position just applied. */
  #emitMove() {
    if (!this.#pos) return;
    /** @type {FloatingPanelMoveDetail} */
    const detail = { ...this.#pos };

    this.dispatchEvent(new CustomEvent('focsd-move', { bubbles: true, detail }));
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    setTriggerState(this.triggerElement, { expanded: this.open, haspopup: 'dialog' });

    if (changed.has('open') && changed.get('open') !== undefined) {
      const showing = this.#panel?.matches(':popover-open');

      if (this.open && !showing) this.show();
      else if (!this.open && showing) this.close();
    }
  }

  // ---- position --------------------------------------------------------------------------------

  #viewport() {
    const root = document.documentElement;

    return { width: root.clientWidth || globalThis.innerWidth, height: globalThis.innerHeight };
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  #apply(x, y) {
    const panel = /** @type {HTMLElement} */ (this.#panel);
    const { width, height } = this.#viewport();
    const maxX = Math.max(0, width - /** @type {HTMLElement} */ (panel).offsetWidth);
    const maxY = Math.max(0, height - /** @type {HTMLElement} */ (panel).offsetHeight);
    const pos = { x: Math.round(Math.min(maxX, Math.max(0, x))), y: Math.round(Math.min(maxY, Math.max(0, y))) };
    this.#pos = pos;
    /** @type {HTMLElement} */ (panel).style.translate = `${pos.x}px ${pos.y}px`;
  }

  /** First open: next to the trigger, else the bottom end of the screen. Later: where it was left. */
  #place() {
    if (this.#pos) {
      this.#apply(this.#pos.x, this.#pos.y);

      return;
    }

    const panel = this.#panel;
    const { width, height } = this.#viewport();
    const rtl = getComputedStyle(this).direction === 'rtl';
    const anchor = this.triggerElement?.getBoundingClientRect();

    if (anchor) {
      const below = anchor.bottom + GAP;

      const y =
        below + /** @type {HTMLElement} */ (panel).offsetHeight <= height
          ? below
          : anchor.top - GAP - /** @type {HTMLElement} */ (panel).offsetHeight;

      this.#apply(rtl ? anchor.right - /** @type {HTMLElement} */ (panel).offsetWidth : anchor.left, y);
    } else {
      this.#apply(
        rtl ? EDGE : width - /** @type {HTMLElement} */ (panel).offsetWidth - EDGE,
        height - /** @type {HTMLElement} */ (panel).offsetHeight - EDGE,
      );
    }
  }

  #onResize = () => {
    if (this.#pos) this.#apply(this.#pos.x, this.#pos.y);
  };

  // ---- stacking --------------------------------------------------------------------------------

  /** Bring this panel in front of the other open ones (top layer order is opening order). */
  #raise() {
    if (stack.at(-1) === this || !this.open) return;
    const focused = focusWithin(this) ? deepActiveElement() : null;
    const panel = this.#panel;
    /** @type {HTMLElement} */ (panel).hidePopover();
    /** @type {HTMLElement} */ (panel).showPopover();
    toTop(this);
    focused?.focus?.();
  }

  // ---- pointer drag ----------------------------------------------------------------------------

  /** @param {PointerEvent} event */
  #onHeaderPointerDown = (event) => {
    const pos = this.#pos;

    if (event.button !== 0 || !pos) return;

    if (event.composedPath().some((n) => n instanceof HTMLButtonElement)) return;
    event.preventDefault();
    this.#drag = { id: event.pointerId, dx: event.clientX - pos.x, dy: event.clientY - pos.y, moved: false };

    try {
      /** @type {HTMLElement} */ (event.currentTarget).setPointerCapture(event.pointerId);
    } catch {
      /* synthetic pointers cannot be captured; the header still gets the events */
    }
  };

  /** @param {PointerEvent} event */
  #onHeaderPointerMove = (event) => {
    const drag = this.#drag;

    if (!drag || event.pointerId !== drag.id) return;
    drag.moved = true;
    this.#apply(event.clientX - drag.dx, event.clientY - drag.dy);
  };

  /** @param {PointerEvent} event */
  #onHeaderPointerEnd = (event) => {
    const drag = this.#drag;

    if (!drag || event.pointerId !== drag.id) return;
    this.#drag = null;

    if (event.type === 'pointerup') this.#apply(event.clientX - drag.dx, event.clientY - drag.dy);

    if (drag.moved || event.type === 'pointerup') this.#emitMove();
  };

  // ---- keyboard --------------------------------------------------------------------------------

  /** @param {KeyboardEvent} event */
  #onMoveKeyDown = (event) => {
    const step = event.shiftKey ? BIG_STEP : STEP;
    /** @type {Record<string, [number, number] | undefined>} */
    const deltas = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const delta = deltas[event.key];
    const pos = this.#pos;

    if (!delta || !pos) return;
    event.preventDefault();
    this.moveTo(pos.x + delta[0], pos.y + delta[1]);
  };

  /** @param {KeyboardEvent} event */
  #onPanelKeyDown = (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    this.close();
  };

  /** @override */
  render() {
    const name = this.label;

    return html`<div
      part="panel"
      role="dialog"
      aria-labelledby=${this.#ids.title}
      popover="manual"
      tabindex="-1"
      @keydown=${this.#onPanelKeyDown}
      @pointerdown=${() => this.#raise()}
      @focusin=${() => this.#raise()}
    >
      <div
        part="header"
        @pointerdown=${this.#onHeaderPointerDown}
        @pointermove=${this.#onHeaderPointerMove}
        @pointerup=${this.#onHeaderPointerEnd}
        @pointercancel=${this.#onHeaderPointerEnd}
      >
        <h2 part="title" id=${this.#ids.title}>${name}</h2>
        <button part="move-handle" type="button" aria-label=${this.localize.term('moveNamed', name)} aria-describedby=${this.#ids.hint} @keydown=${this.#onMoveKeyDown}>
          ${iconSvg('move', 'icon')}
        </button>
        <button part="close" type="button" aria-label=${this.localize.term('closeNamed', name)} @click=${() => this.close()}>${iconSvg('x', 'icon')}</button>
        <span id=${this.#ids.hint} hidden>${this.localize.term('moveHint')}</span>
      </div>
      <div part="body"><slot></slot></div>
    </div>`;
  }
}
