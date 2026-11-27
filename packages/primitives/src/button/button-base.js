import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { clearSubmitter, setSubmitter, setSubmitterProxy } from '../internal/submitter.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';

/** Submit overrides copied onto the temporary native submitter: [property, attribute]. */
/** @type {['formAction' | 'formMethod' | 'formEnctype' | 'formTarget', string][]} */
const FORM_OVERRIDES = [
  ['formAction', 'formaction'],
  ['formMethod', 'formmethod'],
  ['formEnctype', 'formenctype'],
  ['formTarget', 'formtarget'],
];

/** @type {Record<string, 'show' | 'hide' | 'toggle' | undefined>} */
const POPOVER_COMMANDS = { 'show-popover': 'show', 'hide-popover': 'hide', 'toggle-popover': 'toggle' };

/**
 * A `commandfor` target that may be a dialog.
 * @typedef {HTMLElement & { open?: boolean, showModal?: (opener?: HTMLElement) => void, close?: (value?: string) => void, requestClose?: (value?: string) => void }} DialogLike
 */

/** Built-in dialog commands: run only when the dialog is in the matching state, like native. */
/** @type {Record<string, ((target: DialogLike, value: string, source: HTMLElement) => unknown) | undefined>} */
const DIALOG_COMMANDS = {
  // The button is the opener, so focus returns to it on close (Safari does not focus buttons on click).
  'show-modal': (target, _value, source) => !target.open && target.showModal?.(source),
  close: (target, value) => target.open && target.close?.(value),
  'request-close': (target, value) => target.open && target.requestClose?.(value),
};

/**
 * Headless button. Renders a native <button part="control">; `disabled` keeps it focusable
 * (aria-disabled) but swallows activation. `type="submit" | "reset"` acts on the owning form.
 *
 * Native button parity: `popovertarget`/`popovertargetaction` (target: an element with `popover`),
 * `commandfor`/`command` (built-ins `show-modal`, `close`, `request-close`, `show-popover`,
 * `hide-popover`, `toggle-popover`, or a custom `--name` dispatched on the target as a
 * `focsd-command` event with the `CommandEvent` shape, `command` and `source`), and the submit
 * overrides `formaction`, `formmethod`, `formenctype`, `formnovalidate`, `formtarget`.
 * Targets are found by id in the button's tree.
 *
 * @slot - Default content.
 * @slot icon - Any icon markup before the label (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon wrapper (decorative; the label names the element).
 * @csspart control - The control element.
 */
