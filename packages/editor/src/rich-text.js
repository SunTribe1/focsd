import { css, html, nothing } from 'lit';
import { Editor, generateHTML, generateJSON } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { FormControlMixin, FocsdElement, icon } from '@focsd/primitives';
import { uid } from '@focsd/primitives/internal';
import { errorBorder } from '@focsd/primitives/styles/field.js';
import { isSafeLink, toolbarItems } from './toolbar.js';

/** Content styles live in the page (the editable area is light DOM); zero specificity so apps win. Tokens are required (no raw fallbacks). */
const CONTENT_CSS = `
:where(.focsd-rich-text-content) { outline: none; min-block-size: 6rem; }
:where(.focsd-rich-text-content) > :first-child,
:where(.focsd-rich-text-content) :where(.ProseMirror) > :first-child { margin-block-start: 0; }
:where(.focsd-rich-text-content) > :last-child,
:where(.focsd-rich-text-content) :where(.ProseMirror) > :last-child { margin-block-end: 0; }
:where(.focsd-rich-text-content) :where(p, ul, ol, blockquote, h2, h3) { margin-block: 0.5em; }
:where(.focsd-rich-text-content) :where(ul, ol) { padding-inline-start: 1.5em; }
:where(.focsd-rich-text-content) blockquote { margin-inline: 0; padding-inline-start: 1em; border-inline-start: 3px solid var(--focsd-edge); }
:where(.focsd-rich-text-content) code { font-family: var(--focsd-font-mono, monospace); font-size: 0.9em; padding: 0.1em 0.3em; border-radius: var(--focsd-radius-tag); background: var(--focsd-surface-sunk); }
:where(.focsd-rich-text-content) a { color: var(--focsd-route); text-decoration: underline; }
:where(.focsd-rich-text-content) p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: inline-start; block-size: 0; color: var(--focsd-ink-muted); pointer-events: none; }
`;

/** ProseMirror's own base rules (Tiptap's injectCSS is off: it only reaches the document). */
const PROSEMIRROR_CSS = `
.ProseMirror { position: relative; word-wrap: break-word; white-space: pre-wrap; white-space: break-spaces; font-variant-ligatures: none; font-feature-settings: "liga" 0; }
.ProseMirror [contenteditable="false"] { white-space: normal; }
.ProseMirror [contenteditable="false"] [contenteditable="true"], .ProseMirror pre { white-space: pre-wrap; }
img.ProseMirror-separator { display: inline !important; border: none !important; margin: 0 !important; width: 0 !important; height: 0 !important; }
.ProseMirror-gapcursor { display: none; pointer-events: none; position: absolute; margin: 0; }
.ProseMirror-focused .ProseMirror-gapcursor { display: block; }
.ProseMirror-hideselection *::selection { background: transparent; }
.ProseMirror-hideselection * { caret-color: transparent; }
`;

/** @type {CSSStyleSheet | null} */
let contentSheet = null;

/** Roots (the document or a shadow root) that already have the content styles. */
const styledRoots = new WeakSet();

/**
 * The editable area is light DOM, so it lives in whatever tree the element is in: adopt the
 * content styles into that root (the document, or another component's shadow root).
 * @param {Node} root
 */
function adoptContentStyles(root) {
  if (typeof CSSStyleSheet === 'undefined' || !root || !('adoptedStyleSheets' in root) || styledRoots.has(root)) return;

  if (!contentSheet) {
    contentSheet = new CSSStyleSheet();
    contentSheet.replaceSync(`${PROSEMIRROR_CSS}\n@layer focsd.editor { ${CONTENT_CSS} }`);
  }

  const target = /** @type {Document | ShadowRoot} */ (root);
  target.adoptedStyleSheets = [...target.adoptedStyleSheets, contentSheet];
  styledRoots.add(root);
}

const REL = 'noopener noreferrer nofollow';

/**
 * The host's own ARIA attributes, kept by FormControlMixin (internal, not part of the public type).
 * @typedef {{ hostAriaLabel: string | null, hostAriaLabelledBy: string | null, hostAriaDescription: string | null, hostAriaDescribedBy: string | null }} HostAria
 */

/** Links carry only a safe href: pasted class, target and style are dropped, rel is fixed. */
const SafeLink = Link.extend({
  addAttributes() {
    return {
      href: /** @type {Record<string, unknown>} */ (this.parent?.() ?? {}).href ?? { default: null },
      target: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
      rel: { default: REL, parseHTML: () => REL, renderHTML: () => ({ rel: REL }) },
      class: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
    };
  },
});

