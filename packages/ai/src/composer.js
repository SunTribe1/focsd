import { css, html, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { FocsdElement, iconSvg } from '@focsd/primitives';
import { defineElement, uid } from '@focsd/primitives/internal';
import { acceptsFile, announce } from '@focsd/primitives/utils';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { inputIcon } from './input-icons.js';
import './attachment-tile.js';
import './terms.js';

/** How many files may be attached when `max-files` is not set (or not a count). */
const DEFAULT_MAX_FILES = 10;

/** The IME's keyCode while it composes (some engines report it without `isComposing`). */
const IME_KEY_CODE = 229;

/**
 * `detail` of `focsd-submit`: the text and the attached files.
 * @typedef {{ text: string, files: File[] }} ComposerSubmitDetail
 */

/**
 * Composer: the message field of a chat. A native `<textarea>` that grows to eight lines; Enter
 * sends, Shift+Enter adds a newline, and nothing is sent while an input method is composing.
 * Files are attached with the attach button, by pasting or by dropping them anywhere on the
 * composer; each is checked against `accept`, `max-files` and `max-file-size`, and a rejected
 * file is announced with its reason. While `busy`, the send button becomes Stop in the same place
 * and keeps focus.
 *
 * @fires input - The text changed while the person types (the textarea's native event).
 * @fires {CustomEvent<ComposerSubmitDetail>} focsd-submit - The person sent a message. `detail` has `text` and `files`. Cancel it to keep the text and files in the composer.
 * @fires focsd-stop - The person pressed Stop while `busy`.
 * @csspart field - The whole composer; it accepts dropped files (`dragging` while files are dragged over it).
 * @csspart dragging - Added to the field while files are dragged over it.
 * @csspart drop-text - The "Drop files to attach" text shown while dragging.
 * @csspart attachments - The list of attached files.
 * @csspart error - Why the last files were not attached.
 * @csspart textarea - The textarea.
 * @csspart attach - The attach button.
 * @csspart send - The send button.
 * @csspart stop - The same button while `busy`.
 * @csspart icon - The icons in the buttons.
 */
export class FocsdComposer extends FocsdElement {
  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      /* Compact: the buttons and the one-line field follow the density's control height (32, 36 or 44 px). */
      :host { display: block; --_target: var(--focsd-control-height, 36px); }
      [part~='field'] {
        position: relative;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: end;
        gap: var(--focsd-space-1);
        padding: var(--focsd-space-1);
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
      }
      /* The ring goes on the whole field, around the textarea and its buttons. */
      [part~='field']:has(textarea:focus-visible) { box-shadow: var(--focsd-focus-ring); }
      [part~='dragging'] { outline: 2px dashed var(--focsd-action); outline-offset: 2px; background: var(--focsd-surface-sunk); }
      [part~='attachments'], [part~='error'] { grid-column: 1 / -1; }
      /* Fixed columns, so hiding the attach button (::part(attach)) leaves the text in the wide column. */
      [part~='attach'] { grid-column: 1; }
      [part~='textarea'] { grid-column: 2; }
      [part~='send'], [part~='stop'] { grid-column: 3; }
      [part~='attachments'] { display: flex; flex-wrap: wrap; gap: var(--focsd-space-2); margin: 0; padding: 0; }
      [part~='error'] { margin: 0; color: var(--focsd-critical); font-size: var(--focsd-text-small-size); }
      [part~='textarea'] {
        box-sizing: border-box;
        inline-size: 100%;
        min-block-size: var(--_target);
        max-block-size: calc(8lh + 2 * var(--focsd-space-2));
        field-sizing: content;
        overflow-y: auto;
        resize: none;
        margin: 0;
        /* One line of text is exactly as tall as the buttons beside it. */
        padding: max(0px, (var(--_target) - 1lh) / 2) var(--focsd-space-2);
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: inherit;
        font: inherit;
        line-height: var(--focsd-text-body-line-height, 1.5);
      }
      [part~='textarea']:focus-visible { outline: none; box-shadow: none; }
      [part~='textarea']::placeholder { color: var(--focsd-ink-muted); opacity: 1; }
      [part~='attach'], [part~='send'], [part~='stop'] {
        display: inline-grid;
        place-items: center;
        inline-size: var(--_target);
        block-size: var(--_target);
        padding: 0;
        border: var(--focsd-border-width) solid transparent;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink);
        font: inherit;
        font-size: 1rem;
        cursor: pointer;
      }
      [part~='attach']:hover { background: var(--focsd-surface-sunk); }
      [part~='send'], [part~='stop'] { background: var(--focsd-action); color: var(--focsd-action-ink, var(--focsd-surface)); }
      [part~='send'][aria-disabled='true'] { background: var(--focsd-surface-sunk); color: var(--focsd-ink-muted); cursor: default; }
      button:disabled { cursor: not-allowed; opacity: 0.6; }
      [part~='drop-text'] {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        border-radius: inherit;
        background: var(--focsd-surface-sunk);
        color: var(--focsd-ink);
        font-weight: var(--focsd-text-label-weight);
        pointer-events: none;
      }
      @media (forced-colors: active) {
        [part~='field'] { border-color: CanvasText; }
        [part~='field']:has(textarea:focus-visible) { outline: 3px solid Highlight; outline-offset: 2px; }
        [part~='dragging'] { outline-color: Highlight; }
        [part~='send'], [part~='stop'] { border-color: ButtonText; }
        [part~='send'][aria-disabled='true'] { color: GrayText; border-color: GrayText; }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: {},
    placeholder: {},
    label: {},
    busy: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    accept: {},
    maxFiles: { type: Number, attribute: 'max-files' },
    maxFileSize: { type: Number, attribute: 'max-file-size' },
    _files: { state: true },
    _error: { state: true },
    _dragging: { state: true },
  };

  #ids = { textarea: uid('focsd-composer-text'), error: uid('focsd-composer-error') };

  /** Nested dragenter/dragleave pairs while files are over the composer. */
  #dragDepth = 0;

  constructor() {
    super();
    /** The text in the field. */
    this.value = '';
    /** The placeholder text. */
    this.placeholder = '';
    /** The field's accessible name; defaults to "Message". */
    this.label = '';
    /** A response is streaming: the send button becomes Stop and Enter does not send. */
    this.busy = false;
    /** Disables the field and its buttons. */
    this.disabled = false;
    /** The file types accepted, as on `<input type="file" accept>`; empty accepts all. */
    this.accept = '';
    /** The most files that can be attached (a value that is not a count means the default, 10). */
    // A literal, so the manifest and the docs show the default (it equals DEFAULT_MAX_FILES).
    this.maxFiles = 10;
    /** The largest file accepted, in bytes; 0 means no limit. */
    this.maxFileSize = 0;
    /** @type {readonly File[]} */
    this._files = [];
    this._error = '';
    this._dragging = false;
  }

  /**
   * The attached files (a copy).
   * @returns {File[]}
   */
  get files() {
    return [...this._files];
  }

  /**
   * Focus the textarea (not the first button, as delegated focus would).
   * @override
   * @param {FocusOptions} [options]
   */
  focus(options) {
    const t = this.#textarea;

    if (t) t.focus(options);
    else super.focus(options);
  }

  /** @returns {HTMLTextAreaElement | null} */
  get #textarea() {
    return this.renderRoot.querySelector('textarea');
  }

  /**
   * Check and attach files. Rejected files are not added; their names and reasons are announced
   * and shown. Does nothing while disabled.
   * @param {Iterable<File>} list
   */
  addFiles(list) {
    if (this.disabled) return;

    // Local lists, built here and then swapped in as new state.
    /** @type {File[]} */
    const accepted = [];
    /** @type {string[]} */
    const rejected = [];

    for (const file of list) {
      const reason = this.#rejection(file, this._files.length + accepted.length);

      if (reason) rejected.push(this.localize.term('ai.fileRejected', file.name, reason));
      else accepted.push(file);
    }

    this._files = [...this._files, ...accepted];
    this._error = rejected.join(' ');

    if (this._error) announce(this._error, { politeness: 'assertive', from: this });
  }

  /**
   * Why `file` cannot be attached when `count` files already are, or '' when it can.
   * @param {File} file
   * @param {number} count
   */
  #rejection(file, count) {
    // A value that is not a count (`max-files="abc"` is NaN) would remove the limit: use the default.
    const max = Number.isInteger(this.maxFiles) && this.maxFiles >= 0 ? this.maxFiles : DEFAULT_MAX_FILES;

    if (count >= max) return this.localize.term('ai.tooManyFiles', max);

    if (!acceptsFile(this.accept, file)) return this.localize.term('ai.fileWrongType');

    if (this.maxFileSize > 0 && file.size > this.maxFileSize) return this.localize.term('ai.fileTooLarge');

    return '';
  }

  get #canSend() {
    return !this.disabled && !this.busy && (this.value.trim() !== '' || this._files.length > 0);
  }

  #send() {
    if (!this.#canSend) return;

    /** @type {CustomEvent<ComposerSubmitDetail>} */
    const event = new CustomEvent('focsd-submit', {
      bubbles: true,
      cancelable: true,
      detail: { text: this.value, files: [...this._files] },
    });

    if (!this.dispatchEvent(event)) return;
    this.value = '';
    this._files = [];
    this._error = '';
  }

  #onButton = () => {
    if (this.busy) this.dispatchEvent(new Event('focsd-stop', { bubbles: true }));
    else this.#send();
  };

  #onInput = (/** @type {InputEvent} */ event) => {
    this.value = /** @type {HTMLTextAreaElement} */ (event.target).value;
    this.#grow();
  };

  #onKeydown = (/** @type {KeyboardEvent} */ event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === IME_KEY_CODE) return;
    event.preventDefault();
    this.#send();
  };

  // Files are attached; text that came with them pastes as usual. A file copied in a file manager
  // also puts its name on the clipboard as text, so text that is only the file names is not pasted.
  #onPaste = (/** @type {ClipboardEvent} */ event) => {
    const files = [...(event.clipboardData?.files ?? [])];

    if (!files.length) return;
    const text = (event.clipboardData?.getData('text/plain') ?? '').trim();
    const names = new Set(files.map((file) => file.name));

    if (!text || text.split(/\r?\n/).every((line) => names.has(line.trim()))) event.preventDefault();
    this.addFiles(files);
  };

  #onAttach = () => this.renderRoot.querySelector('input')?.click();

  #onPick = (/** @type {Event} */ event) => {
    const input = /** @type {HTMLInputElement} */ (event.target);
    this.addFiles([...(input.files ?? [])]);
    input.value = '';
  };

  /** @param {DragEvent} event */
  #hasFiles(event) {
    return !this.disabled && [...(event.dataTransfer?.types ?? [])].includes('Files');
  }

  #onDragEnter = (/** @type {DragEvent} */ event) => {
    if (!this.#hasFiles(event)) return;
    event.preventDefault();
    this.#dragDepth += 1;
    this._dragging = true;
  };

  #onDragOver = (/** @type {DragEvent} */ event) => {
    if (this.#hasFiles(event)) event.preventDefault();
  };

  #onDragLeave = () => {
    this.#dragDepth = Math.max(0, this.#dragDepth - 1);

    if (!this.#dragDepth) this._dragging = false;
  };

  #onDrop = (/** @type {DragEvent} */ event) => {
    this.#dragDepth = 0;
    this._dragging = false;

    if (!this.#hasFiles(event)) return;
    event.preventDefault();
    this.addFiles([...(event.dataTransfer?.files ?? [])]);
  };

  /** @param {File} file */
  #remove(file) {
    this._files = this._files.filter((f) => f !== file);
    this.#textarea?.focus();
  }

  /** Grows the textarea where CSS `field-sizing` is missing; the CSS max-block-size caps it at eight lines. */
  #grow() {
    const t = this.#textarea;

    if (!t || globalThis.CSS?.supports?.('field-sizing', 'content')) return;
    t.style.blockSize = 'auto';
    t.style.blockSize = `${t.scrollHeight + t.offsetHeight - t.clientHeight}px`;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('value')) this.#grow();
  }

  #renderButton() {
    const stop = this.busy;
    const empty = !stop && !this.#canSend;

    return html`<button
      part=${stop ? 'stop' : 'send'}
      type="button"
      aria-label=${this.localize.term(stop ? 'ai.stop' : 'ai.send')}
      aria-disabled=${empty && !this.disabled ? 'true' : nothing}
      ?disabled=${this.disabled}
      @click=${this.#onButton}
    >${stop ? inputIcon('stop') : iconSvg('arrow-up', 'icon')}</button>`;
  }

  /** @override */
  render() {
    return html`<div
      part="field${this._dragging ? ' dragging' : ''}"
      @dragenter=${this.#onDragEnter}
      @dragover=${this.#onDragOver}
      @dragleave=${this.#onDragLeave}
      @drop=${this.#onDrop}
    >
      ${
        this._files.length
          ? html`<div part="attachments" role="list" aria-label=${this.localize.term('ai.attachments')}>
            ${this._files.map(
              (file) =>
                html`<focsd-attachment-tile .file=${file} removable @focsd-attachment-remove=${() => this.#remove(file)}></focsd-attachment-tile>`,
            )}
          </div>`
          : nothing
      }
      ${this._error ? html`<p part="error" id=${this.#ids.error}>${this._error}</p>` : nothing}
      <button part="attach" type="button" aria-label=${this.localize.term('ai.attach')} ?disabled=${this.disabled} @click=${this.#onAttach}>${inputIcon('attach')}</button>
      <input type="file" hidden tabindex="-1" aria-hidden="true" multiple accept=${this.accept || nothing} @change=${this.#onPick} />
      <label class="focsd-visually-hidden" for=${this.#ids.textarea}>${this.label || this.localize.term('ai.message')}</label>
      <textarea
        part="textarea"
        id=${this.#ids.textarea}
        rows="1"
        placeholder=${this.placeholder || nothing}
        aria-describedby=${this._error ? this.#ids.error : nothing}
        ?disabled=${this.disabled}
        .value=${live(this.value)}
        @input=${this.#onInput}
        @keydown=${this.#onKeydown}
        @paste=${this.#onPaste}
      ></textarea>
      ${this.#renderButton()}
      ${this._dragging ? html`<span part="drop-text">${this.localize.term('ai.dropFiles')}</span>` : nothing}
    </div>`;
  }
}

defineElement('focsd-composer', FocsdComposer);
