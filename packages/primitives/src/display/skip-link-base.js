import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Skip link: hidden until focused; moves focus to the target.
 *
 * With the default `href="#main"` and no element with id `main`, the link focuses the main landmark
 * of the first `focsd-app-shell` found by `document.querySelector`. Limits: a shell inside another
 * component's shadow root is not found, and with two shells the first wins (not the one next to the
 * link). Give the main content an id and point `href` at it in those layouts.
 *
 * @slot - Default content.
 * @csspart link - The link element.
 */
export class FocsdSkipLinkBase extends FocsdElement {
  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { href: {} };

  constructor() {
    super();
    /** The fragment link to the main content. The default `#main` also reaches the main of a focsd-app-shell. */
    this.href = '#main';
  }

  /**
   * The element the link moves focus to: the element with the fragment's id, else, for an id of
   * `main`, the main landmark inside a focsd-app-shell (its shadow root hides it from the fragment).
   * @returns {HTMLElement | null}
   */
  #target() {
    const id = this.href.replace(/^#/, '');
    const byId = document.getElementById(id);

    if (byId || id !== 'main') return byId;

    return document.querySelector('focsd-app-shell')?.shadowRoot?.querySelector('main') ?? null;
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const target = this.#target();

    if (!target) return;
    event.preventDefault();

    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
    target.scrollIntoView({ block: 'start' });
  };

  /** @override */
  render() {
    return html`<a part="link" href=${this.href} @click=${this.#onClick}><slot></slot></a>`;
  }
}
