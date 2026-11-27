import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';

/**
 * Toolbar: one tab stop with roving focus over slotted controls.
 *
 * @slot - Default content.
 * @csspart toolbar - The toolbar element.
 */
export class FocsdToolbarBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, orientation: { reflect: true } };

  constructor() {
    super();
    /** The accessible name of the toolbar. */
    this.label = '';
    /** @type {'horizontal' | 'vertical'} The direction of the toolbar, and of the arrow keys that move in it. */
    this.orientation = 'horizontal';
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('focusin', this.#onFocusIn);
  }

  /**
   * The controls the arrow keys move between, in order.
   * @returns {Element[]}
   */
  get controls() {
    return [...(this.children ?? [])].filter((c) => !(/** @type {HTMLElement} */ (c).hidden));
  }

  /** @param {number} index */
  #setStop(index) {
    this.controls.forEach((c, i) => c.setAttribute('tabindex', i === index ? '0' : '-1'));
  }

  #sync = () => {
    const controls = this.controls;
    const current = controls.findIndex((c) => c.getAttribute('tabindex') === '0');
    this.#setStop(Math.max(current, 0));
  };

  /** @override */
  updated() {
    this.setAttribute('role', 'toolbar');

    if (this.label) this.setAttribute('aria-label', this.label);
    this.setAttribute('aria-orientation', this.orientation);
    this.#sync();
  }

  /** @param {FocusEvent} event */
  #onFocusIn = (event) => {
    const index = this.controls.findIndex((c) => event.composedPath().includes(c));

    if (index >= 0) this.#setStop(index);
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const controls = this.controls;
    const current = controls.findIndex((c) => event.composedPath().includes(c));

    if (current < 0) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const vertical = this.orientation === 'vertical';
    const fwd = vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const none = () => false;
    let next;

    if (event.key === fwd) next = nextIndex(current, 1, controls.length, none);
    else if (event.key === back) next = nextIndex(current, -1, controls.length, none);
    else if (event.key === 'Home') next = edgeIndex('first', controls.length, none);
    else if (event.key === 'End') next = edgeIndex('last', controls.length, none);
    else return;
    event.preventDefault();
    this.#setStop(next);
    /** @type {HTMLElement} */ (controls[next]).focus();
  };

  /** @override */
  render() {
    return html`<div part="toolbar"><slot @slotchange=${this.#sync}></slot></div>`;
  }
}
