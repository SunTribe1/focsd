import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';
import { deepActiveElement, restoreFocusAfterClose } from '../internal/focus.js';
import { submitterOf } from '../internal/submitter.js';
import { iconSvg } from '../internal/icons.js';
import { firstFocusable } from '../internal/popup.js';
import { trackModal } from '../internal/open-modals.js';

/**
 * Headless modal dialog built on a native <dialog> (showModal: top layer, inert background,
 * Escape, focus return). Closes on click of a slotted element with `data-dialog-close`
 * (returnValue = its `value`) or on submit of a light-DOM `<form method="dialog">`.
 *
 * Native dialog parity: `showModal()`, `requestClose(returnValue)` and Escape fire a cancelable
 * `cancel` on the host; `closedby` is `closerequest` (Escape, the default), `any` (also a backdrop
 * click) or `none` (only explicit close actions).
 *
 * @fires cancel - Fired before a close request (Escape, backdrop, requestClose); cancel it to keep the dialog open.
 * @fires close - Fired after the dialog closes; read `returnValue` for how it closed.
 * @slot - Default content.
 * @slot actions - The dialog's buttons.
 * @csspart actions - The actions element.
 * @csspart body - The body element.
 * @csspart close - The close (×) button, last in the tab order; it asks to close like Escape (hidden with `no-close`).
 * @csspart dialog - The dialog element.
 * @csspart headline - The headline element.
 */
