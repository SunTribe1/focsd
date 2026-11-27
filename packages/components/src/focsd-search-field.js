import { FocsdSearchFieldBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldStyles } from '@focsd/primitives/styles/field.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { adornedStyles } from '@focsd/primitives/styles/adorned.js';

export class FocsdSearchField extends FocsdSearchFieldBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdSearchFieldBase.styles, hostStyles, fieldStyles, fieldLayoutStyles, adornedStyles];
}

defineElement('focsd-search-field', FocsdSearchField);
