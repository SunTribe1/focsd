import { FocsdSearchFieldBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldStyles } from '@focsd-dev/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd-dev/primitives/styles/field-layout.js';
import { adornedStyles } from '@focsd-dev/primitives/styles/adorned.js';

export class FocsdSearchField extends FocsdSearchFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdSearchFieldBase.styles, hostStyles, fieldStyles, fieldLayoutStyles, adornedStyles];
}

defineElement('focsd-search-field', FocsdSearchField);
