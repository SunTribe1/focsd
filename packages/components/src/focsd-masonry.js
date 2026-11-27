import { FocsdMasonryBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

export class FocsdMasonry extends FocsdMasonryBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdMasonryBase.styles, hostStyles];
}

defineElement('focsd-masonry', FocsdMasonry);
