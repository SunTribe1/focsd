import { html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { FormControlMixin, restoredText } from '../internal/form-control.js';
import { uid } from '../internal/id.js';
import { renderFieldLayout } from '../internal/field-messages.js';
import { iconSvg } from '../internal/icons.js';
import { deepActiveElement } from '../internal/focus.js';

/**
 * The element an editor is: a text field or a textarea.
 * @typedef {HTMLElement & { value: string, error?: string, updateComplete: Promise<unknown>, validity: ValidityState, validationMessage: string, setSelectionRange(start: number, end: number): void }} EditorElement
 */

/** Validity flags that refuse a commit: all but `customError`, which the host `error` sets. */
const CHECKED_FLAGS = /** @type {const} */ ([
  'badInput',
  'patternMismatch',
  'rangeOverflow',
  'rangeUnderflow',
  'stepMismatch',
  'tooLong',
  'tooShort',
  'typeMismatch',
  'valueMissing',
]);

/**
 * The value as text: a string stays, nothing becomes empty, anything else is converted.
 * @param {unknown} value
 * @returns {string}
 */
const asText = (value) => {
  try {
    return value == null ? '' : String(value);
  } catch {
    return '';
  }
};

/**
 * Editable text: shows the value as a button; activating it swaps in a text field (or a textarea
 * with `multiline`) holding a draft. Enter commits (with `multiline`, Ctrl or Command with Enter),
 * Escape cancels and restores the previous value, and focus leaving the element commits unless
 * `keep-open-on-blur` is set, which keeps the draft open. A commit that is blank while `required`, or
 * that the editor reports invalid, stays in edit mode with the error shown. Focus returns to the
 * button after a keyboard commit or cancel. Moving to another window or tab neither commits nor
 * cancels. Nothing is fired while typing: one `input` and one `change` follow a commit that
 * changed the value. The button is named "label: value, edit" ("label: placeholder, edit" or
 * "label: Empty, edit" when there is no value). Form-associated: submits the committed value;
 * reset and restore leave edit mode without events.
 *
 * @fires input - Fired once when a commit changes the value, before `change`.
 * @fires change - Fired once when a commit changes the value.
 * @fires {Event} focsd-cancel - Fired when the person cancels an edit with Escape. Bubbles; the previous value stays.
 * @slot - Not used.
 * @csspart layout - The box around the label and the body; `data-position` is the label position.
 * @csspart label - The visible label (display mode; the editor shows its own).
 * @csspart body - The display button and the messages.
 * @csspart display - The button that shows the value and starts editing.
 * @csspart value - The value inside the button.
 * @csspart placeholder - The placeholder (or "Empty") inside the button when there is no value.
 * @csspart icon - The edit icon.
 * @csspart editor - The text field or textarea shown while editing.
 * @csspart hint - The hint text.
 * @csspart message - The shown error, warning or success message (also `error`, `warning` or `success`).
 * @csspart message-icon - The message's icon.
 * @csspart announcer - The visually hidden status region.
 */
export class FocsdEditableBase extends FormControlMixin(FocsdElement) {
  /** `readonly` applies: the value shows as read-only text and never opens the editor. */
  static supportsReadOnly = true;

  /** Tag of the editor used for a single line. */
  static textFieldTag = 'focsd-text-field';

  /** Tag of the editor used with `multiline`. */
  static textareaTag = 'focsd-textarea';

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    value: {},
    placeholder: {},
    multiline: { type: Boolean },
    keepOpenOnBlur: { type: Boolean, attribute: 'keep-open-on-blur' },
  };

  #editing = false;

  /** The text the editor starts with. */
  #draft = '';

  /** The error shown on the editor after a refused commit. */
  #editorError = '';

  #descriptionId = uid('focsd-editable-description');

  /** Focus returns to the display button after the next update. */
  #refocus = false;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** The committed text, shown in the button and submitted with a form. */
    this.value = '';
    /** Text shown while the value is empty. */
    this.placeholder = '';
    /** Edits in a textarea instead of a single line. */
    this.multiline = false;
    /** Keeps the draft open when focus moves to another element, instead of committing it. */
    this.keepOpenOnBlur = false;
  }

  /** True while the editor is open. Read-only: the element opens and closes it. */
  get editing() {
    return this.#editing;
  }

  /** @returns {EditorElement | null} */
  get #editor() {
    return /** @type {EditorElement | null} */ (this.renderRoot?.querySelector('[part~="editor"]') ?? null);
  }

  /** @returns {HTMLButtonElement | null} */
  get #display() {
    return this.renderRoot?.querySelector('[part~="display"]') ?? null;
  }

  /** Host ARIA is written at render time (see `#hostAria`), so the mixin forwards nothing. */
  get ariaTarget() {
    return undefined;
  }

  /** The editor shows its own invalid state. */
  get invalidTargets() {
    return [];
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (changed.has('value')) {
      const text = asText(this.value);

      if (text !== this.value) this.value = text;

      // Set by a script while editing: the editor shows the new value, as a native input would,
      // so a later commit does not write the old draft back.
      if (this.#editing) this.#draft = this.value;
    }

    // Disabled or made read-only while editing: the draft is dropped, nothing is fired.
    if (this.#editing && (this.isDisabled || this.readOnlyActive)) this.#close();
  }

  /** @override */
  updated() {
    this.toggleAttribute('editing', this.#editing);
    this.internals.setFormValue(this.value);

    if (this.#refocus) {
      this.#refocus = false;
      this.#display?.focus();
    }

    if (this.required && !this.value.trim()) this.setValidityState({ valueMissing: true }, this.localize.term('enterValue'), this.#display);
    else this.setValidityState({});
  }

  /** Leave edit mode without events; focus that was in the editor goes to the button. */
  #close() {
    // A disabled button cannot take focus: then focus is lost either way, so it is not moved.
    this.#refocus = this.#editing && !this.isDisabled && Boolean(this.shadowRoot?.activeElement);
    this.#editing = false;
    this.#editorError = '';
    this.requestUpdate();
  }

  /** Open the editor with the text selected. */
  async #open() {
    if (this.#editing || this.isDisabled || this.readOnlyActive) return;
    this.#draft = this.value;
    this.#editorError = '';
    this.#editing = true;
    this.requestUpdate();
    await this.updateComplete;
    const editor = this.#editor;

    await editor?.updateComplete;

    if (!this.#editing || !editor) return;
    /** @type {HTMLElement} */ (editor).focus();
    editor.setSelectionRange(0, editor.value.length);
  }

  /**
   * Commit the draft: refused (and kept open, with the error shown) when blank while `required` or
   * when the editor reports it invalid.
   * @param {boolean} refocus True for a keyboard commit; a blur must not take focus back.
   */
  #commit(refocus) {
    const editor = this.#editor;

    if (!this.#editing || !editor) return;
    const draft = asText(editor.value);

    const refusal = this.required && !draft.trim() ? this.localize.term('enterValue') : this.#editorProblem(editor);

    if (refusal) {
      this.#editorError = refusal;
      this.requestUpdate();

      if (refocus) void this.updateComplete.then(() => /** @type {HTMLElement | null} */ (this.#editor)?.focus());

      return;
    }

    const changed = draft !== this.value;

    if (changed) this.value = draft;
    this.#close();

    if (changed) this.emitValue(true);
  }

  /**
   * The editor's own complaint about the draft, or empty. The host `error` reaches the editor as a
   * custom error: it describes the old value, so it must not stop a fix from being committed.
   * @param {EditorElement} editor
   * @returns {string}
   */
  #editorProblem(editor) {
    const failed = CHECKED_FLAGS.some((key) => editor.validity[key]);

    return failed ? editor.validationMessage || this.localize.term('invalidValue') : '';
  }

  #cancel() {
    if (!this.#editing) return;
    this.#close();
    this.dispatchEvent(new Event('focsd-cancel', { bubbles: true }));
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    // Enter during IME composition picks a candidate; it must not submit.
    if (event.isComposing || event.keyCode === 229) return;
    const submit = this.multiline ? event.ctrlKey || event.metaKey : true;

    if (event.key === 'Enter' && submit) {
      event.preventDefault();
      this.#commit(true);
    } else if (event.key === 'Escape') {
      // Stops here, so a dialog around the editable stays open.
      event.preventDefault();
      event.stopPropagation();
      this.#cancel();
    }
  };

  /**
   * The editor's own `input` and `change` are not this element's: stop them, and clear a shown error.
   * @param {Event} event
   */
  #onEditorEvent = (event) => {
    event.stopPropagation();

    if (this.#editorError && event.type === 'input') {
      this.#editorError = '';
      this.requestUpdate();
    }
  };

  /**
   * Focus left the element. Only a real move to another element counts: when the window or tab
   * loses focus, the same element stays the active one and nothing is committed.
   * @param {FocusEvent} event
   */
  #onFocusOut = (event) => {
    const next = /** @type {Node | null} */ (event.relatedTarget);

    if (!this.#editing || (next && (this.contains(next) || this.renderRoot.contains(next)))) return;
    queueMicrotask(() => {
      const active = deepActiveElement();
      const inside = active && (this.contains(active) || this.renderRoot.contains(active) || this.shadowRoot?.activeElement);

      if (this.#editing && !this.keepOpenOnBlur && document.hasFocus() && !inside) this.#commit(false);
    });
  };

  formResetCallback() {
    this.#close();
    this.value = this.defaultValue;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.#close();
    this.value = restoredText(state) ?? '';
  }

  /**
   * The author's `aria-label` (or the text of `aria-labelledby`) and description, resolved now: ID
   * references cannot cross the shadow root, and reading them at render time leaves nothing stale.
   */
  get #hostAria() {
    return {
      label: this.getAttribute('aria-label') || this.idrefText(this.getAttribute('aria-labelledby')),
      description: this.getAttribute('aria-description') || this.idrefText(this.getAttribute('aria-describedby')),
    };
  }

  #renderEditor() {
    const { label, description } = this.#hostAria;

    const ctor = /** @type {typeof FocsdEditableBase} */ (this.constructor);
    const tag = unsafeStatic(this.multiline ? ctor.textareaTag : ctor.textFieldTag);

    return staticHtml`<${tag}
      part="editor"
      exportparts="label:editor-label,control:editor-control"
      aria-label=${label || nothing}
      aria-description=${description || nothing}
      label=${this.label}
      label-position=${this.effectiveLabelPosition}
      placeholder=${this.placeholder || nothing}
      .value=${this.#draft}
      .hint=${this.hint}
      .error=${this.#editorError || this.error}
      .warning=${this.warning}
      .success=${this.success}
      ?required=${this.required}
      @keydown=${this.#onKeyDown}
      @input=${this.#onEditorEvent}
      @change=${this.#onEditorEvent}
      @focusout=${this.#onFocusOut}
    ></${tag}>`;
  }

  #renderDisplay() {
    const shown = this.value || this.placeholder || this.localize.term('empty');
    const { label: hostLabel, description } = this.#hostAria;
    const describedBy = this.describedByIds().join(' ');
    const inner = html`<span part=${this.value ? 'value' : 'placeholder'}>${shown}</span>`;
    const label = html`<span part="label">${this.label}</span>`;

    const readOnlyDescribedBy = [describedBy, description ? this.#descriptionId : ''].filter(Boolean).join(' ');

    // Read-only: the value as read-only text, not a button that does nothing.
    const body = this.readOnlyActive
      ? html`<span
          part="display"
          role="textbox"
          tabindex="0"
          aria-readonly="true"
          aria-label=${hostLabel || this.label || nothing}
          aria-describedby=${readOnlyDescribedBy || nothing}
          >${inner}</span
        >${description ? html`<span id=${this.#descriptionId} class="focsd-visually-hidden">${description}</span>` : nothing}`
      : html`<button
          part="display"
          type="button"
          aria-label=${hostLabel || this.localize.term('editNamed', this.label, shown)}
          aria-description=${description || nothing}
          aria-describedby=${describedBy || nothing}
          ?disabled=${this.isDisabled}
          @click=${() => void this.#open()}
        >
          ${inner}<span part="icon" aria-hidden="true">${iconSvg('edit')}</span>
        </button>`;

    return renderFieldLayout(this, label, body);
  }

  /** @override */
  render() {
    return this.#editing ? this.#renderEditor() : this.#renderDisplay();
  }
}
