import { FocsdDialogBase } from './dialog-base.js';

/** Drawer: a modal dialog anchored to an edge (`placement`: end | start | bottom). */
export class FocsdDrawerBase extends FocsdDialogBase {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { placement: { reflect: true } };

  constructor() {
    super();
    /** @type {'end' | 'start' | 'bottom'} The edge the drawer slides in from. */
    this.placement = 'end';
  }
}
