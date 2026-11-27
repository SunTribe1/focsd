import { FocsdDisclosureBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';
import { disclosureStyles } from '@focsd-dev/primitives/styles/disclosure.js';

export class FocsdDisclosure extends FocsdDisclosureBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [FocsdDisclosureBase.styles, hostStyles, disclosureStyles, enterMotion("[part~='panel']:not([hidden])")];
}

defineElement('focsd-disclosure', FocsdDisclosure);
