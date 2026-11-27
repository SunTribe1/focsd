import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { iconSvg } from '../internal/icons.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { acceptsFile, formatBytes } from '../internal/files.js';

/**
 * File upload. A visible "Choose files" button opens the native picker, so dragging is never
 * required (WCAG 2.5.7); the drop zone also accepts dropped files. Rejected files are reported
 * in a role=alert region; a polite status reports the count. Form: one entry per File.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 * @csspart dragging - Added to the drop zone while files are dragged over it.
 * @csspart drop-text - The "or drop files here" text.
 * @csspart dropzone - The area that accepts dropped files.
 * @csspart error - One rejected file and why; also matches the control's `error` message (use `rejection` for the file only).
 * @csspart errors - The list of rejected files and why.
 * @csspart file - One selected file.
 * @csspart file-name - A file's name.
 * @csspart file-size - A file's size.
 * @csspart files - The list of selected files.
 * @csspart group - The group element.
 * @csspart label - The label element.
 * @csspart layout - The wrapper that places the label beside or above the body.
 * @csspart body - The drop zone, file lists, hint and message.
 * @csspart hint - The author's hint.
 * @csspart message - The shown error, warning or success message (also `error`, `warning` or `success`).
 * @csspart message-icon - The message's icon.
 * @csspart announcer - The visually hidden status region.
 * @csspart rejection - One rejected file and why (never the control's `error` message).
 * @csspart remove - A file's remove button.
 * @csspart status - The status element.
 * @csspart trigger - The trigger element.
 */
