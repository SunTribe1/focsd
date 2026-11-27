import { html, nothing } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { announce } from '../internal/announce.js';
import { deepActiveElement } from '../internal/focus.js';
import { uid } from '../internal/id.js';
import { iconSvg } from '../internal/icons.js';
import { warnOnce } from '../internal/warn.js';

/**
 * @typedef {{ index: number }} LightboxIndexChangeDetail
 * @typedef {{ link: HTMLAnchorElement, href: string, alt: string, caption: string }} LightboxItem
 */

/** Pixels a pointer must travel sideways, more than it travels up or down, to count as a swipe. */
const SWIPE_THRESHOLD = 40;

/**
 * +1 (next), -1 (previous) or 0 for a pointer that moved `dx`, `dy`. A swipe to the left shows the
 * next image (to the right under RTL).
 * @param {number} dx
 * @param {number} dy
 * @param {boolean} rtl
 * @returns {-1 | 0 | 1}
 */
export function swipeStep(dx, dy, rtl) {
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return 0;

  return dx < 0 !== rtl ? 1 : -1;
}

/**
 * The index after a key press in the viewer (wrapping), or null for a key it does not use.
 * @param {number} index
 * @param {string} key
 * @param {number} count
 * @param {boolean} rtl Left and Right swap under RTL.
 * @returns {number | null}
 */
export function lightboxIndexForKey(index, key, count, rtl) {
  if (count < 1) return null;

  /** @type {Record<string, number>} */
  const moves = {
    Home: 0,
    End: count - 1,
    ArrowRight: index + (rtl ? -1 : 1),
    ArrowLeft: index + (rtl ? 1 : -1),
  };

  const move = moves[key];

  return move === undefined ? null : ((move % count) + count) % count;
}

/**
 * The image links in `host`, in document order: each link that holds an `img` or a `focsd-image`.
 * The caption is the `figcaption` of the figure around the link, else the image's alt.
 * @param {Element} host
 * @returns {LightboxItem[]}
 */
export function lightboxItems(host) {
  // The server DOM shim has no light DOM to read.
  return [...(host.querySelectorAll?.('a[href]') ?? [])].flatMap((link) => {
    const image = link.querySelector('img, focsd-image');

    if (!image) return [];
    const alt = image.getAttribute('alt') ?? '';
    const figure = link.closest('figure');
    const caption = (figure && host.contains(figure) && figure.querySelector('figcaption')?.textContent?.trim()) || alt;

    return [{ link: /** @type {HTMLAnchorElement} */ (link), href: /** @type {HTMLAnchorElement} */ (link).href, alt, caption }];
  });
}

/**
 * Image viewer: thumbnails stay in the page as plain links (they work without JavaScript); a click
 * opens the full image in a native modal `<dialog>` (inert background, Escape closes, focus returns
 * to the thumbnail). Left/Right (mirrored in RTL), Home/End, swipe and the Previous/Next buttons move
 * between images, each change announced politely ("Image 3 of 8, caption").
 *
 * @fires close - Fired after the viewer closes.
 * @fires {CustomEvent<LightboxIndexChangeDetail>} focsd-index-change - Fired when the person moves to another image.
 * @slot - The thumbnails: links to the full images (`<a href><img alt></a>`, optionally in a `figure` with a `figcaption`).
 * @csspart thumbs - The wrapper of the thumbnails.
 * @csspart dialog - The viewer dialog.
 * @csspart figure - The figure that holds the image and its caption.
 * @csspart image - The full image.
 * @csspart caption - The caption (the `figcaption`, else the alt).
 * @csspart counter - "Image 3 of 8".
 * @csspart controls - The row of buttons.
 * @csspart button - Each button.
 * @csspart prev - The previous image button.
 * @csspart next - The next image button.
 * @csspart close - The close button.
 */
