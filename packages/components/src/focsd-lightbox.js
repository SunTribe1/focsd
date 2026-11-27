import { css } from 'lit';
import { FocsdLightboxBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';

/** Thumbnail styles for the author's light-DOM markup, layered and at zero specificity so any app rule wins. */
const THUMB_CSS = `@layer focsd.lightbox {
  :where(focsd-lightbox) :where(figure) { margin: 0; display: grid; gap: var(--focsd-space-1, 0.25rem); align-content: start; }
  :where(focsd-lightbox) :where(figcaption) { font-size: var(--focsd-text-small-size, 0.875rem); color: var(--focsd-ink-muted, inherit); }
  :where(focsd-lightbox) :where(a:has(> img)) { display: block; inline-size: fit-content; line-height: 0; border-radius: var(--focsd-radius-control, 4px); }
  :where(focsd-lightbox) :where(a:has(> img) > img) { display: block; max-inline-size: 100%; block-size: auto; border-radius: inherit; }
}`;

/** @type {CSSStyleSheet | undefined} */
let thumbSheet;

/** @type {WeakSet<Node>} */
const styledRoots = new WeakSet();

/**
 * Adopt the thumbnail styles into the tree the element is in (the document or a shadow root).
 * @param {Node} root
 */
function adoptThumbStyles(root) {
  if (typeof CSSStyleSheet === 'undefined' || !('adoptedStyleSheets' in root) || styledRoots.has(root)) return;
  thumbSheet ??= new CSSStyleSheet();

  if (!thumbSheet.cssRules.length) thumbSheet.replaceSync(THUMB_CSS);
  const target = /** @type {Document | ShadowRoot} */ (root);
  target.adoptedStyleSheets = [...target.adoptedStyleSheets, thumbSheet];
  styledRoots.add(root);
}

/**
 * Thumbnails are block links sized to their image, so the focus ring wraps the picture; figures
 * lose the browser's default margins. These page styles are layered and overridable.
 * @cssprop --focsd-lightbox-max-inline-size - The viewer's widest size (default `64rem`).
 * @cssprop --focsd-lightbox-image-max-block-size - The tallest the image grows (default `75dvh`).
 */
export class FocsdLightbox extends FocsdLightboxBase {
  /** @override */
  connectedCallback() {
    super.connectedCallback();
    adoptThumbStyles(this.getRootNode());
  }

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdLightboxBase.styles,
    hostStyles,
    enterMotion("[part~='dialog'][open]", { from: 'none', duration: 'slow' }),
    enterMotion("[part~='dialog'][open]::backdrop", { from: 'none', duration: 'slow' }),
    enterMotion("[part~='image']", { from: 'none' }),
    css`
      :host {
        display: block;
      }
      [part~='thumbs'] ::slotted(*) {
        cursor: zoom-in;
      }
      [part~='dialog'] {
        box-sizing: border-box;
        inline-size: min(var(--focsd-lightbox-max-inline-size, 64rem), 100% - 2 * var(--focsd-space-4));
        max-block-size: calc(100% - 2 * var(--focsd-space-4));
        padding: var(--focsd-space-4);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface-raised);
        color: var(--focsd-ink);
        box-shadow: var(--focsd-shadow-overlay);
        font-family: var(--focsd-font-sans);
        font-size: var(--focsd-text-body-size);
      }
      [part~='dialog'][open] {
        display: grid;
        gap: var(--focsd-space-3);
      }
      [part~='dialog']::backdrop {
        background: var(--focsd-scrim);
      }
      [part~='figure'] {
        display: grid;
        justify-items: center;
        gap: var(--focsd-space-2);
        margin: 0;
        touch-action: pan-y pinch-zoom;
      }
      [part~='image'] {
        display: block;
        max-inline-size: 100%;
        max-block-size: var(--focsd-lightbox-image-max-block-size, 75dvh);
        object-fit: contain;
        border-radius: var(--focsd-radius-control);
        user-select: none;
      }
      [part~='caption'] {
        text-align: center;
      }
      [part~='counter'] {
        margin: 0;
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-small-size);
        font-variant-numeric: tabular-nums;
      }
      [part~='controls'] {
        display: flex;
        justify-content: center;
        gap: var(--focsd-space-3);
      }
      [part~='button'] {
        display: inline-grid;
        place-items: center;
        min-inline-size: 2.75rem;
        min-block-size: 2.75rem;
        padding: 0;
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        cursor: pointer;
      }
      [part~='button']:hover {
        background: var(--focsd-surface-sunk);
      }
      [part~='button']:focus-visible {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='close'] {
        margin-inline-start: auto;
      }
      :host(:dir(rtl)) [part~='prev'] svg,
      :host(:dir(rtl)) [part~='next'] svg {
        transform: scaleX(-1);
      }
      @media (forced-colors: active) {
        [part~='dialog'] {
          border-color: CanvasText;
        }
        [part~='button'] {
          border-color: ButtonText;
        }
      }
    `,
  ];
}

defineElement('focsd-lightbox', FocsdLightbox);
