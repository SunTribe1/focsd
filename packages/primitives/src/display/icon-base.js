import { css, html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { icon, slottedIconStyles } from '../internal/icons.js';

/**
 * An icon: `name` from the default (or `library`) icon library, or `src` for one SVG file. Slotted
 * content (an <svg>, <img> or icon-font element) replaces it. Decorative (aria-hidden) unless
 * `label` is set (role=img). `mirror` flips it in right-to-left text, for directional icons.
 *
 * @slot - Your own icon, replacing the resolved one.
 * @csspart svg - The rendered SVG.
 */
export class FocsdIconBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      :host([mirror]:dir(rtl)) svg,
      :host([mirror]:dir(rtl)) ::slotted(*) {
        transform: scaleX(-1);
      }
    `,
    slottedIconStyles,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    name: { reflect: true },
    library: {},
    src: {},
    label: {},
    mirror: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    /** The icon's name in its library. */
    this.name = '';
    /** The registered icon library to look `name` up in; defaults to the built-in icons. */
    this.library = '';
    /** The URL of an SVG file to show instead of a named icon. */
    this.src = '';
    /** The accessible name. Without it the icon is decorative and hidden from assistive technology. */
    this.label = '';
    /** Mirrors the icon in right-to-left text, for icons that point in the reading direction. */
    this.mirror = false;
  }

  /** @override */
  updated() {
    if (this.label) {
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', this.label);
      this.removeAttribute('aria-hidden');
    } else {
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
      this.setAttribute('aria-hidden', 'true');
    }
  }

  /** @override */
  render() {
    const spec = this.src ? { src: this.src } : { library: this.library, name: this.name };
    // Slotted markup replaces the icon: do not resolve (or fetch) a fallback nobody will see.
    const slotted = (this.children?.length ?? 0) > 0;
    const fallback = !slotted && (spec.src || spec.name) ? icon(spec) : nothing;

    return html`<slot @slotchange=${() => this.requestUpdate()}>${fallback}</slot>`;
  }
}
