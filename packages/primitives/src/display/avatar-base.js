import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { hueOf } from '../internal/hue.js';

/**
 * Avatar: role=img named by `name`; falls back to initials when `src` is missing or fails.
 *
 * @csspart avatar - The avatar element.
 * @csspart image - The image element.
 * @csspart initials - The initials shown when there is no image.
 */
export class FocsdAvatarBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    src: {},
    name: {},
    size: { reflect: true },
    decorative: { type: Boolean, reflect: true },
    _failed: { state: true },
  };

  constructor() {
    super();
    /** The image URL. Without it, or if it fails to load, the initials of `name` show. */
    this.src = '';
    /** The person's name: the accessible name and the source of the initials. */
    this.name = '';
    /** @type {'s' | 'm' | 'l'} The avatar size. */
    this.size = 'm';
    /** Hides the avatar from assistive technology, when the name is already shown next to it. */
    this.decorative = false;
    /** @internal */
    this._failed = false;
  }

  /** First letters of the first and last word of `name`, upper-cased. */
  get initials() {
    const words = this.name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) return '';
    const first = words[0]?.[0];
    const last = words.length > 1 ? (words.at(-1)?.[0] ?? '') : '';

    return `${first}${last}`.toLocaleUpperCase();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (changed.has('src')) this._failed = false;
  }

  /** @override */
  updated() {
    // A colorful preset (Prismatic) colors initials by name: the same person, the same color.
    this.dataset.hue = String(hueOf(this.name));

    if (this.decorative) {
      this.setAttribute('aria-hidden', 'true');
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
    } else {
      this.removeAttribute('aria-hidden');
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', this.name);
    }
  }

  /** @override */
  render() {
    const showImage = this.src && !this._failed;

    return html`<span part="avatar">${
      showImage
        ? html`<img part="image" src=${this.src} alt="" @error=${() => {
            this._failed = true;
          }} />`
        : html`<span part="initials" aria-hidden="true">${this.initials}</span>`
    }</span>`;
  }
}
