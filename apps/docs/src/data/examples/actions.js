/** Examples and accessibility notes: Actions. */
export default {
  button: {
    summary: 'Triggers an action. Four variants map to intent, and the label names the outcome.',
    html: `<focsd-button variant="action">Save changes</focsd-button>
<focsd-button>Cancel</focsd-button>
<focsd-button variant="quiet">Preview email</focsd-button>
<focsd-button variant="critical">Delete workspace</focsd-button>
<focsd-button disabled>Export (no data yet)</focsd-button>`,
    a11y: [
      'Native parity: `popovertarget`/`popovertargetaction`, `commandfor`/`command` (built-in dialog and popover commands, or a custom `--name` fired on the target as a `focsd-command` event) and the submit overrides `formaction`, `formmethod`, `formenctype`, `formnovalidate` and `formtarget`. Targets are found by id in the same tree.',
      'With submit overrides, the button submits through a temporary native submitter that is removed once the `submit` event has run: read `new FormData(form, event.submitter)` inside the handler, before any `await`.',
      'Renders a native `<button>` in its shadow root and delegates focus to it, so it is announced as a button with its slotted text as the name.',
      '`disabled` uses `aria-disabled`: the button stays focusable so people can discover it, and activation is swallowed. Explain why nearby, or with a tooltip.',
      '`type="submit"` and `type="reset"` act on the owning form, like a native button.',
      'Name the outcome ("Save changes", "Remove Lukas"), never "OK" or "Submit".',
    ],
    keyboard: [['Enter / Space', 'Activates the button']],
  },
  link: {
    summary: 'Navigates somewhere. Always underlined so links are never confused with buttons.',
    html: `<p>Read the <focsd-link href="#">migration guide</focsd-link> or check the
<focsd-link href="https://example.com" external>status page</focsd-link>.</p>`,
    a11y: [
      '`target="_blank"` adds `noopener` and announces "opens in new tab". `download`, `hreflang`, `type`, `referrerpolicy` and `ping` are forwarded.',
      'A native `<a>` inside the shadow root, with focus delegated to it.',
      '`external` opens a new tab and adds "(opens in new tab)" to the accessible name, so the change of context is announced.',
    ],
    keyboard: [['Enter', 'Follows the link']],
  },
  toggle: {
    summary: 'A button that stays pressed, for on/off formatting or view options.',
    html: `<focsd-toggle>Bold</focsd-toggle>
<focsd-toggle pressed>Show grid</focsd-toggle>`,
    a11y: [
      'A `<button aria-pressed>`; the label stays the same while the pressed state changes.',
      'Use a switch instead when the control changes a setting immediately and persistently.',
    ],
    keyboard: [['Enter / Space', 'Toggles pressed']],
  },
  'toggle-group': {
    summary: 'A set of toggles where one (or several) can be pressed, like segmented controls.',
    html: `<focsd-toggle-group label="Text alignment" name="align" value="left">
  <focsd-toggle value="left">Left</focsd-toggle>
  <focsd-toggle value="center">Center</focsd-toggle>
  <focsd-toggle value="right">Right</focsd-toggle>
</focsd-toggle-group>`,
    a11y: [
      'A labeled `role="group"` with one tab stop; arrow keys move between toggles (mirrored in right-to-left pages).',
      '`type="single"` allows at most one pressed toggle; `type="multiple"` allows any number.',
      'Form-associated: submits the pressed value(s) under `name`.',
    ],
    keyboard: [
      ['Arrow keys', 'Move between toggles'],
      ['Home / End', 'First / last toggle'],
      ['Enter / Space', 'Press the focused toggle'],
    ],
  },
  'icon-button': {
    summary: 'A square button with only an icon. The label is required and becomes its accessible name.',
    html: `<focsd-icon-button icon="trash" label="Delete file"></focsd-icon-button>
<focsd-icon-button icon="copy" label="Copy link" variant="quiet"></focsd-icon-button>
<focsd-icon-button icon="edit" label="Rename project" variant="action"></focsd-icon-button>`,
    a11y: [
      '`popovertarget` and `commandfor`/`command` work as on `focsd-button`.',
      'Named by `label` through `aria-label`; the icon is decorative (`aria-hidden`).',
      'Square at the control height (36px by default), above the 24px target minimum.',
      'Pair with a tooltip if sighted users may not recognize the icon.',
    ],
    keyboard: [['Enter / Space', 'Activates the button']],
  },
  'button-group': {
    summary: 'Visually joins related buttons and names the group.',
    html: `<focsd-button-group label="Pagination">
  <focsd-button>Previous</focsd-button>
  <focsd-button>Next</focsd-button>
</focsd-button-group>`,
    a11y: [
      'A `role="group"` with `aria-label`; each button stays its own tab stop.',
      'For a single tab stop with arrow keys, use a toolbar instead.',
    ],
  },
  toolbar: {
    summary: 'Groups controls into one tab stop with arrow-key navigation, like an editor toolbar.',
    html: `<focsd-toolbar label="Formatting">
  <focsd-toggle>Bold</focsd-toggle>
  <focsd-toggle>Italic</focsd-toggle>
  <focsd-button>Clear formatting</focsd-button>
</focsd-toolbar>`,
    a11y: [
      '`role="toolbar"` with `aria-label` and `aria-orientation`.',
      'Roving tabindex: the toolbar is a single tab stop and arrow keys move between its controls.',
    ],
    keyboard: [
      ['Arrow keys', 'Move between controls (by orientation)'],
      ['Home / End', 'First / last control'],
    ],
  },
  'split-button': {
    summary: 'A main action joined to a menu of related actions.',
    html: `<focsd-split-button label="Save" variant="action">
  <focsd-menu-item value="draft">Save as draft</focsd-menu-item>
  <focsd-menu-item value="template">Save as template</focsd-menu-item>
  <focsd-menu-item value="archive" disabled>Archive</focsd-menu-item>
</focsd-split-button>`,
    a11y: [
      'Both buttons sit in a group named by `label`. The main button reads the label; the menu button is named "More actions for {label}" ("More actions" when there is no label) and has `aria-haspopup="menu"` and `aria-expanded`.',
      'The menu is a `role=menu` of `focsd-menu-item` children with the same keyboard as `focsd-menu`. Disabled items are skipped by the arrow keys and cannot be chosen.',
      'Escape, or choosing an item, closes the menu and returns focus to the menu button.',
      'The host `click` event comes only from the main button; clicks on the menu button and in the menu stop inside the element. Choosing an item fires `focsd-select` (`detail.value`, `detail.item`).',
      '`disabled` turns off both buttons.',
    ],
    keyboard: [
      ['Enter / Space / Down', 'On the menu button: open the menu on the first item'],
      ['Up', 'On the menu button: open the menu on the last item'],
      ['Down / Up', 'Move between items'],
      ['Enter / Space', 'Choose the focused item'],
      ['Escape', 'Close the menu and return to the menu button'],
    ],
  },
  'copy-button': {
    summary: 'An icon button that copies text to the clipboard and says it did.',
    html: `<p>API key <code id="api-key">sk_live_51H8</code> <focsd-copy-button from="api-key" label="Copy API key"></focsd-copy-button></p>
<p>Install guide <focsd-copy-button value="https://focsd.dev/install" label="Copy install guide link"></focsd-copy-button></p>`,
    a11y: [
      'The button is named "Copy" unless you set `label`; name it after what it copies when a page has several ("Copy API key").',
      'The name stays the same after a copy. A polite status region says "Copied" (or `copied-label`), and the icon turns to a check for 2 seconds (an alert icon when the copy failed).',
      'When the browser refuses the write, the status says "Copy failed" and the element fires `focsd-error`; it never says "Copied" for a copy that did not happen.',
      "With `from`, it copies the value of the form control with that id, or the trimmed text of any other element. Without the Clipboard API (pages not served over HTTPS) it falls back to `execCommand('copy')`.",
      'It fires `focsd-copy` with `detail.text` after a copy. `focsd-code` uses it for its "Copy code" button.',
    ],
    keyboard: [['Enter / Space', 'Copy the text']],
  },
};