export class FocsdDialogBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    headline: {},
    open: { type: Boolean, reflect: true },
    closedBy: { attribute: 'closedby' },
    noClose: { type: Boolean, attribute: 'no-close' },
  };

  #headlineId = uid('focsd-dialog-headline');

  #bodyId = uid('focsd-dialog-body');

  /**
   * Subclasses: 'alertdialog' for alert dialogs.
   * @type {string | undefined}
   */
  static dialogRole = undefined;

  /** Subclasses: describe the dialog by its body (alert dialogs). */
  static describeBody = false;

  /**
   * Subclasses: whether the dialog shows a close (×) button. Alert dialogs do not: people answer
   * them with one of their actions (APG alert dialog).
   */
  static closeButton = true;

  #returnValue = '';

  #pendingReturnValue = '';

  /** @type {HTMLElement | null} */
  #opener = null;

  constructor() {
    super();
    /** The dialog's heading, which also names it. */
    this.headline = '';
    /** Whether the dialog is open. */
    this.open = false;
    /**
     * @type {'any' | 'closerequest' | 'none'}
     * How the dialog can be dismissed, as on `<dialog closedby>`: `any` adds a backdrop click, `none` blocks Escape.
     */
    this.closedBy = 'closerequest';
    /** Hides the close (×) button, for a dialog that must be answered with one of its actions. */
    this.noClose = false;
    this.addEventListener('click', this.#onClick);
    this.addEventListener('submit', this.#onSubmit);
  }

  /**
   * The value passed to the last `close()`, as on `<dialog>`.
   * @returns {string}
   */
  get returnValue() {
    return this.#returnValue;
  }

  /** @returns {HTMLDialogElement} */
  get #dialog() {
    return /** @type {HTMLDialogElement} */ (this.renderRoot.querySelector('dialog'));
  }

  /**
   * Open as a modal dialog. Focus returns to `opener` (default: the element focused now) on close,
   * which matters in Safari where clicking a button does not focus it.
   * @param {HTMLElement} [opener]
   */
  show(opener) {
    this.#opener = opener ?? deepActiveElement();
    this.#pendingReturnValue = '';
    this.open = true;
  }

  /**
   * Same as `show()`: Focsd dialogs are always modal.
   * @param {HTMLElement} [opener]
   */
  showModal(opener) {
    this.show(opener);
  }

  /**
   * Ask to close: fires a cancelable `cancel`, then closes with `returnValue` unless it was canceled.
   * @param {unknown} [returnValue]
   */
  requestClose(returnValue = '') {
    if (!this.open) return;

    if (this.#fireCancel()) this.close(returnValue);
  }

  /** Dispatch `cancel` on the host; true when nobody vetoed it. */
  #fireCancel() {
    return this.dispatchEvent(new Event('cancel', { cancelable: true }));
  }

  get #closedBy() {
    return ['any', 'none'].includes(this.closedBy) ? this.closedBy : 'closerequest';
  }

  /** Native cancel (Escape): `none` blocks it, otherwise the host's `cancel` listeners decide. */
  /** @param {Event} event */
  #onNativeCancel = (event) => {
    if (this.#closedBy === 'none' || !this.#fireCancel()) event.preventDefault();
  };

  /**
   * Canceling keydown stops the close request before it starts (reliable in every engine). Escape
   * meant for an open popover or dialog inside this one (a listbox, a menu, a picker) is left alone.
   */
  /** @param {KeyboardEvent} event */
  #onDialogKeyDown = (event) => {
    if (event.key !== 'Escape' || this.#closedBy !== 'none') return;
    const dialog = this.#dialog;

    const nested = event
      .composedPath()
      .some((n) => n !== dialog && n instanceof Element && (n.matches(':popover-open') || (n instanceof HTMLDialogElement && n.open)));

    if (!nested) event.preventDefault();
  };

  /**
   * True when a pointer lands on the backdrop: the <dialog> itself, outside its box.
   * @param {MouseEvent} event
   */
  #onBackdrop(event) {
    const dialog = this.#dialog;

    if (event.target !== dialog || !dialog.open) return false;
    const r = dialog.getBoundingClientRect();

    return !(event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom);
  }

  #pressedBackdrop = false;

  /** @param {PointerEvent} event */
  #onDialogPointerDown = (event) => {
    this.#pressedBackdrop = this.#onBackdrop(event);
  };

  /** Light dismiss needs both press and release on the backdrop (a drag out of the dialog is not one). */
  /** @param {MouseEvent} event */
  #onDialogClick = (event) => {
    const pressed = this.#pressedBackdrop;
    this.#pressedBackdrop = false;

    if (this.#closedBy === 'any' && pressed && this.#onBackdrop(event)) this.requestClose();
  };

  /**
   * Close, optionally setting `returnValue`.
   * @param {unknown} [returnValue]
   */
  close(returnValue = '') {
    this.#pendingReturnValue = String(returnValue);
    this.open = false;
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    trackModal(this, false);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    // Moved while open (a removal and an insertion): it is still an open modal.
    if (this.open) trackModal(this, true);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (!changed.has('open')) return;
    trackModal(this, this.open);
    const dialog = this.#dialog;

    if (this.open && !dialog.open) {
      this.#opener ??= deepActiveElement();
      dialog.returnValue = '';
      dialog.showModal();
      this.#focusInitial();
    } else if (!this.open && dialog.open) dialog.close(this.#pendingReturnValue);
  }

  /**
   * Initial focus, the same in every engine: `[data-autofocus]`, else the first focusable in the
   * content, else in the actions. (Firefox and WebKit would otherwise take the first focusable in the
   * dialog's own tree, the close button, since their dialog focusing steps do not look into slots.)
   */
  #focusInitial() {
    const slots = /** @type {HTMLSlotElement[]} */ ([...this.renderRoot.querySelectorAll('slot')]);

    const target =
      /** @type {HTMLElement | null} */ (this.querySelector('[data-autofocus]')) ?? slots.map((slot) => firstFocusable(slot)).find(Boolean);

    /** @type {HTMLElement | undefined} */ (target ?? undefined)?.focus();
  }

  /** @param {Event} event */
  #onNativeClose = (event) => {
    // Slotted content's own bubbling "close" events (a floating panel, a hover card) pass through
    // the dialog's shadow tree: only the dialog's own close closes it.
    if (event.target !== this.#dialog) return;
    this.#returnValue = this.#dialog.returnValue;
    this.#pendingReturnValue = '';
    this.open = false;
    this.#restoreFocus();
    this.dispatchEvent(new Event('close'));
  };

  #restoreFocus() {
    restoreFocusAfterClose(this, this.#opener);
    this.#opener = null;
  }

  /**
   * True when `this` is the nearest dialog to the event's origin (nested dialogs handle their own).
   * @param {EventTarget[]} path
   */
  #isNearest(path) {
    return path.find((node) => node instanceof FocsdDialogBase) === this;
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const path = event.composedPath();

    if (!this.#isNearest(path)) return;

    const trigger = /** @type {Element | undefined} */ (
      path.find((node) => node instanceof Element && node.hasAttribute('data-dialog-close'))
    );

    if (trigger) this.close(trigger.getAttribute('value') ?? '');
  };

  /** @param {SubmitEvent} event */
  #onSubmit = (event) => {
    const form = /** @type {HTMLFormElement} */ (event.target);
    // A submitter's formmethod (including a focsd-button's, through its native stand-in) overrides the form's.
    const method = event.submitter?.getAttribute('formmethod')?.toLowerCase() || form.method;

    if (!(form instanceof HTMLFormElement) || method !== 'dialog' || !this.#isNearest(event.composedPath())) return;
    event.preventDefault();
    this.close(submitterOf(event)?.value ?? '');
  };

  /** @override */
  render() {
    return html`
      <dialog
        part="dialog"
        role=${/** @type {typeof FocsdDialogBase} */ (this.constructor).dialogRole ?? nothing}
        aria-labelledby=${this.#headlineId}
        aria-describedby=${/** @type {typeof FocsdDialogBase} */ (this.constructor).describeBody ? this.#bodyId : nothing}
        @close=${this.#onNativeClose}
        @cancel=${this.#onNativeCancel}
        @keydown=${this.#onDialogKeyDown}
        @pointerdown=${this.#onDialogPointerDown}
        @click=${this.#onDialogClick}
      >
        <h2 part="headline" id=${this.#headlineId}>${this.headline}</h2>
        <div part="body" id=${this.#bodyId}><slot></slot></div>
        <div part="actions"><slot name="actions"></slot></div>
        ${
          /** @type {typeof FocsdDialogBase} */ (this.constructor).closeButton && !this.noClose
            ? html`<button part="close" type="button" aria-label=${this.localize.term('close')} @click=${() => this.requestClose()}>${iconSvg('x')}</button>`
            : nothing
        }
      </dialog>
    `;
  }
}
