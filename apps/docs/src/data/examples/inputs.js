/** Examples and accessibility notes: complex inputs. */
const FORM_NOTE = 'Form-associated: participates in `FormData`, validation, reset, fieldset `disabled` and back/forward restore.';

export default {
  combobox: {
    summary: 'A text input that filters a list of options as you type.',
    html: `<div class="stack">
  <focsd-combobox label="Country" placeholder="Start typing" clearable>
    <focsd-option-group label="Nordics">
      <focsd-option value="dk">Denmark</focsd-option>
      <focsd-option value="fi">Finland</focsd-option>
    </focsd-option-group>
    <focsd-option-group label="Western Europe">
      <focsd-option value="fr">France</focsd-option>
      <focsd-option value="de">Germany</focsd-option>
      <focsd-option value="gb">United Kingdom</focsd-option>
    </focsd-option-group>
  </focsd-combobox>
</div>`,
    a11y: [
      '`autocomplete` is forwarded to the input (for example `country-name`, WCAG 1.3.5).',
      'APG combobox with list autocomplete: focus stays in the input and the active option is referenced with `aria-activedescendant`.',
      'Slotted `focsd-option`s are data; the visible list is rendered inside the same shadow root as the input, so the reference never crosses a shadow boundary.',
      'A polite status announces the result count ("3 results", "No results").',
      '`focsd-option-group` children render as named groups in the list; a group hides when none of its options match.',
      '`multiple` turns it into a multi-select (the same as `focsd-multi-select`). `clearable` adds a "Clear <label>" button.',
      'Typed text that does not match an option is discarded on blur; clearing the text clears the value. Set `allow-custom` to accept free text.',
      FORM_NOTE,
    ],
    keyboard: [
      ['Arrow Down / Up', 'Open and move through options'],
      ['Alt + Arrow Down', 'Open without moving'],
      ['Enter', 'Choose the active option'],
      ['Escape', 'Close; press again to clear'],
    ],
  },
  'multi-select': {
    summary: 'A list of options to choose several from, shown as removable tags. For values people type freely, use Tag input.',
    html: `<div class="stack">
  <focsd-multi-select label="Labels" value="bug" select-all max="3" clearable>
    <focsd-option-group label="Type">
      <focsd-option value="bug">Bug</focsd-option>
      <focsd-option value="feature">Feature</focsd-option>
    </focsd-option-group>
    <focsd-option-group label="Area">
      <focsd-option value="design">Design</focsd-option>
      <focsd-option value="docs">Docs</focsd-option>
      <focsd-option value="perf">Performance</focsd-option>
    </focsd-option-group>
  </focsd-multi-select>
</div>`,
    a11y: [
      'A combobox with an `aria-multiselectable` listbox; Enter toggles and keeps the list open.',
      'Each tag has a "Remove Bug" button.',
      '`value` is comma-separated; the form receives one entry per value.',
      'Shorthand for `<focsd-combobox multiple>`: groups, `clearable`, `max` and `select-all` work the same. Select all is the first row of the list (focus stays in the input), and it only picks options matching the current filter, up to `max`.',
      FORM_NOTE,
    ],
    keyboard: [
      ['Arrow keys', 'Move through options'],
      ['Enter', 'Toggle the active option'],
      ['Backspace (empty input)', 'Remove the last tag'],
      ['Escape', 'Close the list; press again to clear the typed text'],
    ],
  },
  calendar: {
    summary: 'A month grid for picking a date or a range.',
    html: `<focsd-calendar value="2026-03-14" min="2026-03-05" max="2026-04-20" locale="en-GB"></focsd-calendar>`,
    a11y: [
      'APG date grid: `role="grid"` labeled by the month heading, which is a polite live region.',
      'Each day has a full accessible name ("Saturday, 14 March 2026"), `aria-selected`, `aria-current="date"` for today, and `aria-disabled` outside `min`/`max`.',
      'One tab stop (roving tabindex); arrows are mirrored in right-to-left pages. The first day of the week comes from the locale.',
    ],
    keyboard: [
      ['Arrow keys', 'Previous / next day or week'],
      ['Page Up / Down', 'Previous / next month'],
      ['Shift + Page Up / Down', 'Previous / next year'],
      ['Home / End', 'Start / end of the week'],
      ['Enter / Space', 'Select the day'],
    ],
    more: [
      {
        id: 'events',
        title: 'Events and a legend',
        summary:
          '`events` marks days with dots: `{ date, label, kind?, color?, tone? }`, as JSON in the attribute or an array in JS. `tone` (positive, caution, critical, info) shows in every preset; `color` is a category hue the colorful Prismatic preset shows. `legend` lists each `kind` once.',
        html: `<div data-focsd-brand="prismatic">
  <focsd-calendar value="2026-11-26" locale="en-US" legend
    events='[{"date":"2026-11-03","label":"Team sync","kind":"Meeting","color":"blue"},{"date":"2026-11-10","label":"Team sync","kind":"Meeting","color":"blue"},{"date":"2026-11-07","label":"Launch review","kind":"Deadline","tone":"critical"},{"date":"2026-11-14","label":"Founders day","kind":"Holiday","color":"amber"},{"date":"2026-11-17","label":"Team sync","kind":"Meeting","color":"blue"},{"date":"2026-11-17","label":"Design critique","kind":"Review","color":"violet"},{"date":"2026-11-21","label":"Q4 plan due","kind":"Deadline","tone":"critical"}]'></focsd-calendar>
</div>`,
        a11y: [
          'The dots are decorative: each day\'s accessible name includes its events and their kinds ("Tuesday, November 17, 2026, Team sync (Meeting), Design critique (Review)"), and a tooltip shows them on hover, so nothing depends on color.',
          'The legend is a list labeled "Event types" (localizable as `calendarLegend`).',
          'Up to three dots show per day; every event is still named in the label.',
        ],
      },
    ],
  },
  'date-picker': {
    summary: 'A date field with a calendar dialog: type the date or pick it.',
    html: `<div class="stack"><focsd-date-picker label="Departure" value="2026-03-14" min="2026-03-05" locale="en-GB"></focsd-date-picker></div>`,
    a11y: [
      '`autocomplete`, `step` (in days), `valueAsDate`, `valueAsNumber` and `showPicker()` work as on a native date input.',
      'Typing is always allowed: the input shows the expected format ("YYYY-MM-DD") in its description and reports invalid or out-of-range dates.',
      'The "Choose date" button opens a modal `<dialog>` labeled "Choose date"; focus lands on the selected day and returns to the button on close.',
      FORM_NOTE,
    ],
    keyboard: [
      ['Enter (in the input)', 'Submit the form'],
      ['Calendar keys', 'As the calendar'],
      ['Escape', 'Close the dialog without changing'],
    ],
  },
  'date-range-picker': {
    summary: 'Start and end dates, typed or picked as one range.',
    html: `<div class="stack"><focsd-date-range-picker label="Trip dates" value-start="2026-05-04" value-end="2026-05-08" locale="en-GB"></focsd-date-range-picker></div>`,
    a11y: [
      '`autocomplete` is forwarded to both inputs.',
      'A `role="group"` named by the label, with two labeled inputs ("Start date", "End date") and one "Choose dates" button.',
      'In the dialog the first pick sets the start and the second the end; every day in the range is `aria-selected`.',
      'The form receives `<name>-start` and `<name>-end`.',
      FORM_NOTE,
    ],
  },
  'time-field': {
    summary: 'Hours and minutes as keyboard-friendly segments.',
    html: `<div class="stack">
  <focsd-time-field label="Meeting time" value="09:30" hour-cycle="h23" step="5"></focsd-time-field>
  <focsd-time-field label="Alarm" value="13:05" hour-cycle="h12"></focsd-time-field>
</div>`,
    a11y: [
      '`min`, `max`, `valueAsDate`, `valueAsNumber`, `stepUp()` and `stepDown()` work as on a native time input; `step` is in minutes. Not supported: `autocomplete` (the segments are not native inputs). Use a native `<input type="time">` where autofill matters.',
      'A labeled `role="group"` of `role="spinbutton"` segments named "Hours", "Minutes" (and "AM/PM" in 12-hour mode), each with `aria-valuetext`.',
      'Segments stay in hours-then-minutes order in every script direction.',
      'The form value is always 24-hour `HH:MM`.',
      FORM_NOTE,
    ],
    keyboard: [
      ['Arrow Up / Down', 'Change the segment'],
      ['Digits', 'Type a value; moves on when complete'],
      ['Arrow Left / Right', 'Previous / next segment'],
      ['A / P (AM/PM segment)', 'Set AM / PM'],
      ['Backspace / Delete', 'Clear the segment'],
    ],
  },
  'color-picker': {
    summary: 'A color chooser with a saturation area, hue and opacity sliders, swatches, and any CSS color typed in.',
    html: `<div class="stack">
  <focsd-color-picker label="Brand color" value="#3366ff" swatches="#141a18,#f2b705,#e11d48,#16a34a"></focsd-color-picker>
  <focsd-color-picker label="Accent" inline alpha format="oklch" contrast-with="#ffffff" value="#123456"></focsd-color-picker>
</div>`,
    a11y: [
      'The saturation and brightness area is one `role="slider"` whose `aria-valuetext` reads both values ("Saturation 80%, brightness 40%").',
      'Every part works by keyboard, and the text field accepts any CSS color, so dragging is never required (WCAG 2.5.7).',
      'Swatches are a `role="radiogroup"` with roving focus; each swatch is named by its color or label.',
      'With `contrast-with`, a polite status reports the WCAG contrast ratio against that color.',
      'The pick-from-screen button only appears where the browser supports the EyeDropper API.',
    ],
    keyboard: [
      ['Left / Right', 'Saturation (area), hue or opacity (sliders)'],
      ['Up / Down', 'Brightness (area), hue or opacity (sliders)'],
      ['Shift + arrows', 'Bigger steps'],
      ['Page Up / Down', 'Brightness ±10 (area), hue ±30° or opacity ±10% (sliders)'],
      ['Home / End', 'Saturation 0 / 100 (area), minimum / maximum (sliders)'],
      ['Arrow keys (swatches)', 'Move between swatches; Enter or Space picks one'],
      ['Enter', 'Apply the typed color'],
      ['Escape', 'Close the popover and return to the button'],
    ],
  },
  'tag-input': {
    summary:
      'A field that turns typed values into removable tags on Enter or a comma, with optional suggestions. To choose only from a list, use Multi-select.',
    html: `<div class="stack">
  <focsd-tag-input label="Skills" value="Accessibility,CSS" max="6" placeholder="Add a skill"></focsd-tag-input>
  <focsd-tag-input label="Languages">
    <focsd-option value="de">German</focsd-option>
    <focsd-option value="fr">French</focsd-option>
    <focsd-option value="ja">Japanese</focsd-option>
  </focsd-tag-input>
</div>`,
    a11y: [
      'Tags are a list; each has a "Remove {tag}" button.',
      'Adding, removing, duplicates and the maximum are announced in a polite status.',
      'Pasting a list (commas or new lines) adds every item at once.',
      'With `focsd-option` suggestions the input is an APG combobox with `aria-activedescendant`.',
      'The form gets one entry per tag under `name`, so servers never split a string.',
    ],
    keyboard: [
      ['Enter, comma (the `separator`) or Tab', 'Add the typed text as a tag'],
      ['Shift+Tab (in the input)', 'Move to the tags: the one last visited, or the last tag'],
      ['Tab / Shift+Tab (on a tag)', 'Move to the input / leave the component: the tags are one tab stop'],
      ['Backspace (empty input)', 'Move to the last tag'],
      ['Backspace / Delete on a tag', 'Remove it'],
      ['Left / Right', 'Move between tags and the input'],
      ['Home / End (on a tag)', 'First tag / back to the input'],
      ['Down / Up', 'Move through suggestions'],
      ['Escape', 'Close the suggestions'],
    ],
    more: [
      {
        id: 'sortable',
        title: 'Sortable',
        summary: 'Tags the user can put in order, for example skills by strength.',
        html: `<focsd-tag-input label="Skills, strongest first" name="skills" value="Accessibility,CSS,Lit" sortable></focsd-tag-input>`,
        a11y: [
          'With `sortable`, each tag gets a "Reorder {tag}" button before its text. It shares the one tab stop of the remove buttons; the arrow keys move between all tag buttons.',
          'Grabbing, each move, the drop and a cancel are announced in the tag input’s polite status.',
          'A drop updates `values` (the form gets the tags in the new order) and fires `input` and `change`, after a cancelable `focsd-reorder` with `detail.from`, `detail.to` and `detail.value`.',
        ],
        keyboard: [
          ['Space / Enter (on a handle)', 'Grab the tag, or drop it'],
          ['Arrow keys', 'Move the grabbed tag one place (Left and Right mirrored right to left)'],
          ['Escape', 'Put the tag back where it was'],
        ],
      },
    ],
  },
  'phone-field': {
    summary: 'A phone number with a searchable country picker; the value is international (E.164).',
    html: `<div class="stack">
  <focsd-phone-field label="Mobile" default-country="GB" preferred="GB,US,IE"></focsd-phone-field>
</div>`,
    a11y: [
      'One `role="group"` named by the label holds a "Country" combobox and a `type="tel"` input.',
      'The tel input is described by your `hint`, then an example number for the chosen country, then the shown message, and uses `autocomplete="tel-national"`. Style the example with `::part(example)`; `::part(hint)` is your hint, as on every control.',
      'Typing or pasting a number with `+` or `00` switches the country, announced in a polite status.',
      'Invalid numbers report "Enter a valid United Kingdom phone number"; pass `validator` for stricter checks.',
      'The value and the form entry are E.164 (`+442071838750`), so servers never parse local formats.',
    ],
    keyboard: [
      ['Type in Country', 'Filter by name, code or dial code (+353)'],
      ['Down / Up', 'Move through countries'],
      ['Home / End (open list)', 'First / last country'],
      ['Enter', 'Choose the country'],
      ['Escape', 'Close the list and keep the country'],
    ],
  },
  'file-upload': {
    summary: 'A drop zone and file chooser, with type and size checks.',
    html: `<div class="stack"><focsd-file-upload label="Attachments" accept=".pdf,image/png" multiple max-size="1000000" hint="PDF or PNG, up to 1 MB"></focsd-file-upload></div>`,
    a11y: [
      '`capture`, `webkitdirectory` and `showPicker()` reach the native file picker.',
      'A visible "Choose files" button opens the native picker, so dragging is never required (WCAG 2.5.7).',
      'Rejected files are reported in a `role="alert"` region and never added; a polite status reports "2 files selected".',
      'Each file has a "Remove report.pdf" button; focus returns to the choose button after removal.',
      'Files cannot be restored after back/forward navigation (browsers do not allow it).',
    ],
  },
  command: {
    summary: 'A searchable command palette, opened with a button or, if you opt in, ⌘/Ctrl + K.',
    html: `<focsd-button commandfor="cmd-demo" command="show-modal">Open command palette</focsd-button>
<focsd-command id="cmd-demo">
  <focsd-command-item value="new-project" group="Projects" shortcut="N">New project</focsd-command-item>
  <focsd-command-item value="open-project" group="Projects">Open project</focsd-command-item>
  <focsd-command-item value="invite" group="People">Invite member</focsd-command-item>
  <focsd-command-item value="theme" group="Settings">Toggle theme</focsd-command-item>
</focsd-command>`,
    a11y: [
      'A modal `<dialog>` with a combobox that filters a listbox of commands, grouped with named `role="group"`s.',
      'Arrow order always matches the order on screen.',
      'Focus returns to the element that was focused before opening.',
      'The `shortcut="mod+k"` attribute is opt-in, so it never clashes with page shortcuts by default.',
    ],
    keyboard: [
      ['⌘/Ctrl + K', 'Toggle (with `shortcut="mod+k"`)'],
      ['Arrow Up / Down', 'Move through commands (wraps around)'],
      ['Home / End', 'First / last command'],
      ['Enter', 'Run the command (fires `focsd-select`) and close'],
      ['Escape', 'Close'],
    ],
  },
  'date-field': {
    summary: 'A date typed into day, month and year segments, in the order the locale uses.',
    html: `<div class="stack">
  <focsd-date-field label="Date of birth" name="dob" value="1990-03-15" locale="en-US"></focsd-date-field>
  <focsd-date-field label="Start date" name="start" locale="en-GB" min="2026-01-01" max="2026-12-31" hint="Any day in 2026"></focsd-date-field>
  <focsd-date-field label="Deadline" name="deadline" required></focsd-date-field>
</div>`,
    a11y: [
      'A labeled `role="group"` of `role="spinbutton"` segments named "Day", "Month" and "Year", in the order the locale writes them. The month segment speaks its name ("March") through `aria-valuetext`; an empty segment reads "Empty".',
      'Impossible dates, such as February 30 or February 29 in a year that is not a leap year, are never moved to a nearby day: `value` stays empty and the field reports "Enter a real date, such as 2026-02-28."',
      'A year only counts once all four digits are typed. Leaving a segment halfway through clears it, so "19" is never read as the year 19.',
      'Pasting `2026-10-15`, or a date written in the locale order such as `15/10/2026` in `en-GB`, fills every segment. Only digits count: a two-digit year, or a date with a month name such as "Oct 15, 2026", is ignored.',
      '`min`, `max`, `required` and `valueAsDate` work as on a native date input, with plain messages for each. The form value is always `YYYY-MM-DD`.',
      'Form-associated: participates in `FormData`, validation, reset, fieldset `disabled` and back/forward restore. Restore brings back a half-typed date.',
    ],
    keyboard: [
      ['Arrow Up / Down', 'Change the segment; wraps at the ends'],
      ['Digits', 'Type a value; moves on when complete'],
      ['Arrow Left / Right', 'Previous / next segment'],
      ['Backspace / Delete', 'Clear the segment; Backspace on an empty segment moves to the previous one'],
      ['Paste', 'Fill every segment from an ISO or locale date'],
    ],
  },
  listbox: {
    summary: 'A list that stays on screen, for choosing one value or several.',
    html: `<div class="stack">
  <focsd-listbox label="Shipping speed" name="ship" value="standard">
    <focsd-option value="standard">Standard (5–7 days)</focsd-option>
    <focsd-option value="express">Express (2 days)</focsd-option>
    <focsd-option value="overnight" disabled>Overnight</focsd-option>
  </focsd-listbox>
  <focsd-listbox label="Toppings" name="toppings" multiple hint="Pick as many as you like.">
    <focsd-option-group label="Cheese">
      <focsd-option value="mozzarella">Mozzarella</focsd-option>
      <focsd-option value="feta">Feta</focsd-option>
    </focsd-option-group>
    <focsd-option-group label="Vegetables">
      <focsd-option value="olives">Olives</focsd-option>
      <focsd-option value="peppers">Peppers</focsd-option>
    </focsd-option-group>
  </focsd-listbox>
  <focsd-listbox label="Size" name="size" orientation="horizontal" value="m">
    <focsd-option value="s">Small</focsd-option>
    <focsd-option value="m">Medium</focsd-option>
    <focsd-option value="l">Large</focsd-option>
  </focsd-listbox>
</div>`,
    a11y: [
      'A labeled `role="listbox"` that takes focus itself; the active option is pointed to with `aria-activedescendant`, so screen readers read each option as the arrows move. Groups are named `role="group"`s.',
      'With one value, the selection follows the active option, as in a native list box. With `multiple`, the list is `aria-multiselectable` and moving never changes the selection on its own: Space does.',
      'Disabled options are announced as unavailable and skipped by the arrows and by typing. The arrows stop at the first and last option instead of wrapping.',
      'Listbox or list? Use `focsd-listbox` for a form value that should always be on screen: it is form-associated and submits one entry per selected value. Use `focsd-list` with `selectable` for navigation-style choice, such as picking which message to read.',
      "Options are data: each row shows the option's `label` (or its text), not rich content such as icons or markup inside the `focsd-option`. Set the selection with the listbox's `value` or `values`; writing `option.selected` from code does not change it (the `selected` attribute sets the default). Give each option its `value` as an attribute: a `value` set only as a property on a `focsd-option` is not picked up until the options change again.",
      'Form-associated: participates in `FormData`, `required` validation, reset (back to the `value` attribute or the options marked `selected`), fieldset `disabled` and back/forward restore.',
    ],
    keyboard: [
      ['Arrow Down / Up', 'Next / previous option (Right / Left with `orientation="horizontal"`)'],
      ['Home / End', 'First / last option'],
      ['Letters', 'Next option starting with the letters typed; type quickly to search several'],
      ['Space', 'Select or clear the active option (`multiple`)'],
      ['Shift + Arrow', 'Select from the last chosen option to the next one; moving back deselects (`multiple`)'],
      ['Shift + Space', 'Select every option from the last chosen one to the active one (`multiple`)'],
      ['Ctrl / ⌘ + A', 'Select every option, or none when all are selected (`multiple`)'],
    ],
  },
  'date-time-picker': {
    summary: 'A date and a time chosen together: type both, or pick them in one dialog.',
    html: `<div class="stack">
  <focsd-date-time-picker label="Meeting" name="meeting" value="2026-03-16T09:30" step="15" min="2026-03-01T08:00" max="2026-03-31T18:00" hour-cycle="h23"></focsd-date-time-picker>
  <focsd-date-time-picker label="Reminder" name="reminder" required hint="We send it at this time"></focsd-date-time-picker>
</div>`,
    a11y: [
      'One labeled `role="group"` holds a text input named "Date", a "Choose date and time" button and a time field named "Time", so each part can be typed without opening the dialog.',
      'The button opens a modal dialog named "Choose date and time" with the calendar, a second time field and a Done button. Picking a day keeps the dialog open; Done applies the day and time, closes it and returns focus to the button. Escape closes it and changes nothing.',
      'There is no time zone. The value is the local wall-clock time, `YYYY-MM-DDTHH:mm`, as on a native `datetime-local` input; your app converts it to or from a zone or UTC.',
      '`min` and `max` use the same format and compare the whole timestamp, so `2026-03-01T07:45` is before a `min` of `2026-03-01T08:00`. `step` is in minutes and sets how far the arrow keys move the minutes. Values have minute precision: seconds in `value`, `min` or `max` (`09:30:59`) are accepted and dropped.',
      'A date without a time, or a time without a date, reports "Enter a date and time." `required` reports the same message when both are empty.',
      'Form-associated: participates in `FormData`, validation, reset, fieldset `disabled` and back/forward restore.',
    ],
    keyboard: [
      ['Tab', 'Date input, then the dialog button, then the time segments'],
      ['Arrow keys (calendar)', 'Move between days; Enter picks one and keeps the dialog open'],
      ['Arrow Up / Down (time)', 'Change hours or minutes by `step`'],
      ['Digits (time)', 'Type hours and minutes; moves on when complete'],
      ['Escape', 'Close the dialog without changing the value'],
    ],
  },
  'swatch-picker': {
    summary: 'A short list of colors to choose one from, with an optional custom color.',
    html: `<div class="stack">
  <focsd-swatch-picker label="Label color" name="color" value="#ff6347" swatches="#ff6347,#2e8b57,#123456"></focsd-swatch-picker>
  <focsd-swatch-picker label="Theme" name="theme" allow-custom required hint="Pick one, or add your own">
    <focsd-option value="#0f766e" color="#0f766e">Teal</focsd-option>
    <focsd-option value="#7c2d12" color="#7c2d12">Rust</focsd-option>
  </focsd-swatch-picker>
</div>`,
    a11y: [
      'A `role="radiogroup"` named by the label. The `color` attribute of an option is its color (its `value` is used only when there is no `color`), and the value that is set and submitted is that color as lower-case hex. Each swatch is a radio named by its option text, else the CSS color name that matches exactly (such as "tomato"), else its hex value. Color names are English; give options a `label` to localize them.',
      'The chosen swatch shows a check mark and a ring, so the choice is not shown by color alone. Swatch borders keep 3:1 against the surface, and swatches keep their colors in forced-colors mode.',
      'One tab stop. Arrow keys move to the next swatch and choose it, and wrap at the ends; skipped swatches are disabled ones.',
      'With `allow-custom`, a "Custom color" button opens a popup with a color picker. Escape closes it and returns focus to the button. A custom color shows a check mark on the button; no radio is checked.',
      'Form-associated: submits the lower-case hex value, supports `required`, reset, fieldset `disabled` and restore. A restored value that is not a color, or not a swatch without `allow-custom`, becomes empty.',
    ],
    keyboard: [
      ['Tab', 'Moves to the chosen swatch (or the first), then to the custom color button'],
      ['Arrow keys', 'Move to the next or previous swatch and choose it'],
      ['Home / End', 'First or last swatch'],
      ['Space / Enter', 'Choose the focused swatch, or open the custom color popup'],
      ['Escape', 'Close the custom color popup'],
    ],
  },
};
