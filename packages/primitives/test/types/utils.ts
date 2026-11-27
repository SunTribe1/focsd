/**
 * The curated entries (quality B10): app helpers from `/utils`, author helpers from `/internal`, and
 * the model typedefs from the root (types I2, M1).
 */
import {
  announce,
  deepActiveElement,
  parseAmount,
  parseISODate,
  registerIconLibrary,
  registerTranslation,
  type IconLibrary,
  type Translation,
} from '@focsd/primitives/utils';
import { cssomStyle, sortTableRows, uid, warnOnce, type SortDirection } from '@focsd/primitives/internal';
import type {
  BlockPlacement,
  ComboboxOption,
  Placement,
  Tone,
  IconLibrary as RootIconLibrary,
  SortDirection as RootSortDirection,
  ToastOptions,
  Translation as RootTranslation,
} from '@focsd/primitives';
import { exact } from './expect.js';

announce('Saved');
announce('Failed', { politeness: 'assertive' });
announce('3 of 40 characters', { from: document.body });
// @ts-expect-error: politeness is polite or assertive
announce('x', { politeness: 'rude' });

exact<ReturnType<typeof deepActiveElement>, HTMLElement | null>(true);
exact<ReturnType<typeof parseAmount>, number | null>(true);
exact<ReturnType<typeof parseISODate>, Date | null>(true);

const german: Translation = { $code: 'de', $name: 'Deutsch', close: 'Zu' };
registerTranslation(german);
const library: IconLibrary = { resolve: (name) => `/icons/${name}.svg` };
registerIconLibrary('mine', library);

exact<Translation, RootTranslation>(true);
exact<IconLibrary, RootIconLibrary>(true);
exact<SortDirection, RootSortDirection>(true);
exact<SortDirection, 'ascending' | 'descending' | 'none'>(true);
// B14 m1: one Tone and Placement for every base that uses them.
exact<Tone, 'neutral' | 'info' | 'positive' | 'caution' | 'critical'>(true);
exact<Placement, 'top' | 'bottom' | 'left' | 'right'>(true);
exact<BlockPlacement, 'top' | 'bottom'>(true);

const sorted: { n: number }[] = sortTableRows([{ n: 2 }, { n: 1 }], 'n', 'ascending');
const option: ComboboxOption = { value: 'a', label: 'A', disabled: false, group: '' };
const toast: ToastOptions = { message: 'Saved' };

void [cssomStyle, uid('x'), warnOnce, sorted, option, toast];
