import { FocsdCheckboxGroupBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldsetStyles } from '@focsd/primitives/styles/fieldset.js';
import './focsd-checkbox.js';

export class FocsdCheckboxGroup extends FocsdCheckboxGroupBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdCheckboxGroupBase.styles, hostStyles, fieldsetStyles];
}

defineElement('focsd-checkbox-group', FocsdCheckboxGroup);
