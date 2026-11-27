import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FocsdAvatarBase } from './avatar-base.js';

/**
 * A labeled group of avatars; children beyond `max` collapse into a "+N" summary.
 *
 * @slot - Default content.
 * @csspart group - The group element.
 * @csspart overflow - The "+N" count of avatars beyond `max`.
 */
export class FocsdAvatarGroupBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    max: { type: Number },
    _overflow: { state: true },
  };

  constructor() {
    super();
    /** The accessible name of the group. */
    this.label = '';
    /** The most avatars shown; the rest are counted in a "+N" avatar. */
    this.max = Infinity;
    /** @internal */
    this._overflow = 0;
  }

  #sync = () => {
    const avatars = [...(this.children ?? [])].filter((el) => el instanceof FocsdAvatarBase);
    avatars.forEach((avatar, i) => {
      avatar.hidden = i >= this.max;
    });
    this._overflow = Math.max(0, avatars.length - this.max);
  };

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    // Before rendering, so the "+N" count renders in the same pass (slot changes sync on their own).
    if (changed.has('max') && this.isConnected) this.#sync();
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'group');

    if (this.label) this.setAttribute('aria-label', this.label);
  }

  /** @override */
  render() {
    return html`<span part="group"><slot @slotchange=${this.#sync}></slot>${
      this._overflow
        ? html`<span part="overflow" role="img" aria-label=${this.localize.term('moreCount', this._overflow)}>+${this._overflow}</span>`
        : nothing
    }</span>`;
  }
}
