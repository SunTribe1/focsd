import { nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { TriggerToggle } from '../internal/popup.js';
import { iconSvg } from '../internal/icons.js';
import { FocsdMenuBase } from './menu-base.js';
import { FocsdMenuItemBase } from './menu-item-base.js';

/**
 * Split button: a primary action button joined to a menu button that opens more actions, inside a
 * `role=group` named by `label`. The main part fires the host's `click`; the menu button is an APG
 * Menu Button named "More actions for {label}" ("More actions" without a label) and opens the
 * `focsd-menu-item` children as a menu (Enter, Space or Down open it on the first item, Up on the
 * last; Escape closes it and returns focus to the menu button). Choosing an item fires
 * `focsd-select`. Turning the element `disabled` closes an open menu. Clicks on the menu button and
 * in the menu stop inside the element, so a host `click` listener hears only the main action.
 *
 * @attr {string} label - The main action's text; also names the group and the menu button.
 * @prop {string} label - The main action's text; also names the group and the menu button.
 * @attr {boolean} open - Whether the menu is open.
 * @prop {boolean} open - Whether the menu is open.
 * @fires {CustomEvent<import('./menu-base.js').MenuSelectDetail>} focsd-select - Fired when an item is chosen. `detail.value` is its value.
 * @slot - The `focsd-menu-item` elements.
 * @csspart group - The group around both buttons.
 * @csspart main - The primary action button (a `focsd-button`).
 * @csspart menu-button - The button that opens the menu.
 * @csspart menu - The menu element.
 */
export class FocsdSplitButtonBase extends FocsdMenuBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    ...FocsdMenuBase.properties,
    variant: { reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Tag of the main action button. */
  static buttonTag = 'focsd-button';

  #toggle = new TriggerToggle(() => this.menu.matches(':popover-open'));

  constructor() {
    super();
    /** @type {'plain' | 'action' | 'quiet' | 'critical'} The look of both buttons, as on `focsd-button`. */
    this.variant = 'plain';
    /** Turns both buttons off. */
    this.disabled = false;
  }

  /**
   * The menu button in the shadow root.
   * @returns {HTMLElement | null}
   * @override
   */
  get trigger() {
    return this.renderRoot?.querySelector('[part~="menu-button"]') ?? null;
  }

  #onMenuButtonDown = () => this.#toggle.press();

  /** @param {MouseEvent} event */
  #onMenuButtonClick = (event) => {
    event.stopPropagation();

    if (this.#toggle.release()) this.closeMenu();
    else this.openMenu('first');
  };

  /**
   * A pointer click on an item: chosen here (the base's host listener never hears it), so the
   * host's `click` stays the main action's.
   * @param {MouseEvent} event
   */
  #onMenuClick = (event) => {
    event.stopPropagation();
    const item = event.composedPath().find((n) => n instanceof FocsdMenuItemBase);

    if (!item || item.disabled) return;
    /** @type {import('./menu-base.js').MenuSelectDetail} */
    const detail = { value: item.value, item };

    this.dispatchEvent(new CustomEvent('focsd-select', { bubbles: true, detail }));
    this.closeMenu();
  };

  /** @override */
  updated() {
    super.updated();

    // Turning the buttons off also closes a menu that is open.
    if (this.disabled && this.open) this.closeMenu();
  }

  /** @override */
  render() {
    const tag = unsafeStatic(/** @type {typeof FocsdSplitButtonBase} */ (this.constructor).buttonTag);
    const label = this.label || nothing;

    /* eslint-disable lit-a11y/click-events-have-key-events -- the menu's click only stops item clicks at the shadow root; the base's host keydown handles the keyboard */
    // Static html always builds an HTML result; its declared type is the wider TemplateResult.
    return /** @type {import('lit').TemplateResult<1>} */ (
      staticHtml`<div part="group" role="group" aria-label=${label}>
        <${tag} part="main" variant=${this.variant} ?disabled=${this.disabled}>${this.label}</${tag}><button
          part="menu-button"
          type="button"
          aria-label=${this.label ? this.localize.term('moreActionsFor', this.label) : this.localize.term('moreActions')}
          ?disabled=${this.disabled}
          @pointerdown=${this.#onMenuButtonDown}
          @click=${this.#onMenuButtonClick}
        >${iconSvg('chevron-down')}</button>
      </div>
      <div part="menu" role="menu" aria-label=${label} popover="auto" @beforetoggle=${this.onBeforeToggle} @toggle=${this.onToggle} @click=${this.#onMenuClick}>
        <slot></slot>
      </div>`
    );
  }
  /* eslint-enable lit-a11y/click-events-have-key-events */
}