/** The editor's schema: the toolbar's formats and nothing else. */
const extensions = (placeholder = () => '') => [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    // No automatic empty paragraph after a final heading: it would end up in the form value.
    trailingNode: false,
    link: false,
  }),
  SafeLink.configure({
    openOnClick: false,
    autolink: true,
    isAllowedUri: (url) => isSafeLink(url),
    HTMLAttributes: { target: null, rel: REL, class: null },
  }),
  Placeholder.configure({ placeholder }),
];

/**
 * Clean HTML through the schema without an editor (value read before the editor exists).
 * @param {string} markup
 * @returns {string}
 */
function sanitize(markup) {
  if (!markup || typeof DOMParser === 'undefined') return markup ? '' : markup;
  const schema = extensions();
  const out = generateHTML(generateJSON(markup, schema), schema);

  return out === '<p></p>' ? '' : out;
}

/**
 * Set an attribute to `value`, or remove it when `value` is empty.
 * @param {Element} el
 * @param {string} name
 * @param {string | false | undefined} value
 */
function setOrRemove(el, name, value) {
  if (!value) {
    el.removeAttribute(name);

    return;
  }

  el.setAttribute(name, value);
}

/** @type {typeof FocsdElement & (new (...args: any[]) => import('@focsd/primitives').FormControlElement)} */
const FormControlBase = FormControlMixin(FocsdElement);

/**
 * Rich text editor: a labeled, multi-line text box with a formatting toolbar, built on Tiptap
 * (ProseMirror). Form-associated: its value is HTML, limited to the toolbar's formatting, so
 * scripts, event handlers and unsafe links never survive. The editable area is rendered in the
 * light DOM (slot `content`), so text selection works in every engine and page CSS styles the
 * content.
 *
 * @fires input - Fired on every edit.
 * @fires change - Fired when the editor loses focus after its value changed.
 * @slot content - Created by the element: the editable area (do not supply your own).
 * @csspart label - The label.
 * @csspart hint - The hint.
 * @csspart error - The error message.
 * @csspart field - The frame around the toolbar and the editable area.
 * @csspart toolbar - The formatting toolbar.
 * @csspart tool - Each toolbar button (also `tool-active` when pressed).
 * @csspart separator - A divider between toolbar groups.
 * @csspart link-form - The link address form.
 */
