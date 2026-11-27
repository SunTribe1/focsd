import type { FocsdButton, FocsdSelect } from '@focsd/components';

const button: FocsdButton = document.createElement('focsd-button');
button.variant = 'action';
button.disabled = true;
const select = document.querySelector('focsd-select');
if (select) {
  const chosen: string = select.value;
  select.showPicker();
  void chosen;
}
const typed: FocsdSelect | null = select;
// @ts-expect-error: not a property of focsd-button
button.notAProperty = 1;
void typed;
