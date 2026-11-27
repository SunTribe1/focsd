import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FOCUSABLE, focusWithin } from '../internal/popup.js';
import { uid } from '../internal/id.js';

/**
 * One entry in the summary: the id of the field and its message.
 * @typedef {{ field: string, message: string }} ErrorSummaryItem
 */

/**
 * An element's error text: its `error` property when it has one, else its `error` attribute.
 * @param {Element} el
 * @returns {string}
 */
const errorOf = (el) => String(('error' in el ? /** @type {{ error?: unknown }} */ (el).error : el.getAttribute('error')) ?? '').trim();

/**
 * Sort comparator for document (tree) order.
 * @param {Element} a
 * @param {Element} b
 */
const inTreeOrder = (a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

/**
 * Error summary (GOV.UK pattern): role=alert, takes focus, links focus each field.
 *
 * Inside a `<form>` (or tied to one with `form="id"`) it validates on its own: on submit every Focsd
 * field checks itself (showing its `error-message`), the summary lists the errors and takes focus,
 * and the submit is stopped while any remain. Errors clear as fields are fixed; a form reset clears
 * them all. Add `manual` to fill `errors` yourself (call `collect()` or set the list).
 *
 * @csspart headline - The headline element.
 * @csspart link - Each link to a field with an error.
 * @csspart list - The list element.
 * @csspart summary - The summary box.
 */
export class FocsdErrorSummaryBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { headline: {}, errors: { attribute: false }, manual: { type: Boolean, reflect: true } };

  /** @type {HTMLFormElement | null} The form this summary validates (automatic mode). */
  #form = null;

  /** True when the next update should move focus to the summary (a submit with errors). */
  #focusNext = false;

  constructor() {
    super();
    /** The heading above the list. */
    this.headline = '';
    /** @type {ErrorSummaryItem[]} The errors listed, each a message and the ID of the field it links to. */
    this.errors = [];
    /** Turn off automatic validation: the summary then lists only what you put in `errors`. */
    this.manual = false;
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    queueMicrotask(() => this.#attach());
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#detach();
  }

  /** The form to validate: the one named by `form="id"`, else the form around the summary. */
  get form() {
    const id = this.getAttribute('form');

    return /** @type {HTMLFormElement | null} */ (id ? document.getElementById(id) : this.closest('form'));
  }

  #attach() {
    this.#detach();
    const form = this.manual || !this.isConnected ? null : this.form;

    if (!form) return;
    this.#form = form;
    // The summary replaces the browser's bubbles: the submit event must fire so it can check the fields.
    form.noValidate = true;
    form.addEventListener('submit', this.#onSubmit, { capture: true });
    form.addEventListener('reset', this.#onReset);
    form.addEventListener('input', this.#onEdit);
    form.addEventListener('change', this.#onEdit);
  }

  #detach() {
    const form = this.#form;

    if (!form) return;
    form.removeEventListener('submit', this.#onSubmit, { capture: true });
    form.removeEventListener('reset', this.#onReset);
    form.removeEventListener('input', this.#onEdit);
    form.removeEventListener('change', this.#onEdit);
    this.#form = null;
  }

  /** The form's controls that validate themselves (every Focsd form control). */
  #fields() {
    return [...(this.#form?.elements ?? [])].filter((el) => 'validate' in el);
  }

  /** On submit: every field checks itself; with errors, list them, take focus and stop the submit. */
  #onSubmit = (/** @type {SubmitEvent} */ event) => {
    for (const field of this.#fields()) /** @type {{ validate: () => boolean }} */ (/** @type {unknown} */ (field)).validate();
    const errors = this.collect(this.#form);

    if (!errors.length) return;
    event.preventDefault();
    // Like native validation: the page's own submit handlers do not run while the form is invalid.
    event.stopImmediatePropagation();
    this.#focusNext = true;
    this.requestUpdate();
  };

  #onReset = () => {
    for (const field of this.#fields()) /** @type {{ clearValidation?: () => void }} */ (field).clearValidation?.();
    this.errors = [];
  };

  /** While the summary shows errors, keep it in step as fields are fixed (without moving focus). */
  #onEdit = () => {
    if (!this.errors.length) return;
    // Fields re-check themselves after their own update; read their errors after that.
    requestAnimationFrame(() => this.collect(this.#form));
  };

  /**
   * Fill `errors` from every control (or focsd-field) in the form that has a non-empty `error`, in
   * tree order. The `error` property is read first, so an error set in the same task
   * (not yet reflected) counts; the attribute covers elements without the property. Candidates are
   * the form's `elements` (including controls tied to it with `form="…"`) and every `[error]`.
   * Fields without an id get one, so the links can reach them.
   * @param {HTMLFormElement | null} [form] Defaults to the form around the summary; without one, the document.
   * @returns {ErrorSummaryItem[]}
   */
  collect(form = this.closest('form')) {
    const scope = form ?? document;

    const candidates = new Set([...(form?.elements ?? []), ...scope.querySelectorAll('[error]')]);

    const items = [...candidates].toSorted(inTreeOrder).flatMap((el) => {
      const message = errorOf(el);

      if (!message) return [];

      if (!el.id) el.id = uid('focsd-error-field');

      return [{ field: el.id, message }];
    });

    this.errors = items;

    return items;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('manual') && changed.get('manual') !== undefined) this.#attach();
    const has = this.errors.length > 0;
    const wasEmpty = !(/** @type {ErrorSummaryItem[] | undefined} */ (changed.get('errors'))?.length);
    this.hidden = !has;

    if (has) {
      this.setAttribute('role', 'alert');
      this.setAttribute('tabindex', '-1');

      // Focus on a submit with errors, or when errors first appear; not while a fix shrinks the list.
      if (this.#focusNext || (changed.has('errors') && wasEmpty)) this.focus();
      this.#focusNext = false;
    } else {
      this.removeAttribute('role');
      this.removeAttribute('tabindex');
    }
  }

  /**
   * @param {MouseEvent} event
   * @param {string} id
   */
  #focusField(event, id) {
    const field = document.getElementById(id);

    if (!field) return;
    event.preventDefault();
    field.scrollIntoView({ block: 'center' });
    field.focus();

    if (focusWithin(field)) return;

    // Hosts without delegatesFocus (radio group, slider, rating, OTP, toggle group): focus their tab
    // stop. In the light DOM that is the roving stop or a form control, never a link in a label.
    const stop = field.querySelector(`[tabindex="0"], :is(${FOCUSABLE}):not(a)`) ?? field.shadowRoot?.querySelector(FOCUSABLE);

    /** @type {HTMLElement} */ (stop)?.focus();
  }

  /** @override */
  render() {
    return html`<div part="summary">
      <h2 part="headline">${this.headline || this.localize.term('errorSummaryHeadline')}</h2>
      <ul part="list">
        ${this.errors.map((e) => html`<li><a part="link" href="#${e.field}" @click=${(/** @type {MouseEvent} */ event) => this.#focusField(event, e.field)}>${e.message}</a></li>`)}
      </ul>
    </div>`;
  }
}
