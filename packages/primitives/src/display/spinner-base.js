import { html } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';

/**
 * Loading spinner: role=status named by `label`.
 *
 * @csspart spinner - The spinner element.
 */
export class FocsdSpinnerBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { label: {}, size: { reflect: true } };

  constructor() {
    super();
    /** The accessible name of the spinner; defaults to the translated "Loading". */
    this.label = '';
    /** @type {'s' | 'm' | 'l' | 'xl' | undefined} Preset size: `s` (16px), `m` (24px, the default), `l` (40px) or `xl` (56px). For any other size, set `--focsd-spinner-size`. */
    this.size = undefined;
  }

  /** @override */
  updated() {
    this.setAttribute('role', 'status');
    this.setAttribute('aria-label', this.label || this.localize.term('loading'));
  }

  /** @override */
  render() {
    return html`<span part="spinner" aria-hidden="true"></span>`;
  }
}