export class FocsdButtonBase extends FocsdElement {
  static formAssociated = true;

  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdElement.styles, iconSlotStyles];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    variant: { reflect: true },
    type: { reflect: true },
    // Always reflect, so an author's write is visible (as a mutation) even when the value is unchanged.
    disabled: { type: Boolean, reflect: true, hasChanged: () => true },
    name: { reflect: true },
    value: { reflect: true },
    /** Forwarded to the inner button as aria-expanded (set by menus, popovers, disclosures). */
    expanded: { type: Boolean },
    /** Forwarded as aria-haspopup. */
    haspopup: {},
    /** Forwarded as aria-description (set by focsd-tooltip). */
    description: {},
    popoverTarget: { attribute: 'popovertarget' },
    popoverTargetAction: { attribute: 'popovertargetaction' },
    commandFor: { attribute: 'commandfor' },
    command: {},
    formAction: { attribute: 'formaction' },
    formMethod: { attribute: 'formmethod' },
    formEnctype: { attribute: 'formenctype' },
    formNoValidate: { type: Boolean, attribute: 'formnovalidate' },
    formTarget: { attribute: 'formtarget' },
  };

  constructor() {
    super();
    /** An icon before the label: a name from the default icon library (or `icon-library`). For any other icon kit, put it in `slot="icon"`. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** The element's `ElementInternals`, for subclasses. */
    this.internals = this.attachInternals();
    /**
     * @type {'plain' | 'action' | 'quiet' | 'critical'}
     * The visual style: `action` for the main action, `critical` for destructive ones, `quiet` for low emphasis.
     */
    this.variant = 'plain';
    /** @type {'button' | 'submit' | 'reset'} What the button does in a form, as on `<button>`. */
    this.type = 'button';
    /** Disables the button. */
    this.disabled = false;
    /** The name submitted with `value` when this button submits the form. */
    this.name = '';
    /** The value submitted with `name` when this button submits the form. */
    this.value = '';
    this.expanded = undefined;
    this.haspopup = '';
    this.description = '';
    /** The ID of a popover the button shows, hides or toggles, as on `<button>`. */
    this.popoverTarget = '';
    /** @type {'toggle' | 'show' | 'hide'} What the button does to its `popovertarget`. */
    this.popoverTargetAction = 'toggle';
    /** The ID of the element the button sends `command` to, as on `<button>`. */
    this.commandFor = '';
    /** The command sent to the `commandfor` element, such as `show-modal` or `close`. */
    this.command = '';
    /** Overrides the form's `action` when this button submits it. */
    this.formAction = '';
    /** Overrides the form's `method` when this button submits it. */
    this.formMethod = '';
    /** Overrides the form's `enctype` when this button submits it. */
    this.formEnctype = '';
    /** Submits the form without validating it. */
    this.formNoValidate = false;
    /** Overrides the form's `target` when this button submits it. */
    this.formTarget = '';
    this.addEventListener('click', this.#onClick, { capture: true });
    // A controller runs around every update even when a subclass overrides willUpdate() or updated().
    // Before the update: follow the controlled popover, so its `expanded` renders in this same pass.
    // After it: point the rendered inner button at the popover.
    this.addController({
      hostUpdate: () => {
        if (this.isConnected) this.#watchPopover(this.isDisabled ? null : (this.#popoverIntent()?.target ?? null));
      },
      hostUpdated: () => this.#syncPopover(),
    });
  }

  /** The popover this button controls (via popovertarget or a popover command), if any. */
  /** @type {HTMLElement | null} */
  #popover = null;

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#watchPopover(null);
  }

  /**
   * @param {string} id
   * @returns {HTMLElement | null}
   */
  #byId(id) {
    if (!id) return null;
    const root = /** @type {Document | ShadowRoot} */ (this.getRootNode());

    return root.getElementById?.(id) ?? null;
  }

  /** Popover target and action from `popovertarget`, or from a popover `command`. */
  #popoverIntent() {
    const commanded = POPOVER_COMMANDS[this.command];

    if (commanded) {
      const target = this.#byId(this.commandFor);

      return target?.hasAttribute('popover') ? { target, action: commanded } : null;
    }

    const target = this.#byId(this.popoverTarget);

    if (!target?.hasAttribute('popover')) return null;
    const action = ['show', 'hide'].includes(this.popoverTargetAction) ? this.popoverTargetAction : 'toggle';

    return { target, action };
  }

  /**
   * Point the inner button at the popover natively (popoverTargetElement may reference an element in
   * an ancestor tree), so light dismiss treats this button as the invoker and never re-opens on click.
   */
  #syncPopover() {
    const control = this.renderRoot.querySelector('[part~="control"]');
    const intent = this.isDisabled ? null : this.#popoverIntent();

    if (control && 'popoverTargetElement' in control) {
      control.popoverTargetElement = intent?.target ?? null;

      if (intent) /** @type {HTMLButtonElement} */ (control).popoverTargetAction = intent.action;
    }

    this.#watchPopover(intent?.target ?? null);
  }

  /** @param {ToggleEvent} event */
  #onPopoverToggle = (event) => {
    this.expanded = event.newState === 'open';
  };

  /** Follow the controlled popover's open state as aria-expanded (only for popovertarget). */
  /** @param {HTMLElement | null} target */
  #watchPopover(target) {
    if (this.#popover === target) return;
    this.#popover?.removeEventListener('toggle', this.#onPopoverToggle);
    this.#popover = target;

    // No longer controlling a popover: drop the aria-expanded this button was reporting.
    if (!target) {
      if (this.#drivesExpanded) this.expanded = undefined;
      this.#drivesExpanded = false;

      return;
    }

    target.addEventListener('toggle', this.#onPopoverToggle);
    this.#drivesExpanded = Boolean(this.popoverTarget && !POPOVER_COMMANDS[this.command]);

    if (this.#drivesExpanded) this.expanded = target.matches(':popover-open');
  }

  #drivesExpanded = false;

  /** Run a dialog or custom command on the `commandfor` target. */
  #runCommand() {
    const target = this.#byId(this.commandFor);

    if (!target || !this.command || POPOVER_COMMANDS[this.command]) return;

    if (this.command.startsWith('--')) {
      const init = { command: this.command, source: this, cancelable: true };

      const event =
        typeof CommandEvent === 'undefined'
          ? Object.assign(new Event('focsd-command', init), init)
          : new CommandEvent('focsd-command', init);

      target.dispatchEvent(event);

      return;
    }

    DIALOG_COMMANDS[this.command]?.(target, this.value, this);
  }

  #formDisabled = false;

  /**
   * The form the button belongs to, or null.
   * @returns {HTMLFormElement | null}
   */
  get form() {
    return this.internals.form;
  }

  /** True when `disabled` is set or an ancestor fieldset is disabled. */
  /** @returns {boolean} */
  get isDisabled() {
    return this.disabled || this.#formDisabled;
  }

  /** @param {boolean} disabled */
  formDisabledCallback(disabled) {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopImmediatePropagation();

      return;
    }

    // Late-bound targets (added after first render) are resolved before the native activation runs.
    this.#syncPopover();
    this.#runCommand();
    const { form } = this.internals;

    if (!form) return;

    if (this.type === 'submit') this.#submit(form);
    else if (this.type === 'reset') form.reset();
  };

  get #hasOverrides() {
    return this.formNoValidate || FORM_OVERRIDES.some(([prop]) => this[prop]);
  }

  /** Submit with this button's name=value in the form data and as the recorded submitter. */
  /** @param {HTMLFormElement} form */
  #submit(form) {
    if (this.#hasOverrides) {
      this.#submitWithProxy(form);

      return;
    }

    if (this.name) this.internals.setFormValue(this.value);
    setSubmitter(form, this);

    try {
      form.requestSubmit();
    } finally {
      clearSubmitter(form);
      this.internals.setFormValue(null);
    }
  }

  /** Submit through a hidden native submit button carrying the overrides, name and value. */
  /** @param {HTMLFormElement} form */
  #submitWithProxy(form) {
    const proxy = Object.assign(document.createElement('button'), { type: 'submit', hidden: true, formNoValidate: this.formNoValidate });

    for (const [prop, attr] of FORM_OVERRIDES) if (this[prop]) proxy.setAttribute(attr, this[prop]);

    if (this.name) Object.assign(proxy, { name: this.name, value: this.value });
    setSubmitterProxy(proxy, this);
    form.append(proxy);

    try {
      form.requestSubmit(proxy);
    } finally {
      // Kept for one more task, so a submit handler that awaits once can still read
      // new FormData(form, event.submitter). Removed before anything else can submit through it.
      setTimeout(() => proxy.remove());
    }
  }

  /**
   * Render the inner <button> with forwarded ARIA. Subclasses pass extra attributes via `extra`.
   * @param {unknown} content
   * @param {{ pressed?: boolean, label?: string }} [extra]
   */
  renderButton(content, extra = {}) {
    return html`<button
      part="control"
      type="button"
      aria-disabled=${this.isDisabled ? 'true' : nothing}
      aria-expanded=${this.expanded === undefined ? nothing : String(this.expanded)}
      aria-haspopup=${this.haspopup || nothing}
      aria-description=${this.description || nothing}
      aria-pressed=${extra.pressed === undefined ? nothing : String(extra.pressed)}
      aria-label=${extra.label || nothing}
    >${content}</button>`;
  }

  /** @override */
  render() {
    return this.renderButton(html`${leadingIcon(this)}<slot></slot>`);
  }
}
