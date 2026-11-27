import { expect, test } from 'vitest';
import { typingsProblems } from '../../../scripts/lib/typings.mjs';

/**
 * Reactive state (`_name`) and public `ids` fields still published, per file. These files belong
 * to other batches of the 2026-10-21 quality fix plan (F-list form controls, B1, B3, wave 14c-7);
 * B8/B14 tag them @internal (or make `ids` private).
 * The numbers only go down.
 */
const DEBT = {
  'types/data/carousel-base.d.ts': 3,
  'types/data/code-base.d.ts': 1,
  'types/data/image-base.d.ts': 1,
  'types/dialog/bottom-sheet-base.d.ts': 2,
  'types/forms/currency-field-base.d.ts': 2,
  'types/forms/textarea-base.d.ts': 1,
  'types/inputs/color-picker-base.d.ts': 4,
  'types/inputs/combobox-base.d.ts': 6,
  'types/inputs/command-base.d.ts': 2,
  'types/inputs/date-picker-base.d.ts': 2,
  'types/inputs/date-range-picker-base.d.ts': 1,
  'types/inputs/file-upload-base.d.ts': 4,
  'types/inputs/phone-field-base.d.ts': 6,
  'types/inputs/tag-input-base.d.ts': 7,
  'types/inputs/time-field-base.d.ts': 3,
  'types/nav/header-base.d.ts': 1,
  'types/overlays/disclosure-base.d.ts': 1,
  'types/overlays/toaster-base.d.ts': 1,
  'types/select/option-base.d.ts': 4,
  'types/select/select-base.d.ts': 4,
};

test('the built typings are clean: no stale file, no internal member beyond the recorded debt', () => {
  expect(typingsProblems(new URL('../', import.meta.url).pathname, DEBT)).toEqual([]);
});
