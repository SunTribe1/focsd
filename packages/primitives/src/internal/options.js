import { edgeIndex, nextIndex } from './roving.js';
import { FocsdOptionBase } from '../select/option-base.js';
import { FocsdOptionGroupBase } from '../select/option-group-base.js';

/**
 * An option as plain data.
 * @typedef {object} ComboboxOption
 * @property {string} value
 * @property {string} label
 * @property {boolean} disabled
 * @property {string} group Label of the option's group, or ''.
 */

/**
 * @param {FocsdOptionBase} option
 * @param {FocsdOptionGroupBase | null} group
 * @returns {ComboboxOption}
 */
const toData = (option, group) => ({
  value: option.value || option.label,
  label: option.label,
  disabled: option.disabled || Boolean(group?.disabled),
  group: group?.label ?? '',
});

/**
 * Read `focsd-option` children (directly, or inside `focsd-option-group`s) as plain data, for
 * controls that render their own list from slotted options (combobox, tag input).
 * @param {Element} host
 * @returns {ComboboxOption[]}
 */
export const readOptions = (host) =>
  [...(host.children ?? [])].flatMap((c) =>
    c instanceof FocsdOptionBase ? [toData(c, null)] : c instanceof FocsdOptionGroupBase ? c.options.map((o) => toData(o, c)) : [],
  );

/**
 * The active index after a list key, for a list whose focus stays in a text box
 * (aria-activedescendant): from no active option (-1) Down goes to the first enabled option and Up
 * to the last; otherwise the move wraps and skips disabled options. -1 when none is enabled.
 * @param {number} current The active index, or -1.
 * @param {1 | -1} delta
 * @param {number} count
 * @param {(index: number) => boolean} isDisabled
 * @returns {number}
 */
export function stepIndex(current, delta, count, isDisabled) {
  if (current < 0 || current >= count) {
    return edgeIndex(delta > 0 ? 'first' : 'last', count, isDisabled);
  }

  return nextIndex(current, delta, count, isDisabled);
}
