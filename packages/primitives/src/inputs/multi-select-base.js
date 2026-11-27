import { FocsdComboboxBase } from './combobox-base.js';

/**
 * Multi-select: a combobox with `multiple` on. Options toggle and chosen values show as removable
 * tags. Supports option groups, `select-all`, `max` and `clearable` like focsd-combobox.
 *
 * @fires input - Fired on every user edit of the value.
 * @fires change - Fired when the user commits a change to the value or state.
 */
export class FocsdMultiSelectBase extends FocsdComboboxBase {
  constructor() {
    super();
    this.multiple = true;
  }
}