export class FocsdFileUploadBase extends FormControlMixin(FocsdElement) {
  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    accept: {},
    multiple: { type: Boolean },
    maxSize: { type: Number, attribute: 'max-size' },
    capture: {},
    webkitdirectory: { type: Boolean },
    _files: { state: true },
    _errors: { state: true },
    _dragging: { state: true },
  };

  /** For subclasses: the IDs of the parts in the shadow root. */
  ids = { label: uid('focsd-file-label') };

  #touched = false;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The file types accepted, as on `<input type="file" accept>`. */
    this.accept = '';
    /** Accepts more than one file. */
    this.multiple = false;
    /** The largest file accepted, in bytes; 0 means no limit. */
    this.maxSize = 0;
    /** Preferred camera for media capture on mobile (`user` or `environment`). */
    this.capture = '';
    /** Pick a whole directory (supported in all current engines). */
    this.webkitdirectory = false;
    /** @type {File[]} */
    this._files = [];
    /** @type {string[]} */
    this._errors = [];
    this._dragging = false;
  }

  /** Open the native file picker from code, like native `showPicker()`. */
  showPicker() {
    if (this.isDisabled) throw new DOMException('The file upload is disabled.', 'InvalidStateError');

    // Browsers silently ignore a file picker opened without a user gesture; say so, like native.
    if (navigator.userActivation && !navigator.userActivation.isActive)
      throw new DOMException('showPicker() needs a user gesture.', 'NotAllowedError');
    /** @type {HTMLElement} */ (this.renderRoot.querySelector('input[type=file]')).click();
  }

  /**
   * The selected files (read-only copy).
   * @returns {File[]}
   */
  get files() {
    return [...this._files];
  }

  /** @returns {HTMLButtonElement | null} */
  get #trigger() {
    return this.renderRoot.querySelector('[part~="trigger"]');
  }

  /** @override */
  updated() {
    /** @type {FormData | null} */
    let data = null;

    if (this.name && this._files.length) {
      data = new FormData();
      this._files.forEach((f) => /** @type {FormData} */ (data).append(this.name, f));
    }

    this.internals.setFormValue(data);

    if (this.required && !this._files.length)
      this.setValidityState({ valueMissing: true }, this.localize.term('chooseFile'), this.#trigger);
    else this.setValidityState({});
  }

  formResetCallback() {
    this.#touched = false;
    this._files = [];
    this._errors = [];
  }

  /**
   * Validate and add files; rejected ones are reported, never added.
   * @param {Iterable<File>} list
   */
  addFiles(list) {
    if (this.isDisabled) return;
    /** @type {string[]} */
    const errors = [];
    /** @type {File[]} */
    const accepted = [];

    for (const file of list) {
      if (!acceptsFile(this.accept, file)) errors.push(this.localize.term('fileTypeRejected', file.name));
      else if (this.maxSize > 0 && file.size > this.maxSize)
        errors.push(this.localize.term('fileTooLarge', file.name, formatBytes(this.maxSize, this.localize.locale())));
      else accepted.push(file);
    }

    const same = (/** @type {File} */ a, /** @type {File} */ b) =>
      a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

    const merged = this.multiple
      ? [...this._files, ...accepted.filter((f) => !this._files.some((g) => same(f, g)))]
      : [...accepted.slice(0, 1), ...(accepted.length ? [] : this._files)];

    // One file at a time: say which extra files were left out rather than dropping them silently.
    if (!this.multiple && accepted.length > 1)
      errors.push(
        this.localize.term(
          'fileOnlyOne',
          accepted.slice(1).map((f) => f.name),
        ),
      );
    this._errors = errors;

    if (accepted.length) {
      this.#touched = true;
      this._files = merged;
      this.emitValue();
    }
  }

  /**
   * Remove a selected file and return focus to the choose button.
   * @param {File} file
   */
  removeFile(file) {
    if (this.isDisabled) return;
    this._files = this._files.filter((f) => f !== file);
    this._errors = [];
    this.emitValue();
    /** @type {HTMLElement} */ (this.#trigger)?.focus();
  }

  #onPick = (/** @type {Event} */ event) => {
    const input = /** @type {HTMLInputElement & { files: FileList }} */ (event.target);
    this.addFiles([...input.files]);
    input.value = '';
  };

  #onDragOver = (/** @type {DragEvent} */ event) => {
    event.preventDefault();

    if (this.isDisabled) return;
    this._dragging = true;
  };

  #onDrop = (/** @type {DragEvent} */ event) => {
    event.preventDefault();
    this._dragging = false;
    this.addFiles([...(event.dataTransfer?.files ?? [])]);
  };

  #status() {
    const n = this._files.length;

    if (!n) return this.#touched ? this.localize.term('noFilesSelected') : '';

    return this.localize.term('filesSelected', n);
  }

  /** @override */
  render() {
    const choose = this.localize.term(this.multiple ? 'chooseFilesButton' : 'chooseFileButton');

    const describedby = this.describedByIds().join(' ');

    return renderFieldLayout(
      this,
      html`<span part="label" id=${this.ids.label}>${this.label}</span>`,
      html`<div part="group" role="group" aria-labelledby=${this.ids.label} aria-describedby=${describedby || nothing}>
      <div
        part="dropzone ${this._dragging ? 'dragging' : ''}"
        @dragover=${this.#onDragOver}
        @dragleave=${() => {
          this._dragging = false;
        }}
        @drop=${this.#onDrop}
      >
        <button part="trigger" type="button" ?disabled=${this.isDisabled} @click=${() => this.showPicker()}>${iconSvg('upload', 'icon')}${choose}</button>
        <span part="drop-text">${this.localize.term(this.multiple ? 'dropFiles' : 'dropFile')}</span>
      </div>
      <input type="file" hidden tabindex="-1" aria-hidden="true" accept=${this.accept || nothing} capture=${this.capture || nothing} ?webkitdirectory=${this.webkitdirectory} ?multiple=${this.multiple} @change=${this.#onPick} />
      <div part="errors" role="alert">${this._errors.map((e) => html`<p part="error rejection">${e}</p>`)}</div>
      <ul part="files">${this._files.map(
        (f) => html`<li part="file">
        <span part="file-name">${f.name}</span>
        <span part="file-size">${formatBytes(f.size, this.localize.locale())}</span>
        <button part="remove" type="button" aria-label=${this.localize.term('removeItem', f.name)} ?disabled=${this.isDisabled} @click=${() => this.removeFile(f)}>${iconSvg('x', 'icon')}</button>
      </li>`,
      )}</ul>
      <span part="status" role="status" class="focsd-visually-hidden">${this.#status()}</span>
    </div>`,
    );
  }
}
