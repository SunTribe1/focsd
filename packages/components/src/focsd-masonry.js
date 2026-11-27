import { FocsdMasonryBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

export class FocsdMasonry extends FocsdMasonryBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdMasonryBase.styles, hostStyles];
}

defineElement('focsd-masonry', FocsdMasonry);
