import { css, html, nothing } from 'lit';
import { FocsdElement, iconSvg } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { formatBytes } from '@focsd/primitives/utils';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { inputIcon } from './input-icons.js';
import './terms.js';

/**
 * `detail` of `focsd-attachment-remove`: the removed file's name.
 * @typedef {{ name: string }} AttachmentRemoveDetail
 */

/** @typedef {'ready' | 'uploading' | 'error'} AttachmentStatus */

/** The status words, by status; `ready` shows none. */
const STATUS_TERMS = Object.freeze({ uploading: 'ai.uploading', error: 'ai.uploadFailed' });

/**
 * Attachment tile: one attached file as a list item, with its name, its size and an icon for its
 * type. Set `file`, or `name`, `size` and `media-type`. A removable tile has a "Remove {name}"
 * button. Put tiles in an element with `role="list"`.
 *
 * @fires {CustomEvent<AttachmentRemoveDetail>} focsd-attachment-remove - The remove button was pressed. `detail` has `name`.
 * @csspart tile - The tile.
 * @csspart icon - The type icon.
 * @csspart name - The file name.
 * @csspart size - The file size.
 * @csspart status - The "Uploading" or "Upload failed" word.
 * @csspart remove - The remove button.
 */
export class FocsdAttachmentTile extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host { display: inline-block; max-inline-size: 100%; }
      [part~='tile'] {
        display: flex; align-items: center; gap: var(--focsd-space-2);
        min-block-size: 44px; padding-inline: var(--focsd-space-3) var(--focsd-space-2);
        border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface-raised, var(--focsd-surface));
      }
      :host([status='error']) [part~='tile'] { border-color: var(--focsd-critical); }
      /* The file icon sits on the text's center line. */
      [data-kind] { flex: none; display: inline-grid; place-items: center; line-height: 0; color: var(--focsd-ink-muted); }
      [data-kind] svg { display: block; }
      [part~='name'] { min-inline-size: 0; overflow-wrap: anywhere; }
      [part~='size'], [part~='status'] { flex: none; color: var(--focsd-ink-muted); font-size: var(--focsd-text-label-size); }
      [part~='size'] { font-family: var(--focsd-font-mono); }
      :host([status='error']) [part~='status'] { color: var(--focsd-critical); }
      /* A compact button (28px, above the 24px minimum target) with a hover tint that fits inside the tile. */
      [part~='remove'] {
        display: inline-grid; place-items: center; flex: none;
        inline-size: 28px; block-size: 28px; padding: 0;
        border: 0; border-radius: var(--focsd-radius-control);
        background: transparent; color: var(--focsd-ink); font: inherit; cursor: pointer;
      }
      [part~='remove']:hover { background: var(--focsd-surface-sunk); }
      @media (forced-colors: active) {
        [part~='tile'] { border-color: CanvasText; }
        :host([status='error']) [part~='tile'] { border-style: dashed; }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    file: { attribute: false },
    name: {},
    size: { type: Number },
    mediaType: { attribute: 'media-type' },
    removable: { type: Boolean, reflect: true },
    status: { reflect: true },
  };

  constructor() {
    super();
    /** @type {File | null} The file shown; when set, its name, size and type win. */
    this.file = null;
    /** The file name. */
    this.name = '';
    /** The size in bytes; hidden when not a number. */
    this.size = Number.NaN;
    /** The media type (`image/png`), for the icon. */
    this.mediaType = '';
    /** Shows a "Remove {name}" button. */
    this.removable = false;
    /** @type {AttachmentStatus} `ready`, `uploading` or `error`. */
    this.status = 'ready';
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
  }

  /** The shown name, size and type: the file's when there is one. */
  get #shown() {
    const file = this.file;

    return file ? { name: file.name, size: file.size, type: file.type } : { name: this.name, size: this.size, type: this.mediaType };
  }

  #remove = () => {
    /** @type {CustomEvent<AttachmentRemoveDetail>} */
    const event = new CustomEvent('focsd-attachment-remove', { bubbles: true, detail: { name: this.#shown.name } });
    this.dispatchEvent(event);
  };

  /** @override */
  render() {
    const { name, size, type } = this.#shown;
    const kind = (type ?? '').toLowerCase().startsWith('image/') ? 'image' : 'file';
    const statusTerm = Object.hasOwn(STATUS_TERMS, this.status) ? STATUS_TERMS[/** @type {'uploading' | 'error'} */ (this.status)] : '';

    return html`<div part="tile">
      <span data-kind=${kind}>${inputIcon(kind)}</span>
      <span part="name">${name}</span>
      ${Number.isFinite(size) ? html`<span part="size">${formatBytes(size)}</span>` : nothing}
      ${statusTerm ? html`<span part="status">${this.localize.term(statusTerm)}</span>` : nothing}
      ${
        this.removable
          ? html`<button part="remove" type="button" aria-label=${this.localize.term('ai.removeFile', name)} @click=${this.#remove}>${iconSvg('x', 'remove-icon')}</button>`
          : nothing
      }
    </div>`;
  }
}

defineElement('focsd-attachment-tile', FocsdAttachmentTile);
