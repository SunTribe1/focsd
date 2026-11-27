import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Splitter pane: one pane of a `focsd-splitter`, with its size and limits as percentages.
 *
 * @slot - The pane's content.
 */
export class FocsdSplitterPaneBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    size: { type: Number },
    min: { type: Number },
    max: { type: Number },
    collapsible: { type: Boolean },
    collapsed: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    /** Names the pane in its separator's accessible name ("Resize <label>"). */
    this.label = '';
    /** @type {number | undefined} The pane's starting size as a percentage of the splitter; unset panes share the rest. Read when the pane joins the splitter, which then keeps it current as the user resizes; setting it later does not resize the panes. */
    this.size = undefined;
    /** The smallest size, as a percentage. */
    this.min = 0;
    /** The largest size, as a percentage. */
    this.max = 100;
    /** Whether Enter on the divider collapses and restores the pane. The divider's `aria-valuemin` is then 0, the collapsed size, as in the APG window splitter. */
    this.collapsible = false;
    /** Whether the pane starts collapsed. Read when the pane joins the splitter, which then keeps it current; setting it later does not collapse or restore the pane. */
    this.collapsed = false;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    // The splitter lays panes out by this size: a CSSOM write, which a strict style-src allows.
    if (!changed.has('size')) return;

    if (this.size !== undefined && Number.isFinite(this.size)) this.style.setProperty('--_pane-size', `${this.size}%`);
    else this.style.removeProperty('--_pane-size');
  }

  /** @override */
  render() {
    return html`<slot></slot>`;
  }
}
