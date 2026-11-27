import { html, nothing } from 'lit';
import { cssomStyle } from '../internal/style.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';
import { warnOnce } from '../internal/warn.js';

/**
 * Image with an aspect-ratio frame; a named fallback on error (hidden when decorative).
 *
 * @csspart fallback - Shown in place of the image when it fails to load.
 * @csspart frame - The box that holds the image and keeps its aspect ratio.
 * @csspart image - The image element.
 */
export class FocsdImageBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    src: {},
    alt: {},
    ratio: {},
    fit: { reflect: true },
    srcset: {},
    sizes: {},
    width: { type: Number },
    height: { type: Number },
    loading: {},
    decoding: {},
    fetchPriority: { attribute: 'fetchpriority' },
    crossOrigin: { attribute: 'crossorigin' },
    referrerPolicy: { attribute: 'referrerpolicy' },
    _failed: { state: true },
  };

  constructor() {
    super();
    /** The image URL. */
    this.src = '';
    /** @type {string | null} The text alternative; an empty string makes the image decorative. */
    this.alt = null;
    /** The aspect ratio of the frame, such as `16 / 9`; defaults to `width` / `height`. */
    this.ratio = '';
    /** @type {'cover' | 'contain'} How the image fills the frame: `cover` crops, `contain` letterboxes. */
    this.fit = 'cover';
    /** Candidate image URLs, as on `<img srcset>`. */
    this.srcset = '';
    /** The image's display sizes for `srcset`, as on `<img sizes>`. */
    this.sizes = '';
    /** @type {number | null | undefined} The image's width in pixels; with `height`, it reserves space before the image loads. */
    this.width = undefined;
    /** @type {number | null | undefined} The image's height in pixels; with `width`, it reserves space before the image loads. */
    this.height = undefined;
    /** @type {'lazy' | 'eager'} When the image loads, as on `<img loading>`. */
    this.loading = 'lazy';
    /** @type {'async' | 'sync' | 'auto'} How the image is decoded, as on `<img decoding>`. */
    this.decoding = 'async';
    /** The fetch priority (`high`, `low` or `auto`), as on `<img fetchpriority>`. */
    this.fetchPriority = '';
    /** @type {string | null} The CORS mode, as on `<img crossorigin>`. */
    this.crossOrigin = null;
    /** The referrer policy, as on `<img referrerpolicy>`. */
    this.referrerPolicy = '';
    this._failed = false;
  }

  get #img() {
    return this.renderRoot?.querySelector('img') ?? null;
  }

  /** True once the image has loaded or failed (or there is nothing to load), like native. */
  get complete() {
    return this.#img?.complete ?? true;
  }

  /** The image's intrinsic width in pixels, as on `<img>`. */
  get naturalWidth() {
    return this.#img?.naturalWidth ?? 0;
  }

  /** The image's intrinsic height in pixels, as on `<img>`. */
  get naturalHeight() {
    return this.#img?.naturalHeight ?? 0;
  }

  /** The URL of the image shown, as on `<img>`. */
  get currentSrc() {
    return this.#img?.currentSrc ?? '';
  }

  /** Resolves when the image is decoded and ready to paint; rejects when it cannot be. */
  async decode() {
    await this.updateComplete;
    const img = this.#img;
    const failed = () => new DOMException('The image has no source or failed to load.', 'EncodingError');

    if (!img) throw failed();

    // Firefox rejects decode() on an image that has not loaded yet (lazy loading): wait for it.
    if (!img.complete) {
      await new Promise((resolve, reject) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', () => reject(failed()), { once: true });
      });
    }

    return img.decode();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (changed.has('src') || changed.has('srcset')) this._failed = false;
  }

  /** `ratio`, else the intrinsic ratio from `width` and `height` (reserves space before load). */
  get #ratio() {
    if (this.ratio) return this.ratio;
    // Unset (null or undefined) compares as not > 0, as intended.
    const width = /** @type {number} */ (this.width);
    const height = /** @type {number} */ (this.height);

    return width > 0 && height > 0 ? `${width} / ${height}` : '';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    // A missing alt is a mistake (an empty alt="" marks a decorative image): say so once.
    if (!this.hasAttribute('alt')) warnOnce('image:alt', '<focsd-image> needs alt text, or alt="" for a decorative image.', this);
  }

  /** @override */
  render() {
    const alt = this.alt ?? '';
    const ratio = this.#ratio;

    return html`<div part="frame" style=${cssomStyle({ 'aspect-ratio': ratio || undefined })}>${
      this._failed || !(this.src || this.srcset)
        ? html`<div part="fallback" role=${alt ? 'img' : nothing} aria-label=${alt || nothing} aria-hidden=${alt ? nothing : 'true'}>${iconSvg('alert-triangle')}</div>`
        : html`<img
            part="image"
            src=${this.src || nothing}
            srcset=${this.srcset || nothing}
            sizes=${this.sizes || nothing}
            width=${this.width ?? nothing}
            height=${this.height ?? nothing}
            alt=${alt}
            loading=${this.loading || 'lazy'}
            decoding=${this.decoding || 'async'}
            fetchpriority=${this.fetchPriority || nothing}
            crossorigin=${this.crossOrigin ?? nothing}
            referrerpolicy=${this.referrerPolicy || nothing}
            @error=${() => {
              this._failed = true;
            }}
          />`
    }</div>`;
  }
}
