/**
 * A strict consumer must see `| null` wherever the runtime can return null (types C1). These fail
 * when the declarations are emitted with `strict: false`, which drops `| null` from inferred types.
 */
import { deepActiveElement } from '@focsd/primitives/utils';
import {
  FocsdDatePickerBase,
  FocsdHoverCardBase,
  FocsdMenuBase,
  FocsdOptionBase,
  FocsdOptionGroupBase,
  FocsdPopoverBase,
  FocsdTimeFieldBase,
  FocsdTooltipBase,
} from '@focsd/primitives';
import { exact } from './expect.js';

declare const picker: FocsdDatePickerBase;
declare const time: FocsdTimeFieldBase;
declare const popover: FocsdPopoverBase;
declare const menu: FocsdMenuBase;
declare const tooltip: FocsdTooltipBase;
declare const hoverCard: FocsdHoverCardBase;
declare const option: FocsdOptionBase;

exact<ReturnType<typeof deepActiveElement>, HTMLElement | null>(true);
exact<typeof picker.valueAsDate, Date | null>(true);
exact<typeof time.valueAsDate, Date | null>(true);
exact<typeof popover.trigger, HTMLElement | null>(true);
exact<typeof menu.trigger, HTMLElement | null>(true);
exact<typeof tooltip.trigger, Element | null>(true);
exact<typeof hoverCard.trigger, Element | null>(true);
exact<typeof option.group, FocsdOptionGroupBase | null>(true);

// The setter still accepts null (clears the value).
picker.valueAsDate = null;
