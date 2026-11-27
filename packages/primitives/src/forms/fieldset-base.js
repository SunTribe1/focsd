import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { uid } from '../internal/id.js';

/** Native listed elements that a disabled fieldset disables. */
const NATIVE_CONTROLS = 'input, select, textarea, button, fieldset';

/**
 * A named group: shadow <fieldset>/<legend> with slotted controls, optional hint and error.
 *
 * `disabled` works like a native fieldset's: every control inside (native or form-associated custom
 * element) is disabled, so it renders disabled, is skipped by validation and left out of the form.
 * Slotted controls are not DOM descendants of the shadow <fieldset>, so the `disabled` attribute is
 * set on them directly and removed again on enable (controls the author disabled stay disabled).
 *
 * @slot - Default content.
 * @csspart error - The error element.
 * @csspart fieldset - The fieldset element.
 * @csspart hint - The hint element.
 * @csspart items - The container around the slotted controls.
 * @csspart legend - The legend element.
 */
export class FocsdFieldsetBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    hint: {},
    // A blank error is not reflected, so a fresh or cleared fieldset carries no empty attribute.
    error: { reflect: true, converter: { toAttribute: (/** @type {unknown} */ value) => (String(value ?? '').trim() ? value : null) } },
    disabled: { type: Boolean, reflect: true },
    name: { reflect: true },
  };

  #ids = { hint: uid('focsd-fieldset-hint'), error: uid('focsd-fieldset-error') };

  /** Controls this fieldset disabled (so enabling restores exactly those). */
  /** @type {Set<Element>} */
  #disabledByMe = new Set();

  #observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') this.#onDisabledChange(/** @type {MutationRecord & { target: Element }} */ (record));
      else for (const node of record.removedNodes) this.#release(node);
    }

    this.#sync();
  });

  /**
   * Someone else set `disabled` on a control we disabled (our own writes always start from no
   * attribute): it is theirs now, so enabling the fieldset leaves it disabled. A control enabled
   * while the fieldset is disabled is disabled again, as a native fieldset would keep it.
   * @param {MutationRecord & { target: Element }} record
   */
  #onDisabledChange({ target, oldValue }) {
    if (!this.#disabledByMe.has(target)) return;

    if (!target.hasAttribute('disabled')) {
      if (this.disabled) target.setAttribute('disabled', '');
      else this.#disabledByMe.delete(target);
    } else if (oldValue !== null) this.#disabledByMe.delete(target);
  }

  constructor() {
    super();
    /** The legend. */
    this.label = '';
    /** Help text shown below the legend. */
    this.hint = '';
    /** @type {string | undefined} An error message for the group; set, the group is invalid. */
    this.error = undefined;
    /** Disables every control inside, as on `<fieldset disabled>`. */
    this.disabled = false;
    /** The name of the group, as on `<fieldset>`. */
    this.name = '';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled'],
      attributeOldValue: true,
    });
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  /** The form controls inside this fieldset (light DOM). */
  get elements() {
    return [...this.querySelectorAll('*')].filter(
      (el) =>
        el.matches(NATIVE_CONTROLS) ||
        /** @type {{ formAssociated?: boolean }} */ (el.constructor).formAssociated ||
        el instanceof FocsdFieldsetBase,
    );
  }

  /** Settles once the latest disabled propagation has been applied. */
  #pending = Promise.resolve();

  /**
   * Settles after the update and once `disabled` has reached the fields inside.
   * @override
   */
  async getUpdateComplete() {
    const result = await super.getUpdateComplete();
    await this.#pending;

    return result;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('disabled')) this.#sync();
  }

  #sync() {
    this.#pending = this.#pending.then(() => this.#apply());
  }

  /**
   * Waits for the controls' own pending updates first, so their initial attribute reflection is
   * never mistaken for an author's change (see #onDisabledChange).
   */
  async #apply() {
    if (this.disabled) {
      await Promise.all(this.elements.map((el) => /** @type {{ updateComplete?: Promise<unknown> }} */ (el).updateComplete));

      if (!this.disabled) return;

      for (const el of this.elements) {
        if (el.hasAttribute('disabled')) continue;
        el.setAttribute('disabled', '');
        this.#disabledByMe.add(el);
      }
    } else {
      for (const el of this.#disabledByMe) el.removeAttribute('disabled');
      this.#disabledByMe.clear();
    }
  }

  /**
   * A control moved out of the fieldset gets back the state it had.
   * @param {Node} node
   */
  #release(node) {
    for (const el of this.#disabledByMe) {
      if (el !== node && !node.contains?.(el)) continue;
      el.removeAttribute('disabled');
      this.#disabledByMe.delete(el);
    }
  }

  /** @override */
  render() {
    const describedBy = [this.hint && this.#ids.hint, this.error && this.#ids.error].filter(Boolean).join(' ');

    return html`<fieldset part="fieldset" ?disabled=${this.disabled} aria-describedby=${describedBy || nothing}>
      <legend part="legend">${this.label}</legend>
      ${this.hint ? html`<p part="hint" id=${this.#ids.hint}>${this.hint}</p>` : nothing}
      ${this.error ? html`<p part="error" id=${this.#ids.error}>${this.error}</p>` : nothing}
      <div part="items"><slot></slot></div>
    </fieldset>`;
  }
}
