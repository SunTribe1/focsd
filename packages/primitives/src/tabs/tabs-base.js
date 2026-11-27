import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { edgeIndex, nextIndex } from '../internal/roving.js';
import { FocsdTabBase } from './tab-base.js';
import { FocsdTabPanelBase } from './tab-panel-base.js';

/**
 * Tabs with automatic activation. Children: tabs (FocsdTabBase) and panels (FocsdTabPanelBase), paired by order.
 * Arrow keys move and activate (mirrored in RTL), Home/End jump, disabled tabs are skipped.
 *
 * @fires change - Fired when the user commits a change to the value or state.
 * @slot - Default content.
 * @slot tab - The `focsd-tab` elements (assigned to this slot automatically).
 * @csspart panels - The panels element.
 * @csspart tablist - The tablist element.
 */
export class FocsdTabsBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    selected: { type: Number, reflect: true },
    label: {},
  };

  constructor() {
    super();
    /** The index of the selected tab. */
    this.selected = 0;
    /** The accessible name of the tab list. */
    this.label = '';
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('click', this.#onClick);
  }

  /**
   * The tabs, in order.
   * @returns {FocsdTabBase[]}
   */
  get tabs() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdTabBase);
  }

  /**
   * The tab panels, in order.
   * @returns {FocsdTabPanelBase[]}
   */
  get panels() {
    return [...(this.children ?? [])].filter((el) => el instanceof FocsdTabPanelBase);
  }

  /** @override */
  willUpdate() {
    // Correct an out-of-range or disabled `selected` before rendering, so it renders once.
    const fallback = this.#fallback();

    if (fallback !== null) this.selected = fallback;
  }

  /** @override */
  updated() {
    this.#sync();
  }

  /**
   * The first enabled tab when `selected` does not point at an enabled tab, else null.
   * @returns {number | null}
   */
  #fallback() {
    const { tabs } = this;
    const valid = Number.isInteger(this.selected) && this.selected >= 0 && this.selected < tabs.length && !tabs[this.selected]?.disabled;

    if (valid || !tabs.length) return null;
    const fallback = edgeIndex('first', tabs.length, this.#isDisabled);

    return fallback >= 0 && fallback !== this.selected ? fallback : null;
  }

  #sync = () => {
    const { tabs, panels } = this;
    // Tabs added or changed after the last update (slotchange) can leave `selected` invalid.
    const fallback = this.#fallback();

    if (fallback !== null) {
      this.selected = fallback;

      return;
    }

    tabs.forEach((tab, i) => {
      const active = i === this.selected;
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
      const panel = panels[i];

      if (panel) {
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', tab.id);
        panel.hidden = !active;
      }
    });
    panels.slice(tabs.length).forEach((panel) => {
      panel.hidden = true;
    });
  };

  /** @param {number} index */
  #isDisabled = (index) => this.tabs[index]?.disabled ?? true;

  /** @param {number} index */
  #activate(index) {
    if (index < 0) return;
    const changed = index !== this.selected;
    this.selected = index;
    this.tabs[index]?.focus();

    if (changed) this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** @param {KeyboardEvent} event */
  #onKeyDown = (event) => {
    const { tabs } = this;
    const current = tabs.indexOf(/** @type {FocsdTabBase} */ (event.target));

    if (current < 0) return;
    const forward = getComputedStyle(this).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const backward = forward === 'ArrowRight' ? 'ArrowLeft' : 'ArrowRight';
    let next;

    if (event.key === forward) next = nextIndex(current, 1, tabs.length, this.#isDisabled);
    else if (event.key === backward) next = nextIndex(current, -1, tabs.length, this.#isDisabled);
    else if (event.key === 'Home') next = edgeIndex('first', tabs.length, this.#isDisabled);
    else if (event.key === 'End') next = edgeIndex('last', tabs.length, this.#isDisabled);
    else return;
    event.preventDefault();
    this.#activate(next);
  };

  /** @param {MouseEvent} event */
  #onClick = (event) => {
    const tab = event.composedPath().find((node) => node instanceof FocsdTabBase);

    if (!tab || tab.disabled) return;
    this.#activate(this.tabs.indexOf(tab));
  };

  /** @override */
  render() {
    return html`
      <div part="tablist" role="tablist" aria-label=${this.label || nothing}><slot name="tab" @slotchange=${this.#sync}></slot></div>
      <div part="panels"><slot @slotchange=${this.#sync}></slot></div>
    `;
  }
}
