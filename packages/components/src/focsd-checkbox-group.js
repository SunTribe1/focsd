import { FocsdCheckboxGroupBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { fieldsetStyles } from '@focsd-dev/primitives/styles/fieldset.js';
import './focsd-checkbox.js';

export class FocsdCheckboxGroup extends FocsdCheckboxGroupBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdCheckboxGroupBase.styles, hostStyles, fieldsetStyles];
}

defineElement('focsd-checkbox-group', FocsdCheckboxGroup);