export class FocsdRichText extends FormControlBase {
  /** Read-only editors are excluded from validation, like native read-only controls. */
  static supportsReadOnly = true;

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      :host {
        display: grid;
        gap: var(--focsd-space-1);
        font-size: var(--focsd-text-body-size);
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        cursor: default;
      }
      [part~='hint'] {
        margin: 0;
        font-size: var(--focsd-text-small-size);
        color: var(--focsd-ink-muted);
      }
      [part~='error'] {
        margin: 0;
        font-size: var(--focsd-text-small-size);
        color: var(--focsd-critical);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='field'] {
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
        background: var(--focsd-field-background, var(--focsd-surface));
        color: var(--focsd-ink);
      }
      :host(:state(error)) [part~='field'] {
        ${errorBorder}
      }
      /* Fallback for engines without plain-name custom states (it would also match a blank attribute). */
      @supports not selector(:state(error)) {
        :host([error]:not([error=''])) [part~='field'] {
          ${errorBorder}
        }
      }
      /* The ring wraps the whole field while the text has focus. Toolbar buttons and the link form
         get the floor's own ring instead, so the two never stack. */
      [part~='field']:focus-within:not(:has([part~='toolbar']:focus-within, [part~='link-form']:focus-within)) {
        outline: 2px solid transparent;
        box-shadow: var(--focsd-focus-ring);
      }
      [part~='toolbar'] {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        padding: var(--focsd-space-1);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      }
      [part~='tool'] {
        display: inline-grid;
        place-items: center;
        min-inline-size: max(var(--focsd-target-min), var(--focsd-control-height-inner));
        min-block-size: max(var(--focsd-target-min), var(--focsd-control-height-inner));
        padding: 0;
        border: 1px solid transparent;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink);
        font-size: 1.05em;
        cursor: pointer;
      }
      [part~='tool']:hover:not([aria-disabled='true']) {
        background: var(--focsd-surface-sunk);
      }
      [part~='tool-active'] {
        background: var(--focsd-surface-sunk);
        border-color: var(--focsd-edge);
      }
      [part~='tool'][aria-disabled='true'] {
        color: var(--focsd-ink-muted);
        cursor: not-allowed;
      }
      [part~='separator'] {
        inline-size: 1px;
        margin-inline: var(--focsd-space-1);
        background: var(--focsd-edge-quiet);
      }
      [part~='link-form'] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-2);
        align-items: center;
        padding: var(--focsd-space-2);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      }
      [part~='link-form'] input {
        flex: 1 1 14rem;
        min-block-size: var(--focsd-control-height-inner);
        padding-inline: var(--focsd-space-2);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        font: inherit;
        background: var(--focsd-surface);
        color: var(--focsd-ink);
      }
      [part~='link-form'] button {
        min-block-size: var(--focsd-control-height-inner);
        padding-inline: var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        font: inherit;
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        cursor: pointer;
      }
      ::slotted([slot='content']) {
        display: block;
        padding: var(--focsd-space-2) var(--focsd-space-3);
        min-block-size: 6rem;
        line-height: var(--focsd-text-body-line-height, 1.55);
      }
      @media (forced-colors: active) {
        [part~='tool-active'] {
          border-color: Highlight;
        }
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    hint: {},
    // `error` comes from FormControlMixin (its own accessor, so validity follows it synchronously).
    placeholder: {},
    value: { noAccessor: true },
    _linkOpen: { state: true },
    _linkError: { state: true },
    _tick: { state: true },
  };

  #ids = { label: uid('focsd-rich-text-label'), hint: uid('focsd-rich-text-hint'), link: uid('focsd-rich-text-link') };

  /** @type {import('@tiptap/core').Editor | null} */
  #editor = null;

  /** @type {HTMLElement | null} */
  #content = null;

  #value = '';

  #valueAtFocus = '';

  #focusIndex = 0;

  constructor() {
    super();
    /** The visible label. */
    this.label = '';
    /** Help text shown below the label. */
    this.hint = '';
    /** Placeholder text shown while the editor is empty. */
    this.placeholder = '';
    /** @internal */
    this._linkOpen = false;
    /** @internal */
    this._linkError = '';
    /** @internal */
    this._tick = 0;
  }

  /**
   * The content as HTML ('' when empty).
   * @returns {string}
   */
  get value() {
    return this.#editor ? this.#html() : sanitize(this.#value);
  }

  /** @param {string | null | undefined} next null or undefined clears it. */
  set value(next) {
    const old = this.value;
    this.#value = next ?? '';

    if (this.#editor && this.#value !== this.#html()) this.#editor.commands.setContent(this.#value, { emitUpdate: false });
    this.requestUpdate('value', old);
  }

  /** The Tiptap editor, for advanced commands (`el.editor.chain().focus()…`). */
  get editor() {
    return this.#editor;
  }

  #html() {
    const editor = /** @type {import('@tiptap/core').Editor} */ (this.#editor);

    return editor.isEmpty ? '' : editor.getHTML();
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    adoptContentStyles(this.getRootNode());

    if (!this.#content) {
      this.#content = document.createElement('div');
      this.#content.slot = 'content';
      this.#content.className = 'focsd-rich-text-content';
    }

    if (!this.#content.isConnected) this.append(this.#content);

    // Moved in the DOM after the first render: bring the editor back with the user's edits.
    if (this.hasUpdated && !this.#editor) this.#createEditor();
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();

    if (this.#editor) this.#value = this.#html();
    this.#editor?.destroy();
    this.#editor = null;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    super.willUpdate(changed);

    // The editable area is light DOM (made in connectedCallback), so the editor can start before the
    // first render, and the toolbar renders its state in that same pass.
    if (!this.hasUpdated) this.#createEditor();
    const editor = this.#editor;

    if (!editor) return;
    const editable = !this.isDisabled && !this.readOnly;

    if (editor.isEditable !== editable) editor.setEditable(editable, false);

    // Not editable any more: a link form left open must not change the content.
    if (!editable && this._linkOpen) this._linkOpen = false;

    if (changed.has('placeholder')) editor.view.dispatch(editor.state.tr);
  }

  #createEditor() {
    if (this.#editor || !this.#content) return;

    const refresh = () => {
      this._tick += 1;
    };

    this.#editor = new Editor({
      element: this.#content,
      content: this.#value,
      editable: !this.isDisabled && !this.readOnly,
      injectCSS: false,
      extensions: extensions(() => this.placeholder),
      onUpdate: () => {
        refresh();
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      },
      onSelectionUpdate: refresh,
      onTransaction: refresh,
      onFocus: () => {
        this.#valueAtFocus = this.value;
      },
      onBlur: () => {
        if (this.value !== this.#valueAtFocus) this.dispatchEvent(new Event('change', { bubbles: true }));
      },
    });
    this.#editor.view.dom.addEventListener('keydown', this.#onContentKeyDown);
    this.requestUpdate();
  }

  /** Ctrl/Cmd+K opens the link form (Tiptap has no built-in shortcut for it). */
  /** @param {KeyboardEvent} event */
  #onContentKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.openLinkForm();
    }
  };

  /**
   * The editable area names itself in updated(): the mixin's forwarding would point ID references
   * into the shadow root, which a light-DOM element cannot reach.
   */
  get ariaTarget() {
    return undefined;
  }

  /** The link form's URL field (rendered while the form is open). */
  get #linkInput() {
    return /** @type {HTMLInputElement} */ (this.renderRoot.querySelector(`#${this.#ids.link}`));
  }

  /**
   * Mirror the host's name, description and state onto the editable area as ARIA.
   * @param {HTMLElement} dom
   */
  #syncAria(dom) {
    dom.setAttribute('role', 'textbox');
    dom.setAttribute('aria-multiline', 'true');
    // The label is in the shadow root and ID references cannot cross it, so name by text.
    const aria = /** @type {HostAria} */ (/** @type {unknown} */ (this));
    setOrRemove(dom, 'aria-label', aria.hostAriaLabel || this.idrefText(aria.hostAriaLabelledBy) || this.label);
    const own = aria.hostAriaDescription || this.idrefText(aria.hostAriaDescribedBy);
    setOrRemove(dom, 'aria-description', [this.error || this.hint, own].filter(Boolean).join(' '));
    dom.setAttribute('aria-required', String(this.required));
    setOrRemove(dom, 'aria-invalid', Boolean(this.error) && 'true');
    setOrRemove(dom, 'aria-readonly', this.readOnly && 'true');
    setOrRemove(dom, 'aria-disabled', this.isDisabled && 'true');
  }

  /** @override */
  updated() {
    const editor = this.#editor;
    const dom = editor?.view.dom;

    if (dom) this.#syncAria(dom);

    const value = this.value;
    this.internals.setFormValue(value || null, value);

    // `error` is the mixin's own validity source (Ruling R3); only the built-in flags are reported here.
    if (this.required && !value) this.setValidityState({ valueMissing: true }, this.localize.term('enterValue'), dom);
    else this.setValidityState({}, '', dom);
  }

  formResetCallback() {
    this.value = this.defaultValue;
    this._linkOpen = false;
  }

  /** @param {string | File | FormData | null} state */
  formStateRestoreCallback(state) {
    this.value = state instanceof File || state instanceof FormData ? '' : (state ?? '');
  }

  /**
   * Focus the editable area.
   * @param {FocusOptions} [options]
   * @override
   */
  focus(options) {
    this.#editor?.commands.focus(undefined, { scrollIntoView: !options?.preventScroll });
  }

  // ---- toolbar ------------------------------------------------------------------------------

  /** @param {import('./toolbar.js').ToolbarItem} item */
  #enabled(item) {
    if (this.isDisabled || this.readOnly || !this.#editor) return false;

    return item.enabled ? item.enabled(this.#editor) : true;
  }

  /** @param {import('./toolbar.js').ToolbarItem} item */
  #run(item) {
    if (!this.#enabled(item)) return;
    item.run(/** @type {import('@tiptap/core').Editor} */ (this.#editor), this);
  }

  /** @param {KeyboardEvent} event */
  #onToolbarKeyDown = (event) => {
    /** @type {EventTarget[]} */
    const buttons = [...this.renderRoot.querySelectorAll('[part~="tool"]')];
    const target = event.composedPath()[0];
    const current = target ? buttons.indexOf(target) : -1;

    if (current < 0) return;
    const last = buttons.length - 1;
    const rtl = getComputedStyle(this).direction === 'rtl';
    /** @type {Record<string, number>} */
    const steps = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 };
    const step = steps[event.key];
    let next;

    if (step) next = (current + step + buttons.length) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    else return;
    event.preventDefault();
    this.#focusIndex = next;
    this.requestUpdate();
    /** @type {HTMLElement} */ (buttons[next]).focus();
  };

  // ---- links --------------------------------------------------------------------------------

  /** Open the link form for the selection (prefilled with the current link). */
  openLinkForm() {
    if (this.isDisabled || this.readOnly || !this.#editor) return;

    // Focus moves to the address field; some engines then reset the editor's DOM selection.
    // Keep the range from when the form first opened: while it is open the editor may lose it.
    if (!this._linkOpen) {
      const { from, to } = this.#editor.state.selection;
      this.#linkRange = { from, to };
    }

    this._linkError = '';
    this._linkOpen = true;
    this.updateComplete.then(() => {
      const input = this.#linkInput;
      const editor = /** @type {import('@tiptap/core').Editor} */ (this.#editor);
      input.value = editor.getAttributes('link').href ?? '';
      input.focus();
      input.select();
    });
  }

  #closeLinkForm() {
    this._linkOpen = false;
    this._linkError = '';
    this.#editor?.commands.focus();
  }

  /** @type {{ from: number, to: number } | null} */
  #linkRange = null;

  /** @param {string} href */
  #applyLink(href) {
    if (this.isDisabled || this.readOnly || !this.#editor) return;
    const url = href.trim();
    const chain = this.#editor.chain().focus();

    if (this.#linkRange) chain.setTextSelection(this.#linkRange);
    chain.extendMarkRange('link');

    if (!url) {
      chain.unsetLink().run();
      this.#closeLinkForm();

      return;
    }

    if (!isSafeLink(url)) {
      this._linkError = this.localize.term('invalidLink');

      return;
    }

    chain.setLink({ href: url }).run();
    this.#closeLinkForm();
  }

  /** @param {KeyboardEvent} event */
  #onLinkKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.#applyLink(/** @type {HTMLInputElement} */ (event.target).value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.#closeLinkForm();
    }
  };

  // ---- render -------------------------------------------------------------------------------

  /**
   * @param {import('./toolbar.js').ToolbarItem} item
   * @param {number} index
   */
  #renderTool(item, index) {
    const editor = this.#editor;
    const pressed = Boolean(editor && item.active?.(editor));
    const enabled = this.#enabled(item);
    const label = this.localize.term(item.label);

    return html`${item.separatorBefore ? html`<span part="separator" role="separator" aria-orientation="vertical"></span>` : nothing}<button
        part="tool${pressed ? ' tool-active' : ''}"
        type="button"
        tabindex=${index === this.#focusIndex ? '0' : '-1'}
        aria-label=${label}
        title=${label}
        aria-pressed=${item.toggle ? String(pressed) : nothing}
        aria-disabled=${enabled ? nothing : 'true'}
        aria-keyshortcuts=${item.keys ?? nothing}
        @mousedown=${(/** @type {MouseEvent} */ e) => e.preventDefault()}
        @click=${() => {
          this.#focusIndex = index;
          this.#run(item);
        }}
      >
        ${icon({ library: 'editor', name: item.icon }, 'icon')}
      </button>`;
  }

  /** @override */
  render() {
    /** @param {string} key */
    const t = (key) => this.localize.term(key);

    return html`
      ${/* eslint-disable-next-line lit-a11y/click-events-have-key-events -- the label is a pointer convenience, like a native <label>; the editor itself is in the tab order */ ''}
      <span part="label" id=${this.#ids.label} @click=${() => this.focus()}>${this.label}</span>
      ${this.hint ? html`<p part="hint" id=${this.#ids.hint}>${this.hint}</p>` : nothing}
      <div part="field">
        <div part="toolbar" role="toolbar" aria-label=${t('formatting')} @keydown=${this.#onToolbarKeyDown}>
          ${toolbarItems.map((item, i) => this.#renderTool(item, i))}
        </div>
        ${
          this._linkOpen
            ? html`<div part="link-form">
              <input
                id=${this.#ids.link}
                type="url"
                aria-label=${t('linkAddress')}
                ${/* visible-string: the https:// placeholder is a URL scheme, not language */ ''}
                placeholder="https://"
                aria-invalid=${this._linkError ? 'true' : nothing}
                aria-description=${this._linkError || nothing}
                @keydown=${this.#onLinkKeyDown}
              />
              <button type="button" @click=${() => this.#applyLink(this.#linkInput.value)}>${t('applyLink')}</button>
              <button type="button" @click=${() => this.#applyLink('')}>${t('removeLink')}</button>
              ${this._linkError ? html`<p part="error" role="alert">${this._linkError}</p>` : nothing}
            </div>`
            : nothing
        }
        <slot name="content"></slot>
      </div>
      ${this.error ? html`<p part="error">${this.error}</p>` : nothing}
    `;
  }
}
