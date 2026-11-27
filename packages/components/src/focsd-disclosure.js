import { FocsdDisclosureBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';
import { disclosureStyles } from '@focsd/primitives/styles/disclosure.js';

export class FocsdDisclosure extends FocsdDisclosureBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdDisclosureBase.styles, hostStyles, disclosureStyles, enterMotion("[part~='panel']:not([hidden])")];
}

defineElement('focsd-disclosure', FocsdDisclosure);
