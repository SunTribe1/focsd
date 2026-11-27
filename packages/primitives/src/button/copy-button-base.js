import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { deepActiveElement } from '../internal/focus.js';
import { iconSvg } from '../internal/icons.js';

/** How long the check icon and the "Copied" or "Copy failed" status stay before they clear. */
const STATUS_MS = 2000;

/**
 * `detail` of `focsd-copy` on a copy button: the text placed on the clipboard.
 * @typedef {{ text: string }} CopyDetail
 */

/** @typedef {'' | 'copied' | 'copyFailed'} CopyStatus */

/** The icon for each status (system icons): a check after a copy, an alert after a failed one. */
const ICONS = { '': 'copy', copied: 'check', copyFailed: 'alert-circle' };

/** A native form control or a form-associated custom element (every Focsd form control): copied by its `value`. */
const isFormControl = (/** @type {Element} */ el) =>
  el.matches('input, textarea, select, output') || /** @type {{ formAssociated?: boolean }} */ (el.constructor).formAssociated === true;

/**
 * Copies through a hidden textarea and `execCommand('copy')`, for pages without the Clipboard API
 * (insecure contexts). Selecting the textarea focuses it, so focus is put back where it was.
 */
function execCopy(/** @type {string} */ text) {
  const focused = /** @type {HTMLElement | null} */ (deepActiveElement());
  const area = Object.assign(document.createElement('textarea'), { value: text });
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    focused?.focus();
  }
}

/**
 * Copy button: copies text to the clipboard and says it did. The button keeps its name ("Copy", or
 * `label`); after a copy its icon turns to a check (an alert when it failed) for 2 seconds and a polite status says "Copied"
 * (or "Copy failed"). It uses the Clipboard API and falls back to `execCommand('copy')` where the
 * API is missing.
 *
 * @fires {CustomEvent<CopyDetail>} focsd-copy - Fired after the text is copied. `detail.text` is what was copied.
 * @fires {Event} focsd-error - Fired when the copy did not work (nothing to copy, permission refused, or no way to copy).
 * @csspart button - The button.
 * @csspart icon - The copy icon: a check after a copy, an alert after a failed one (`data-icon` names it).
 * @csspart status - The visually hidden status region that announces the result; `data-tone="critical"` after a failed copy.
 */
export class FocsdCopyButtonBase extends FocsdElement {
  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: {},
    from: {},
    label: {},
    copiedLabel: { attribute: 'copied-label' },
    _status: { state: true },
  };

  #timer = 0;

  constructor() {
    super();
    /** The text to copy. */
    this.value = '';
    /** The id of an element to copy from, looked up in the same document or shadow root only: a form control's value, else its trimmed text. */
    this.from = '';
    /** The button's accessible name; defaults to "Copy". */
    this.label = '';
    /** What is announced after copying; defaults to "Copied". */
    this.copiedLabel = '';
    /** @internal */
    this._status = /** @type {CopyStatus} */ ('');
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this.#timer);
    // Back on the copy icon with an empty status when it is put back in the page.
    this._status = '';
  }

  /** The text a copy places on the clipboard: `value`, else the `from` element's value or trimmed text. */
  #text() {
    if (this.value || !this.from) return this.value;

    const root = /** @type {Document | ShadowRoot} */ (this.getRootNode());
    const el = /** @type {(HTMLElement & { value?: unknown }) | null} */ (root.getElementById?.(this.from) ?? null);

    if (!el) return '';

    return isFormControl(el) ? String(el.value ?? '') : (el.textContent ?? '').trim();
  }

  /**
   * Copies the text to the clipboard, then announces the result and fires `focsd-copy` or `focsd-error`.
   * An empty text (no `value`, or `from` naming no element or an empty one) is a failure.
   * @returns {Promise<boolean>} whether the text was copied
   */
  async copy() {
    const text = this.#text();
    let ok;

    try {
      if (!text) ok = false;
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else ok = execCopy(text);
    } catch {
      ok = false;
    }

    // Cleared first, so a second copy within the 2 seconds is announced again.
    this._status = '';
    await this.updateComplete;
    this._status = ok ? 'copied' : 'copyFailed';
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => (this._status = ''), STATUS_MS);

    /** @type {CopyDetail} */
    const detail = { text };

    this.dispatchEvent(ok ? new CustomEvent('focsd-copy', { bubbles: true, detail }) : new Event('focsd-error', { bubbles: true }));

    return ok;
  }

  /** @override */
  render() {
    const name = ICONS[this._status];
    const said = this._status === 'copied' ? this.copiedLabel || this.localize.term('copied') : this.localize.term('copyFailed');

    return html`<button part="button" type="button" aria-label=${this.label || this.localize.term('copy')} @click=${() => this.copy()}>
        <span part="icon" data-icon=${name} aria-hidden="true">${iconSvg(name)}</span></button
      ><span part="status" role="status" class="focsd-visually-hidden" data-tone=${this._status === 'copyFailed' ? 'critical' : nothing}
        >${this._status ? said : ''}</span
      >`;
  }
}
