import { LitElement } from 'lit';
import { floorStyles } from '../floor.styles.js';
import { LocalizeController } from './localize.js';

/** Base class for every Focsd element: adopts the accessibility floor and localization. */
export class FocsdElement extends LitElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [floorStyles];

  constructor() {
    super();
    /** Translated strings: `this.localize.term(key, ...args)`. */
    this.localize = new LocalizeController(this);
  }
}
