// A strict consumer sees `| null` where the runtime can return null (types C1, M10).
import type { FocsdDatePicker, FocsdHoverCard, FocsdOption, FocsdOptionGroup, FocsdTimeField, FocsdTooltip } from '@focsd-dev/components';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const exact = <A, B>(ok: Equal<A, B>): void => void ok;

declare const picker: FocsdDatePicker;
declare const time: FocsdTimeField;
declare const tooltip: FocsdTooltip;
declare const card: FocsdHoverCard;
declare const option: FocsdOption;

exact<typeof picker.valueAsDate, Date | null>(true);
exact<typeof time.valueAsDate, Date | null>(true);
exact<typeof tooltip.trigger, Element | null>(true);
exact<typeof card.trigger, Element | null>(true);
exact<typeof option.group, FocsdOptionGroup | null>(true);
