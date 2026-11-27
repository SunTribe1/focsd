// cspell:ignore labelable
/** Examples and accessibility notes: basic form controls. */
const FORM_NOTE = 'Form-associated: participates in `FormData`, validation, reset and fieldset `disabled` like a native control.';

const READONLY_NOTE =
  'Do not set `readonly` here: like a native checkbox or select it has no effect, and HTML skips validation for any custom form control with a `readonly` attribute. Use `disabled`, or show the value as text.';

export default {
  'text-field': {
    summary: 'A single-line text input with its label, hint and error built in.',
    html: `<div class="stack">
  <focsd-text-field label="Workspace name" value="Northwind Studio" hint="Shown on invoices and invitations." required></focsd-text-field>
  <focsd-text-field label="Billing email" type="email" autocomplete="email"></focsd-text-field>
  <focsd-text-field label="Coupon code" value="AUTUMN" error="This code expired on October 1. Try a current code."></focsd-text-field>
  <focsd-text-field label="Username" value="northwind" success="That username is free."></focsd-text-field>
  <focsd-text-field label="Support phone" value="555 0142" warning="Add a country code so overseas customers can call."></focsd-text-field>
  <focsd-text-field label="Display name" hint="Letters, numbers and spaces." warning-pattern="[A-Za-z0-9 ]*" warning-message="Some apps cannot show special characters. You can still save it."></focsd-text-field>
</div>`,
    a11y: [
      'Native parity: `minlength`, `maxlength`, `pattern`, `size`, `inputmode`, `enterkeyhint`, `autocapitalize`, `autocorrect`, `spellcheck`, `dirname`, `readonly`, `setCustomValidity()` and the selection APIs (`select()`, `setSelectionRange()`, `setRangeText()`). Give personal-data fields an `autocomplete` token (WCAG 1.3.5). Not supported: `list` (datalist), because the ID reference cannot cross into shadow DOM. Use `focsd-combobox`.',
      'The label, hint and error render in the same shadow root as the `<input>`, so `for` and `aria-describedby` always resolve.',
      'An `error` sets `aria-invalid` and is read with the field; native constraint failures are announced after a failed submit.',
      'Hints and messages are part of the description; a new message is announced politely.',
      'Only one of `error`, `warning` and `success` shows, in that order. `warning` and `success` never block submission.',
      'Built-in validation: `error-message` is the text shown when the field fails `required`, `type`, `pattern`, `min` and the like (on submit, or `validate()`); it clears once the value is fixed. `warning-pattern` with `warning-message` shows a non-blocking warning while the value does not match. Inside a form with `focsd-error-summary`, no script is needed.',
      'Never use the placeholder as the label.',
      FORM_NOTE,
    ],
    keyboard: [['Enter', 'Submits the owning form']],
  },
  textarea: {
    summary: 'Multi-line text with an optional live character count.',
    html: `<div class="stack"><focsd-textarea label="Project description" maxlength="120" hint="Shown on the project overview."></focsd-textarea></div>`,
    a11y: [
      '`cols`, `wrap` and `textLength` work as on a native textarea.',
      'With `maxlength`, a polite live counter ("12 of 120 characters") is announced as people type.',
      FORM_NOTE,
    ],
  },
  checkbox: {
    summary: 'A single yes/no choice, with an optional mixed state.',
    html: `<div class="stack">
  <focsd-checkbox name="terms" required>I accept the terms of service</focsd-checkbox>
  <focsd-checkbox indeterminate>Select all reports</focsd-checkbox>
  <focsd-checkbox disabled>Archive (locked)</focsd-checkbox>
</div>`,
    a11y: [
      READONLY_NOTE,
      'A native checkbox inside a `<label>` that wraps the slotted text, so clicking the text toggles it.',
      '`indeterminate` exposes the mixed state.',
      '`required` reports `valueMissing` until checked.',
      FORM_NOTE,
    ],
    keyboard: [['Space', 'Toggles']],
  },
  'checkbox-group': {
    summary: 'A labeled set of related checkboxes.',
    html: `<focsd-checkbox-group label="Email me about" hint="Choose any.">
  <focsd-checkbox name="topics" value="releases" checked>Product releases</focsd-checkbox>
  <focsd-checkbox name="topics" value="security">Security notices</focsd-checkbox>
  <focsd-checkbox name="topics" value="events" disabled>Events (unavailable)</focsd-checkbox>
</focsd-checkbox-group>`,
    a11y: [
      'A shadow `<fieldset>` and `<legend>` give the checkboxes a group name; the hint and error render inside it.',
      'Each checkbox submits on its own.',
    ],
  },
  'radio-group': {
    summary: 'A set of options where exactly one can be chosen, for short lists.',
    html: `<focsd-radio-group label="Plan" name="plan" value="team">
  <focsd-radio value="solo">Solo</focsd-radio>
  <focsd-radio value="team">Team</focsd-radio>
  <focsd-radio value="enterprise" disabled>Enterprise (contact sales)</focsd-radio>
  <focsd-radio value="education">Education</focsd-radio>
</focsd-radio-group>`,
    a11y: [
      READONLY_NOTE,
      '`role="radiogroup"` labeled by its legend; each `focsd-radio` host is `role="radio"` with `aria-checked`.',
      'One tab stop. Arrow keys move and check, skipping disabled radios.',
      FORM_NOTE,
    ],
    keyboard: [
      ['Arrow keys', 'Move to and check the next/previous radio'],
      ['Space', 'Check the focused radio'],
    ],
  },
  switch: {
    summary: 'Turns a setting on or off immediately.',
    html: `<focsd-switch name="digest" checked>Weekly digest</focsd-switch>`,
    a11y: [
      READONLY_NOTE,
      'A `<button role="switch" aria-checked>` labeled by the slotted text.',
      'Shows visible On/Off text, so the state never relies on color or position alone.',
      FORM_NOTE,
    ],
    keyboard: [['Space / Enter', 'Toggles']],
  },
  'currency-field': {
    summary: 'An amount of money: plain number while editing, formatted for the page language on blur.',
    html: `<div class="stack">
  <focsd-currency-field label="Price" currency="EUR" value="1234.5" max="10000"></focsd-currency-field>
  <focsd-currency-field label="Budget" currency="JPY" currency-display="code"></focsd-currency-field>
</div>`,
    a11y: [
      'An APG `role="spinbutton"` whose `aria-valuetext` is the formatted amount ("€1,234.50").',
      'The currency name and code are part of the accessible description.',
      "Typing accepts the page language's decimal and group symbols and pasted currency signs.",
      'The value and form entry are a dot-decimal string with the currency\'s decimals ("1234.50", "100" for yen).',
      'Out-of-range amounts report a formatted message ("Enter €10,000.00 or less").',
    ],
    keyboard: [
      ['Arrow Up / Down', 'Step by `step` (default: the smallest unit, such as one cent)'],
      ['Page Up / Down', 'Step by 10 × `step`'],
      ['Home / End', 'Jump to min / max (when set)'],
      ['Enter', 'Submits the owning form'],
    ],
  },
  'number-field': {
    summary: 'Numeric input with stepping, limits and keyboard increments.',
    html: `<div class="stack"><focsd-number-field label="Seats" value="10" min="1" max="50" hint="Between 1 and 50."></focsd-number-field></div>`,
    a11y: [
      '`valueAsNumber`, `stepUp()` and `stepDown()` work as on a native number input.',
      '`role="spinbutton"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`.',
      'The +/− buttons are named "Increase Seats" / "Decrease Seats" and kept out of the tab order; the keyboard does the same job.',
      FORM_NOTE,
    ],
    keyboard: [
      ['Arrow Up / Down', 'Step by `step`'],
      ['Page Up / Down', 'Step by 10 × `step`'],
      ['Home / End', 'Jump to min / max (when set)'],
    ],
  },
  'search-field': {
    summary: 'A search input with a clear button.',
    html: `<div class="stack"><focsd-search-field label="Search members" placeholder="Name or email"></focsd-search-field></div>`,
    a11y: ['A native `type="search"` input (role searchbox).', 'The "Clear search" button appears when there is a value.', FORM_NOTE],
    keyboard: [['Escape', 'Clears the value']],
  },
  'password-field': {
    summary: 'Password input with a show/hide toggle.',
    html: `<div class="stack"><focsd-password-field label="Password" hint="At least 12 characters."></focsd-password-field></div>`,
    a11y: [
      'The "Show password" toggle is a `<button aria-pressed>`; its name stays constant while the pressed state changes.',
      'Toggling keeps focus and the caret position.',
      '`autocomplete` defaults to `current-password`; use `new-password` on sign-up forms.',
      FORM_NOTE,
    ],
  },
  slider: {
    summary: 'A value, or a range with two thumbs, set by dragging or with the keyboard.',
    html: `<div class="stack">
  <focsd-slider label="Volume" value="40" value-text="{value}%"></focsd-slider>
  <focsd-slider label="Price" range value-low="20" value-high="80" step="5" value-text="€{value}"></focsd-slider>
</div>`,
    a11y: [
      READONLY_NOTE,
      '`valueAsNumber`, `stepUp()` and `stepDown()` work as on a native range input.',
      'Each thumb is `role="slider"` with `aria-valuenow/min/max` and `aria-valuetext` from the `value-text` template.',
      'Range thumbs are named "Minimum Price" and "Maximum Price" and cannot cross.',
      FORM_NOTE,
    ],
    keyboard: [
      ['Arrow keys', 'Step by `step`'],
      ['Page Up / Down', 'Step by 10 × `step`'],
      ['Home / End', 'Jump to min / max'],
    ],
  },
  'otp-field': {
    summary: 'One-time code entry split into single-digit cells.',
    html: `<div class="stack">
  <focsd-otp-field label="Verification code" length="6" required error-message="Enter the 6-digit code from your text message"></focsd-otp-field>
  <focsd-otp-field label="Expired code" length="6" value="482913" error="This code expired. Request a new one."></focsd-otp-field>
  <focsd-otp-field label="Backup code" length="6" value="123456" warning-pattern="(?!(\\d)\\1{5})(?!123456)\\d{6}" warning-message="This looks easy to guess. Check it before you continue."></focsd-otp-field>
  <focsd-otp-field label="Confirmed code" length="4" value="5821" success="Code confirmed."></focsd-otp-field>
</div>`,
    a11y: [
      '`autocomplete` defaults to `one-time-code`, so browsers can fill codes from SMS.',
      'A labeled `role="group"`; each cell is named "Digit n of 6".',
      'Pasting a code fills the cells from the first one.',
      "The cells take the field's state: `error`, `warning` and `success` (or `error-message` and `warning-pattern` with `warning-message`, checked for you) color every cell's border and show the message under the group.",
      FORM_NOTE,
    ],
    keyboard: [
      ['Digits', 'Fill the cell and move to the next'],
      ['Backspace (empty cell)', 'Clear the previous cell and move to it'],
      ['Arrow Left / Right', 'Previous / next cell'],
    ],
  },
  fieldset: {
    summary: 'Groups related fields under a legend, with a shared hint and error.',
    html: `<focsd-fieldset label="Shipping address" hint="We only ship within the EU.">
  <focsd-text-field label="Street"></focsd-text-field>
  <focsd-text-field label="City"></focsd-text-field>
</focsd-fieldset>`,
    a11y: [
      '`disabled` disables every control inside (native or Focsd), leaving them out of validation and the form data, like a native fieldset. Controls you disabled yourself stay disabled when the fieldset is enabled again.',
      'A shadow `<fieldset>` with `<legend>`; screen readers announce the legend when focus enters the group.',
    ],
  },
  'error-summary': {
    summary: 'Lists every error after a failed submit and links to each field. Inside a form it validates on its own.',
    html: `<form class="stack" method="dialog">
  <focsd-error-summary></focsd-error-summary>
  <focsd-text-field name="team" label="Team name" required error-message="Enter a team name"></focsd-text-field>
  <focsd-text-field name="email" type="email" label="Work email" required error-message="Enter an email address, like ana@example.com"></focsd-text-field>
  <focsd-button type="submit" variant="action">Create team</focsd-button>
</form>`,
    props: [
      {
        name: 'manual',
        type: 'boolean',
        description:
          'Turn off automatic validation. By default a summary inside a form (or tied to one with `form="id"`) checks every field on submit, shows each field\'s `error-message`, lists the errors and stops the submit.',
      },
      {
        name: 'errors',
        type: '{ field: string, message: string }[]',
        description:
          'The errors listed. Filled for you in automatic mode; set it (or call `collect()`) yourself with `manual`, for example for errors from a server.',
      },
    ],
    a11y: [
      '`role="alert"` and `tabindex="-1"`: it takes focus on a submit with errors, so the problem is announced. It does not move focus while a fix shortens the list.',
      'Each error is a link that moves focus to its field (works with shadow-DOM fields).',
      'Each field shows its own error too (a 1px critical border, an icon and the message), so the error never relies on color or on the summary alone.',
    ],
  },
  rating: {
    summary: 'A star rating, interactive or read-only.',
    html: `<div class="stack">
  <focsd-rating label="Rate this template" value="3"></focsd-rating>
  <focsd-rating label="Average rating" value="4" readonly></focsd-rating>
</div>`,
    a11y: [
      'Interactive: a `role="radiogroup"` of star radios named "1 star", "2 stars"…, one tab stop.',
      'Read-only: `role="img"` named by the label and value ("Average rating: 4 out of 5").',
      FORM_NOTE,
    ],
    keyboard: [
      ['Arrow keys', 'Change the rating (wraps around)'],
      ['Home / End', 'One star / the maximum'],
      ['Space', 'Choose the focused star'],
    ],
  },
  select: {
    summary:
      'A list of options to choose one or several from, with the keyboard behavior of a native select plus optional groups, a filter box, select all and a clear button.',
    html: `<div class="stack">
  <focsd-select label="Data region" value="eu" clearable>
    <focsd-option-group label="Europe">
      <focsd-option value="eu">EU (Frankfurt)</focsd-option>
      <focsd-option value="uk">UK (London)</focsd-option>
    </focsd-option-group>
    <focsd-option-group label="Americas">
      <focsd-option value="us">US (Virginia)</focsd-option>
      <focsd-option value="br" disabled>Brazil (São Paulo)</focsd-option>
    </focsd-option-group>
  </focsd-select>
  <focsd-select label="Notify teams" multiple searchable select-all max="3" placeholder="Choose up to 3">
    <focsd-option value="design">Design</focsd-option>
    <focsd-option value="eng">Engineering</focsd-option>
    <focsd-option value="ops">Operations</focsd-option>
    <focsd-option value="sales">Sales</focsd-option>
    <focsd-option value="support">Support</focsd-option>
  </focsd-select>
</div>`,
    a11y: [
      READONLY_NOTE,
      '`multiple` makes an `aria-multiselectable` listbox that stays open while options are toggled; the form receives one entry per value. `selectedIndex`, `selectedOptions`, `length`, `showPicker()` and option `selected`, `defaultSelected`, `label`, `index` and `text` work as on native elements. Not supported: `size` (use `focsd-list selectable` for an always-open list) and `autocomplete` (browsers only autofill native controls; use `focsd-combobox` or a native `<select>` for personal-data fields, WCAG 1.3.5).',
      'A button with `aria-haspopup="listbox"` opens a `role="listbox"` popover; focus moves into it and returns to the button on close.',
      'Typeahead jumps to matching options; disabled options (and options in a disabled group) are skipped.',
      '`focsd-option-group` makes a named `role="group"` inside the listbox, like `<optgroup>`; its `disabled` disables every option in it.',
      '`searchable` adds a filter box (a named searchbox) above the list; groups with no match are hidden. `select-all` adds a Select all / Deselect all button, and `max` stops further choices once reached (announced in a status).',
      '`clearable` adds a "Clear <label>" button that empties the selection and returns focus to the select.',
      FORM_NOTE,
    ],
    keyboard: [
      ['Enter / Space / Arrow Down / Arrow Up', 'Open the list at the selected option'],
      ['Home / End (closed)', 'Open the list at the first / last option'],
      ['Arrow Up / Down', 'Move through options'],
      ['Home / End (open)', 'First / last option'],
      ['Enter / Space', 'Choose the option and close'],
      ['Escape', 'Close without changing'],
      ['Tab', 'Close and move on'],
      ['Type a letter (open list)', 'Jump to a matching option'],
      ['Enter / Space (multiple)', 'Toggle the option; the list stays open'],
      ['Arrow Down (filter box)', 'Move to the first matching option'],
      ['Arrow Up (first option)', 'Back to the filter box'],
    ],
  },
  'rich-text': {
    summary: 'A formatting text editor for notes, descriptions and messages: headings, lists, links and inline styles.',
    html: `<div class="full"><focsd-rich-text label="Release notes" name="notes" hint="Shown to customers on the changelog" value="<h2>What's new</h2><p>Faster <strong>search</strong> and a new <a href='https://example.com'>export</a> option.</p><ul><li>Dark mode</li><li>Keyboard shortcuts</li></ul>"></focsd-rich-text></div>`,
    a11y: [
      'A multi-line `role="textbox"` named by its label, with the hint or error as its description.',
      'The toolbar is an APG toolbar: one tab stop, arrow keys between buttons, `aria-pressed` for formats, and `aria-keyshortcuts` for each shortcut.',
      "The value is HTML limited to the toolbar's formats: scripts, event handlers and unsafe links are removed, and links only accept web, mail, phone or same-site addresses.",
      'Form-associated: `name`, `required`, `disabled`, `readonly`, reset and `setCustomValidity` work like a textarea.',
      "Separate package (`@focsd/editor`, about 141 KB gzip with Tiptap and ProseMirror): load it only on pages that need it, for example with `import('@focsd/editor')`.",
    ],
    keyboard: [
      ['Ctrl/Cmd + B, I, U', 'Bold, italic, underline'],
      ['Ctrl/Cmd + K', 'Add or edit a link'],
      ['Ctrl/Cmd + Alt + 2 / 3', 'Heading 2 / 3'],
      ['Ctrl/Cmd + Shift + 7 / 8', 'Numbered / bulleted list'],
      ['Ctrl/Cmd + Z, Shift + Z', 'Undo, redo'],
      ['Tab / Shift + Tab (in a list)', 'Indent / outdent the item; elsewhere Tab leaves the editor'],
      ['Arrow keys (toolbar)', 'Move between buttons'],
    ],
  },
  field: {
    summary: 'A wrapper that gives any input, including native and third-party ones, a label, a hint and messages.',
    html: `<div class="stack">
  <focsd-field label="Email" hint="We reply within one working day">
    <input type="email" name="email" value="ada@example.com" />
  </focsd-field>
  <focsd-field label="Size" required>
    <select name="size"><option>Small</option><option>Medium</option></select>
  </focsd-field>
  <focsd-field label="Coupon code" error="This code expired on October 1. Try a current code.">
    <input name="coupon" value="AUTUMN" />
  </focsd-field>
  <focsd-field label="Delivery notes" warning="Add a gate code if the building has one.">
    <div slot="control" role="textbox" contenteditable="true" aria-multiline="true"></div>
  </focsd-field>
</div>`,
    a11y: [
      'The label is a real `<label for>` for labelable controls (native inputs and form-associated elements); for any other `[slot="control"]` element it sets `aria-labelledby`.',
      'The hint and message are light-DOM siblings of the control, referenced by `aria-describedby` (shadow roots cannot share IDs). The field keeps any `aria-describedby` ids you set.',
      '`error` uses `setCustomValidity` where the control has it, so it blocks submission, and sets `aria-invalid`; clearing it undoes both. `warning` and `success` never block.',
      'A message that changes after the first render is announced politely; one present at first render is only described.',
      'The required marker is hidden from assistive technology: set `required` on the control itself so the name and state are read.',
      'One control per field: only the first is labeled and described, so use one field per control.',
      'The field has no role of its own. Author content is never replaced; generated nodes carry `data-focsd-field`.',
    ],
    keyboard: [],
  },
  editable: {
    summary: 'A value shown as text and edited in place, on one line or many.',
    html: `<div class="stack">
  <focsd-editable label="Project name" name="project" value="Atlas" required></focsd-editable>
  <focsd-editable label="Description" name="desc" multiline placeholder="Add a description"></focsd-editable>
</div>`,
    a11y: [
      'Display mode is a button named "label: value, edit" (the visible label comes first, so the name starts with it). With no value it reads the placeholder, or "Empty".',
      'Editing swaps in a text field (a textarea with `multiline`) named by the label. The text is selected and focused. A commit refused because the value is blank with `required`, or invalid, keeps the editor open and shows the error as its description.',
      'Focus returns to the button after Enter or Escape. Moving focus to another element commits unless `keep-open-on-blur` is set, which keeps the draft open. Switching windows or tabs neither commits nor cancels.',
      'Escape stops there, so a dialog around the editable stays open. Enter during IME composition picks a candidate and does not commit.',
      'Fires one `input` and one `change` for a commit that changed the value, and nothing while typing. Escape fires `focsd-cancel`. Reset and restore leave edit mode without events.',
    ],
    keyboard: [
      ['Enter / Space', 'On the button: start editing'],
      ['Enter', 'In a single line: commit'],
      ['Ctrl/Cmd + Enter', 'In multiline: commit (Enter adds a new line)'],
      ['Escape', 'Cancel and restore the previous value'],
    ],
  },
  'segmented-control': {
    summary: 'A short row of segments for choosing one value or view, such as Day, Week or Month.',
    html: `<form class="stack" id="segmented-demo-form">
  <focsd-segmented-control label="Calendar view" name="view" value="week" hint="The calendar changes at once">
    <focsd-segment value="day">Day</focsd-segment>
    <focsd-segment value="week">Week</focsd-segment>
    <focsd-segment value="month">Month</focsd-segment>
    <focsd-segment value="year" disabled>Year</focsd-segment>
  </focsd-segmented-control>
  <output id="segmented-demo-out" for="segmented-demo-form" aria-live="polite">Showing the week</output>
</form>`,
    script: `const form = document.getElementById('segmented-demo-form');
const out = document.getElementById('segmented-demo-out');

form.addEventListener('change', (event) => {
  out.textContent = 'Showing the ' + event.target.value;
});`,
    a11y: [
      'A radio group: the control is named by its `label` and each segment is a radio. Screen readers say "Week, radio button, 2 of 4, selected".',
      'Selection follows focus, so one arrow press both moves and chooses. Use it when the choice takes effect at once, and a radio group when the person confirms with a button.',
      'One tab stop for the whole row. Disabled segments are skipped; the arrows wrap from the last segment to the first.',
      'Every segment is at least 44 px tall at every `size`, and under 20rem wide the segments stack so the labels never shrink.',
      'It is form-associated: `name`, `value`, `required`, `disabled`, `hint` and messages work as on `focsd-radio-group`, and a form reset restores the value it started with.',
      'Not a toolbar: for several buttons that each switch on and off, use `focsd-toggle-group`. [Choosing a toggle](/guides/choosing-a-toggle/) compares them.',
    ],
    keyboard: [
      ['Arrow keys', 'Move to the next or previous segment and select it (Left and Right swap in right-to-left text)'],
      ['Home / End', 'First / last segment'],
      ['Tab', 'Move into the group, then out of it'],
    ],
    more: [
      {
        id: 'icons',
        title: 'Sizes and icons',
        summary: 'A segment can carry an icon next to its text. `size` takes `s`, `m` or `l`.',
        html: `<div class="stack">
  <focsd-segmented-control label="Layout" size="l" value="list">
    <focsd-segment value="list" icon="menu">List</focsd-segment>
    <focsd-segment value="board" icon="calendar">Calendar</focsd-segment>
  </focsd-segmented-control>
  <focsd-segmented-control label="Density" size="s" value="cozy">
    <focsd-segment value="compact">Compact</focsd-segment>
    <focsd-segment value="cozy">Cozy</focsd-segment>
  </focsd-segmented-control>
</div>`,
        a11y: [
          'The icon is decoration: the segment is named by its text, so an icon never replaces the label.',
          'Size changes the font and the inline padding only. Targets stay 44 px tall.',
          'In forced colors the selected segment uses the system selected-item colors, not a tint.',
        ],
      },
    ],
  },
  'signature-pad': {
    summary: 'A signature drawn with a mouse, finger or pen, or typed as a name instead.',
    html: `<form class="stack" id="sign-demo-form">
  <focsd-signature-pad label="Signature" name="signature" hint="Draw with a mouse, finger or pen, or choose Type instead." required></focsd-signature-pad>
  <div class="row">
    <focsd-button type="submit" variant="action">Accept the agreement</focsd-button>
    <focsd-button type="reset">Start again</focsd-button>
  </div>
  <output id="sign-demo-out" for="sign-demo-form" aria-live="polite"></output>
</form>`,
    script: `const form = document.getElementById('sign-demo-form');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const file = new FormData(form).get('signature');
  document.getElementById('sign-demo-out').textContent = file ? 'Signed: ' + file.name + ' (' + file.size + ' bytes)' : 'Please sign first.';
});`,
    a11y: [
      'Drawing is not the only way in. "Type instead" turns the pad into a text field labeled "Type your name for Signature", and the name is drawn as a typed signature. People who cannot draw, or use a keyboard or a screen reader, sign this way.',
      'The group is named by the label and described by the hint and any message (read once when focus enters). The canvas is an image named "Signature, signed" or "Signature, empty". A polite status says "Signature added" or "Signature cleared" after each change. When `required` and empty, the message is "Add your signature."',
      'It uses pointer events, so mouse, touch and pen all work, and it keeps `touch-action: none` on the canvas only, so the page still scrolls around it.',
      '`required` with an empty pad gives the "Required" message, anchored on the mode button (or on the typed field in typed mode).',
      'The form receives a PNG file named `signature.png`, plus `signature-typed` set to `true` when the name was typed. It is empty, not a blank image, until someone signs.',
      'The ink is black unless you set `pen-color`, so a signature stays readable on paper in a dark theme. In forced colors the canvas draws in the system text color.',
      "Agents never fill this field: WebMCP leaves the signature pad out of its tools, so nothing signs on a person's behalf.",
    ],
    keyboard: [
      ['Tab', 'Move through Type instead (or Draw instead), Undo and Clear'],
      ['Enter / Space', 'Press the focused button'],
      ['Type your name', 'In typed mode, an ordinary text field'],
    ],
  },
};