export class FocsdLightboxBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    open: { type: Boolean, reflect: true },
    index: { type: Number },
    label: {},
  };

  #captionId = uid('focsd-lightbox-caption');

  /** @type {HTMLElement | null} */
  #opener = null;

  /** @type {{ x: number, y: number } | null} */
  #press = null;

  constructor() {
    super();
    /** Whether the viewer is open. */
    this.open = false;
    /** The image shown, from 0. */
    this.index = 0;
    /** The viewer's accessible name (default "Image viewer"). */
    this.label = '';
    this.addEventListener('click', this.#onThumbClick);
  }

  /**
   * The images, in order: each link in the lightbox that holds an image, with its full `href`, alt and caption.
   * @returns {LightboxItem[]}
   */
  get items() {
    return lightboxItems(this);
  }

  get #dialog() {
    return /** @type {HTMLDialogElement | null} */ (this.renderRoot?.querySelector('dialog'));
  }

  get #current() {
    const items = this.items;

    return items.length ? Math.min(Math.max(0, Math.trunc(Number(this.index)) || 0), items.length - 1) : 0;
  }

  /**
   * Open the viewer at `index` (default: the current one). Focus returns to `opener` on close
   * (default: that image's thumbnail).
   * @param {number} [index]
   * @param {HTMLElement} [opener]
   */
  show(index = this.index, opener) {
    this.index = index;
    this.#opener = opener ?? this.items[this.#current]?.link ?? deepActiveElement();
    this.open = true;
  }

  /** Close the viewer. */
  close() {
    this.open = false;
  }

  /** Show the next image (wraps). */
  next() {
    this.#go(this.#current + 1);
  }

  /** Show the previous image (wraps). */
  previous() {
    this.#go(this.#current - 1);
  }

  /** @param {number} index */
  #go(index) {
    const items = this.items;

    if (!items.length) return;
    const next = ((index % items.length) + items.length) % items.length;

    if (next === this.#current) return;
    this.index = next;
    /** @type {LightboxIndexChangeDetail} */
    const detail = { index: next };
    this.dispatchEvent(new CustomEvent('focsd-index-change', { detail, bubbles: true }));
    const item = items[next];
    announce(`${this.localize.term('lightboxCounter', next + 1, items.length)}, ${item?.caption}`, { from: this.#dialog ?? this });
  }

  get #rtl() {
    return getComputedStyle(this).direction === 'rtl';
  }

  /** @param {MouseEvent} event */
  #onThumbClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const path = event.composedPath();
    const index = this.items.findIndex(({ link }) => path.includes(link));

    const link = this.items[index]?.link;

    if (!link) return;

    // A link meant to leave the page (a new tab, a download) keeps doing that.
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    event.preventDefault();
    this.show(index, link);
  };

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    // Alt+Left and Alt+Right are the browser's Back and Forward; Ctrl and Command chords are the browser's too.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = lightboxIndexForKey(this.#current, event.key, this.items.length, this.#rtl);

    if (next === null) return;
    event.preventDefault();
    this.#go(next);
  };

  /** @param {PointerEvent} event */
  #onPointerDown = (event) => {
    this.#press = event.isPrimary ? { x: event.clientX, y: event.clientY } : null;
  };

  /** @param {PointerEvent} event */
  #onPointerUp = (event) => {
    const press = this.#press;
    this.#press = null;

    if (!press) return;
    const step = swipeStep(event.clientX - press.x, event.clientY - press.y, this.#rtl);

    if (step) this.#go(this.#current + step);
  };

  #onNativeClose = () => {
    this.open = false;
    const opener = this.#opener;
    this.#opener = null;
    const active = deepActiveElement();

    if (opener?.isConnected && (!active || active === document.body || this.renderRoot.contains(active))) opener.focus();
    this.dispatchEvent(new Event('close'));
  };

  /** Fetch the neighbors of the image shown, so Next and Previous show at once. */
  #preload() {
    const items = this.items;

    if (items.length < 2) return;

    for (const step of [-1, 1])
      new Image().src = /** @type {LightboxItem} */ (items[(this.#current + step + items.length) % items.length]).href;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    const dialog = this.#dialog;

    if (changed.has('open') && dialog) {
      if (this.open && !dialog.open) {
        this.#opener ??= deepActiveElement();
        dialog.showModal();
        /** @type {HTMLElement | null} */ (
          this.renderRoot.querySelector(this.items.length > 1 ? '[part~="next"]' : '[part~="close"]')
        )?.focus();
      } else if (!this.open && dialog.open) dialog.close();
    }

    if (this.open && (changed.has('open') || changed.has('index'))) this.#preload();
  }

  #onSlotChange = () => {
    for (const { alt, link } of this.items)
      if (!alt) warnOnce(`lightbox:alt:${link.href}`, 'give each image in focsd-lightbox an alt.', link);
    this.requestUpdate();
  };

  #renderImage() {
    if (!this.open) return nothing;
    const items = this.items;
    const item = items[this.#current];

    if (!item) return nothing;

    return html`${keyed(this.#current, html`<img part="image" src=${item.href} alt=${item.alt} draggable="false" />`)}
      <figcaption part="caption" id=${`${this.#captionId}-caption`}>${item.caption}</figcaption>
      <p part="counter" id=${`${this.#captionId}-counter`}>${this.localize.term('lightboxCounter', this.#current + 1, items.length)}</p>`;
  }

  /** @override */
  render() {
    const term = this.localize.term.bind(this.localize);

    return html`<div part="thumbs"><slot @slotchange=${this.#onSlotChange}></slot></div>
      <dialog
        part="dialog"
        aria-label=${this.label || term('lightbox')}
        aria-describedby=${`${this.#captionId}-counter ${this.#captionId}-caption`}
        @keydown=${this.#onKeyDown}
        @close=${this.#onNativeClose}
      >
        <figure part="figure" @pointerdown=${this.#onPointerDown} @pointerup=${this.#onPointerUp} @pointercancel=${() => (this.#press = null)}>
          ${this.#renderImage()}
        </figure>
        <div part="controls">
          <button part="button prev" type="button" aria-label=${term('previousImage')} @click=${() => this.previous()}>${iconSvg('chevron-left')}</button>
          <button part="button next" type="button" aria-label=${term('nextImage')} @click=${() => this.next()}>${iconSvg('chevron-right')}</button>
          <button part="button close" type="button" aria-label=${term('closeViewer')} @click=${() => this.close()}>${iconSvg('x')}</button>
        </div>
      </dialog>`;
  }
}
