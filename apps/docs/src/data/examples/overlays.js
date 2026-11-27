/** Examples and accessibility notes: overlays and disclosure. */
export default {
  dialog: {
    summary: 'A modal dialog for a focused decision. The title asks the question; the body states the consequence.',
    html: `<focsd-button commandfor="dialog-demo" command="show-modal">Remove member</focsd-button>
<focsd-dialog id="dialog-demo" headline="Remove Lukas Brandt?">
  <p>Lukas loses access to 8 projects immediately. Their files stay in the workspace.</p>
  <focsd-button slot="actions" data-dialog-close value="keep">Keep member</focsd-button>
  <focsd-button slot="actions" variant="critical" data-dialog-close value="remove">Remove Lukas</focsd-button>
</focsd-dialog>`,
    a11y: [
      '`requestClose()` and Escape fire a cancelable `cancel`; `showModal()` is an alias of `show()`. `closedby="any"` also closes on a backdrop click; `closedby="none"` needs an explicit close action.',
      'Built on native `<dialog>.showModal()`: top layer, inert background, Escape to close.',
      'A close (×) button named "Close" sits in the top corner and asks to close as Escape does (a cancelable `cancel`). It comes last in the tab order, so opening the dialog focuses its content first. Add `no-close` for a dialog that must be answered with one of its actions.',
      'Open it from a button with no script: `<focsd-button commandfor="dialog-id" command="show-modal">`. Focus returns to that button on close. From your own code, call `show(opener)`.',
      'Any slotted element with `data-dialog-close` closes it; its `value` becomes `returnValue`. Put `data-autofocus` on the element that should receive focus first.',
    ],
    keyboard: [
      ['Tab', 'Moves focus within the dialog; the page behind is inert'],
      ['Escape', 'Closes (unless `closedby="none"`)'],
    ],
  },
  'alert-dialog': {
    summary: 'An interrupting confirmation for destructive or urgent decisions.',
    html: `<focsd-button commandfor="ad-demo" command="show-modal" variant="critical">Delete project</focsd-button>
<focsd-alert-dialog id="ad-demo" headline="Delete Atlas?">
  <p>This permanently deletes 26 files. You cannot undo this.</p>
  <focsd-button slot="actions" data-dialog-close value="cancel" data-autofocus>Keep project</focsd-button>
  <focsd-button slot="actions" variant="critical" data-dialog-close value="delete">Delete Atlas</focsd-button>
</focsd-alert-dialog>`,
    a11y: [
      '`requestClose()` and `closedby` work as on `focsd-dialog`; keep the default `closedby` so Escape still cancels.',
      '`role="alertdialog"`, described by its body so the consequence is read with the title.',
      'Initial focus goes to `data-autofocus` (put it on the least destructive action), otherwise the first focusable element.',
      'The destructive action names its object ("Delete Atlas").',
    ],
    keyboard: [
      ['Tab', 'Moves focus within the dialog; the page behind is inert'],
      ['Escape', 'Closes (cancels)'],
    ],
  },
  drawer: {
    summary: 'A modal panel that slides in from an edge.',
    html: `<focsd-button commandfor="drawer-demo" command="show-modal">Open settings</focsd-button>
<focsd-drawer id="drawer-demo" headline="Workspace settings">
  <focsd-text-field label="Workspace name" value="Northwind"></focsd-text-field>
  <focsd-button slot="actions" data-dialog-close value="done" variant="action">Done</focsd-button>
</focsd-drawer>`,
    a11y: [
      '`showModal()`, `requestClose()` and `closedby` work as on `focsd-dialog`.',
      'A modal dialog anchored to `end` (default), `start` or `bottom`, with the same focus behavior as `focsd-dialog`, including its close (×) button (`no-close` hides it).',
      'The slide animation is off under reduced motion.',
    ],
    keyboard: [['Escape', 'Closes']],
  },
  popover: {
    summary: 'A non-modal panel attached to a trigger, for filters and small forms.',
    html: `<focsd-popover label="Filter members" closable>
  <focsd-button slot="trigger">Filters</focsd-button>
  <focsd-checkbox name="active">Active only</focsd-checkbox>
  <focsd-button variant="action">Apply</focsd-button>
</focsd-popover>`,
    a11y: [
      'The panel is a non-modal `role="dialog"` named by `label`; the trigger gets `aria-expanded` and `aria-haspopup="dialog"`.',
      'Focus moves to the first focusable element in the panel and returns to the trigger on Escape or outside click.',
      '`closable` adds a close (×) button named "Close" to the panel, useful on touch screens and for panels with a form. It returns focus to the trigger.',
      'Positioned with CSS anchor positioning in the top layer (`popover` API).',
    ],
    keyboard: [
      ['Enter / Space (trigger)', 'Open or close'],
      ['Escape', 'Close and return focus to the trigger'],
    ],
  },
  'hover-card': {
    summary: 'A rich preview (a profile, a link) that opens on hover or keyboard focus.',
    html: `<p>Reviewed by
  <focsd-hover-card>
    <a slot="trigger" href="#">Ada Lovelace</a>
    <focsd-avatar name="Ada Lovelace"></focsd-avatar>
    <span>Mathematician, Analytical Engine notes.</span>
    <focsd-button variant="action">Follow</focsd-button>
  </focsd-hover-card>
</p>`,
    a11y: [
      'Opens on hover after a delay and on keyboard focus; stays open while the pointer or focus is on the trigger or the card; Escape closes it without moving focus (WCAG 1.4.13).',
      'The card follows the trigger in focus order, so Tab moves into it, and leaving with Tab closes it.',
      'The trigger is described by the card text and reports `aria-expanded`.',
      'On touch, a tap follows the link and a long press opens the card.',
      'Never put the only way to reach something in a hover card: keep the same content reachable elsewhere.',
    ],
    keyboard: [
      ['Tab', 'Focus the trigger (opens), then move into the card'],
      ['Escape', 'Close the card, keep focus'],
    ],
  },
  'bottom-sheet': {
    summary: 'A panel from the bottom edge that rests at snap heights; swipe it, or use the handle and Close button.',
    html: `<focsd-button commandfor="sheet-demo" command="show-modal">Filters</focsd-button>
<focsd-bottom-sheet id="sheet-demo" label="Filters" snap-points="40%,90%">
  <div class="stack">
    <focsd-checkbox>In stock</focsd-checkbox>
    <focsd-checkbox>On sale</focsd-checkbox>
    <focsd-button data-dialog-close value="apply" variant="action">Apply</focsd-button>
  </div>
</focsd-bottom-sheet>`,
    a11y: [
      'Modal by default: a native dialog named by `label`, with a focus trap, an inert page, Escape, and focus back on the opener.',
      'With `non-modal` it is a named region and the page stays usable.',
      'The handle is a slider ("Resize sheet", "40% of the screen"); arrow keys, Home, End, Enter and Space change the height, and a Close button closes it, so dragging is never required (WCAG 2.5.7).',
      'A drag that starts in scrolled content scrolls it; only a pull from the top moves the sheet. A downward flick dismisses.',
      'Respects the iPhone home indicator area (`env(safe-area-inset-bottom)`) and reduced motion.',
    ],
    keyboard: [
      ['Up / Down (handle)', 'Next or previous height'],
      ['Left / Right (handle)', 'Same as Down / Up'],
      ['Home / End (handle)', 'Lowest / highest height'],
      ['Enter / Space (handle)', 'Cycle heights'],
      ['Escape', 'Close (modal)'],
    ],
  },
  'floating-panel': {
    summary: 'A non-modal card that floats above the page and can be dragged anywhere on screen: notes, help, inspectors, chat.',
    html: `<focsd-button id="notes-open">Notes</focsd-button>
<focsd-floating-panel label="Notes" trigger="notes-open">
  <p>Drag me by the header, or use the move button and the arrow keys.</p>
  <focsd-textarea label="Note"></focsd-textarea>
</focsd-floating-panel>`,
    a11y: [
      'A non-modal `role="dialog"` named by `label`; the page stays usable while it is open, and the trigger gets `aria-expanded`.',
      'Dragging has a keyboard alternative (WCAG 2.5.7): the move button moves the panel with the arrow keys.',
      'The panel always stays fully on screen, including when the window is resized, and remembers where it was moved.',
      'Several panels can be open at once; the one you click or focus comes to the front.',
    ],
    keyboard: [
      ['Enter / Space (trigger)', 'Open or close'],
      ['Arrow keys (move button)', 'Move 10px'],
      ['Shift + arrow keys (move button)', 'Move 50px'],
      ['Escape', 'Close and return focus to the trigger'],
    ],
  },
  tooltip: {
    summary: 'A short description shown on hover and focus.',
    html: `<focsd-tooltip text="Copies a link anyone in the workspace can open">
  <focsd-icon-button icon="copy" label="Copy link"></focsd-icon-button>
</focsd-tooltip>`,
    a11y: [
      'The trigger gets the text as `aria-description`, so it is read with the control; the visual tooltip is `aria-hidden` to avoid double reading.',
      'Stays open while hovered and dismisses on Escape (WCAG 1.4.13).',
      'Never put essential information or interactive content in a tooltip.',
    ],
    keyboard: [
      ['Tab (to the trigger)', 'Show'],
      ['Escape', 'Hide'],
    ],
  },
  menu: {
    summary: 'A list of actions opened from a button.',
    html: `<focsd-menu label="Project actions">
  <focsd-button slot="trigger">Actions</focsd-button>
  <focsd-menu-item value="rename">Rename</focsd-menu-item>
  <focsd-menu-item value="duplicate">Duplicate</focsd-menu-item>
  <focsd-menu-item value="archive" disabled>Archive (locked)</focsd-menu-item>
  <focsd-menu-item value="delete" variant="critical">Delete</focsd-menu-item>
</focsd-menu>`,
    a11y: [
      'APG menu button: the trigger gets `aria-haspopup="menu"` and `aria-expanded`; items are `role="menuitem"`.',
      'Choosing an item fires `focsd-select` with `detail.value`, closes the menu and returns focus to the trigger.',
    ],
    keyboard: [
      ['Enter / Space / Arrow Down', 'Open at the first item'],
      ['Arrow Up', 'Open at the last item'],
      ['Arrow Up / Down', 'Move (wrapping, skips disabled items)'],
      ['Home / End', 'First / last item'],
      ['Type a letter', 'Jump to an item'],
      ['Enter / Space', 'Choose the item'],
      ['Escape', 'Close and return focus to the trigger'],
      ['Tab', 'Close'],
    ],
  },
  'context-menu': {
    summary: 'A menu opened by right-click or the keyboard on a target.',
    html: `<focsd-context-menu label="File actions">
  <div slot="target" tabindex="0" class="focsd-docs-target">report-q3.pdf (right-click or Shift+F10)</div>
  <focsd-menu-item value="open">Open</focsd-menu-item>
  <focsd-menu-item value="download">Download</focsd-menu-item>
</focsd-context-menu>`,
    a11y: [
      'Opens at the pointer on right-click or long press, or at the target with Shift+F10 or the ContextMenu key when the target has focus.',
      'Same menu semantics and keys as `focsd-menu`. Always provide another way to reach the same actions.',
    ],
    keyboard: [
      ['Shift + F10 / ContextMenu', 'Open'],
      ['Arrow Up / Down', 'Move'],
      ['Enter / Space', 'Choose the item'],
      ['Escape', 'Close'],
    ],
  },
  toaster: {
    summary: 'Brief, non-blocking notifications. Place one toaster per page and call `show()`.',
    html: `<focsd-button id="toast-demo">Save draft</focsd-button>
<focsd-button id="toast-demo-sticky">Show sticky toast</focsd-button>
<focsd-toaster id="toaster-demo"></focsd-toaster>`,
    script: `const toaster = document.getElementById('toaster-demo');
document.getElementById('toast-demo').addEventListener('click', () => {
  toaster.show({ message: 'Draft saved', tone: 'positive', action: { label: 'Undo', onClick: () => toaster.show({ message: 'Draft restored' }) } });
});
document.getElementById('toast-demo-sticky').addEventListener('click', () => {
  toaster.show({ message: 'Sync paused while offline', tone: 'caution', duration: 0 });
});`,
    props: [
      {
        name: 'show(options)',
        type: '{ message, tone?, action?: { label, onClick }, duration? = 6000 }',
        description: 'Adds a toast and returns its id. `duration: 0` keeps it until dismissed.',
      },
      { name: 'dismiss(id)', type: 'number', description: 'Removes a toast.' },
    ],
    a11y: [
      'The toaster is a polite `role="status"` live region that exists before toasts arrive, so every message is announced.',
      'Toasts never take focus. Timers pause while hovered or focused (WCAG 2.2.1); each toast has a "Dismiss notification" button.',
      'Do not put the only path to an action in a toast.',
    ],
  },
  accordion: {
    summary: 'Stacked sections that expand one (or several) at a time.',
    html: `<div class="full"><focsd-accordion>
  <focsd-accordion-item heading="Billing" open><p>Invoices are sent on the 1st of each month.</p></focsd-accordion-item>
  <focsd-accordion-item heading="Members"><p>Up to 10 seats on this plan.</p></focsd-accordion-item>
  <focsd-accordion-item heading="Security" disabled><p>Managed by your organization.</p></focsd-accordion-item>
  <focsd-accordion-item heading="Data export"><p>Exports include all files.</p></focsd-accordion-item>
</focsd-accordion></div>`,
    a11y: [
      'Items with the same `name` form an exclusive group, like `<details name>` (the accordion does this for its own items unless `multiple`).',
      'Each item renders a heading (level from `level`, default 3) wrapping a `<button aria-expanded aria-controls>`, and a `role="region"` panel labeled by the button.',
      'Set `multiple` to allow several open items.',
    ],
    keyboard: [
      ['Enter / Space', 'Toggle the section'],
      ['Arrow Up / Down', 'Previous / next header (wrapping)'],
      ['Home / End', 'First / last header'],
    ],
  },
  disclosure: {
    summary: 'A button that shows and hides one block of content.',
    html: `<focsd-disclosure summary="Show advanced options"><p>Webhook retries: 3</p></focsd-disclosure>`,
    a11y: [
      '`name` makes disclosures in the same tree an exclusive group: opening one closes the others, like `<details name>`.',
      'A `<button aria-expanded aria-controls>` and its panel in one shadow root.',
      'Fires `toggle` when it opens or closes.',
    ],
    keyboard: [['Enter / Space', 'Toggle']],
  },
  tour: {
    summary: 'A guided walk through the page, one step at a time, each pointing at an element.',
    html: `<div>
  <focsd-button id="tour-demo-start">Take the tour</focsd-button>
  <focsd-button id="tour-demo-search">Search</focsd-button>
  <focsd-button id="tour-demo-export">Export</focsd-button>
</div>
<focsd-tour id="tour-demo"></focsd-tour>`,
    script: `const tour = document.getElementById('tour-demo');
tour.steps = [
  { target: '#tour-demo-search', title: 'Search', body: 'Find any project by name or owner.' },
  { target: '#tour-demo-export', title: 'Export', body: 'Download the table as CSV.', placement: 'top' },
];
document.getElementById('tour-demo-start').addEventListener('click', () => tour.start());`,
    a11y: [
      'Each step is a non-modal dialog (`aria-modal="false"`) named by its title and described by its body, so the page stays usable: the spotlight never takes pointer events.',
      "Focus moves to each step's heading, so the title and body are read; the end of the tour returns focus to the element focused at `start()` (pass the opener as `start(index, opener)`: Safari does not focus a clicked button, so opening with the `open` attribute has no opener there).",
      'The progress ("Step 1 of 2") counts the steps whose targets are on the page when the tour starts. A step whose target is missing when reached is skipped and announced by its title ("Skipped “Filters”: it is not on this page."), or by its number when it has no title; a target removed while its step shows moves the tour on.',
      'Escape ends the tour unless `persistent` is set, or unless something in the page already handled it (a popup inside the page closing first); Skip tour always does. `close` fires either way: read `completed` to tell Finish from a dismissal. `focsd-step-change` fires with `detail.step` on every step.',
      'The target is scrolled into view, instantly under reduced motion.',
    ],
    keyboard: [
      ['Tab / Shift+Tab', 'Move between Back, Next (or Finish) and Skip tour, and on into the page'],
      ['Enter / Space', 'Activate the focused button'],
      ['Escape', 'End the tour (unless `persistent` is set)'],
    ],
  },
  toggletip: {
    summary: 'An info button that opens a short note on click, tap or Enter. The note can hold links.',
    html: `<p>
  Storage used
  <focsd-toggletip>Includes files in the trash. <a href="#billing">See billing</a></focsd-toggletip>
</p>
<p>
  Retention
  <focsd-toggletip label="About retention" placement="bottom">Deleted items are kept for 30 days.</focsd-toggletip>
</p>`,
    a11y: [
      'Unlike `focsd-tooltip`, a toggletip opens on click, so it works on touch screens, and its note may hold links: they follow the button in Tab order.',
      'The button is named "More information" unless you set `label`; name it after what it explains when a page has several. It reports `aria-expanded` and is at least 24 by 24 pixels.',
      'Opening it leaves focus on the button and copies the note’s text into a polite status region, so a screen reader reads it without moving there.',
      'Escape, clicking the button again or clicking anywhere else closes it. If focus was on a link inside, it returns to the button.',
      'The element fires `focsd-open` when the note opens and `close` when it closes.',
    ],
    keyboard: [
      ['Enter / Space', 'Open or close the note'],
      ['Tab', 'Move to a link inside the open note'],
      ['Escape', 'Close the note; focus stays on the button'],
    ],
  },
  lightbox: {
    summary: 'A gallery of thumbnails that opens each picture in a full-size viewer with previous, next and close.',
    html: `<focsd-lightbox class="full" label="Landscapes">
  <div class="row">
    <figure>
      <a href="/media/lake.svg"><img src="/media/lake.svg" alt="A lake under a pale sky" width="160" height="120" /></a>
      <figcaption>Lake at dawn</figcaption>
    </figure>
    <figure>
      <a href="/media/hill.svg"><img src="/media/hill.svg" alt="Green hills in summer" width="160" height="120" /></a>
      <figcaption>Hills near the coast</figcaption>
    </figure>
    <a href="/media/road.svg"><img src="/media/road.svg" alt="A road into the hills" width="160" height="120" /></a>
    <a href="/media/dunes.svg"><img src="/media/dunes.svg" alt="Sand dunes at noon" width="160" height="120" /></a>
  </div>
</focsd-lightbox>`,
    a11y: [
      'The thumbnails are ordinary links to the full-size pictures, so without JavaScript each one opens its picture. A click with a modifier key, or a middle click, keeps its normal meaning.',
      'The viewer is a native modal dialog named by `label` (default "Image viewer"): the page behind is inert and Escape closes it. Focus returns to the thumbnail that opened it.',
      'Focus starts on Next (or on Close when there is one picture), so the arrow keys and Enter work at once.',
      'Each change is announced politely, for example "Image 2 of 4, Hills near the coast". The counter and the caption describe the dialog.',
      'Every picture needs `alt` text: the viewer shows it, and a missing one is warned about. Captions come from a `figcaption`.',
      'Previous and Next wrap at the ends, so the counter tells you where you are. The slide fades in by opacity only, and not at all under reduced motion.',
      'Swipe horizontally on a touch screen (at least 40 px) to move between pictures. The buttons are 44 px targets and the chevrons mirror in right-to-left text.',
    ],
    keyboard: [
      ['Enter', 'Open the viewer from a thumbnail'],
      ['Arrow Left / Right', 'Previous / next picture (swapped in right-to-left text)'],
      ['Home / End', 'First / last picture'],
      ['Escape', 'Close and return to the thumbnail'],
    ],
  },
  'notification-center': {
    summary: 'A bell with an unread count that opens a panel of notifications, which the app keeps in its own list.',
    html: `<div class="row">
  <focsd-notification-center id="notify-demo"></focsd-notification-center>
  <focsd-button id="notify-demo-add">Add a notification</focsd-button>
</div>
<p id="notify-demo-log" aria-live="off"></p>`,
    script: `const center = document.getElementById('notify-demo');
const log = document.getElementById('notify-demo-log');
const ago = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();

center.notifications = [
  { id: 'build', title: 'Build 482 passed', body: 'main is green again.', time: ago(2), href: '#builds', tone: 'positive' },
  { id: 'comment', title: 'Ana commented on Pricing', body: 'Can we ship the annual plan first?', time: ago(45) },
  { id: 'payment', title: 'Payment failed', body: 'Card ending 4242 was declined.', time: ago(180), tone: 'critical' },
  { id: 'report', title: 'Weekly report ready', time: ago(1560), read: true },
];

center.addEventListener('focsd-read', (event) => {
  const ids = new Set(event.detail.ids);

  center.notifications = center.notifications.map((n) => (ids.has(n.id) ? { ...n, read: true } : n));
  log.textContent = 'Read: ' + event.detail.ids.join(', ');
});

center.addEventListener('focsd-dismiss', (event) => {
  center.notifications = center.notifications.filter((n) => n.id !== event.detail.id);
  log.textContent = 'Dismissed: ' + event.detail.id;
});

let added = 0;

document.getElementById('notify-demo-add').addEventListener('click', () => {
  added += 1;
  center.notifications = [{ id: 'new-' + added, title: 'New sign-up ' + added, time: new Date().toISOString() }, ...center.notifications];
});`,
    a11y: [
      'The bell is a button named "Notifications, 3 unread" (the count is in its name, and the visible badge is hidden from assistive technology). With `label="Alerts"` it reads "Alerts, 3 unread".',
      'It opens a non-modal panel: the page stays usable, Escape closes it and returns focus to the bell, and a click outside closes it too.',
      'The list is a real list. An unread item has a visible dot and a visually hidden "unread" before its title, so unread is never only a color. The time reads as relative text ("2 minutes ago") and the exact time is in a `time` element.',
      'New notifications that arrive while the page is open are announced politely, together, after a 2 second window ("2 new notifications"), so a burst does not interrupt a screen reader. The first list is never announced; if the center starts empty and fills from a fetch, set `loaded` once that list is in, so the first notification to arrive after it is announced too.',
      'The app owns the data. The center fires `focsd-read` (with `ids`) and `focsd-dismiss` (with `id`); answer by setting `notifications` again. Nothing changes on its own.',
      'A notification with `href` makes its title a link, and following it marks it read. "Mark all as read" covers the rest. Without notifications the panel says so.',
      'Only `http:`, `https:`, `mailto:`, relative and `#fragment` hrefs become links. Any other (such as `javascript:` or `data:`) is dropped and the title shows as plain text, so a list from a server or from users cannot run script. Titles and bodies are always text, never markup.',
      'A `tone` is also a shape and a word: critical, caution and positive notifications show an icon and are read as "Error", "Warning" or "Success" before the title. The color bar is only a bonus.',
      'The first list the center shows is never announced as new: set the notifications once they load, and only later arrivals are announced (one message per two seconds).',
      'On narrow screens the panel is fixed to the bottom of the viewport so it never runs off the edge. It is not a draggable sheet.',
    ],
    keyboard: [
      ['Enter / Space', 'Open or close the panel from the bell'],
      ['Tab', 'Move through Mark all as read, links and Dismiss buttons'],
      ['Escape', 'Close the panel and return focus to the bell'],
    ],
    more: [
      {
        id: 'markup',
        title: 'From markup',
        summary: 'Slotted `focsd-notification` elements are read as data, for a list that is written in HTML.',
        html: `<focsd-notification-center label="Alerts" max="9">
  <focsd-notification id="alert-disk" title="Disk almost full" body="92% of 500 GB used." tone="caution" time="2026-11-25T08:00:00Z"></focsd-notification>
  <focsd-notification id="alert-backup" title="Backup finished" tone="positive" time="2026-11-24T22:15:00Z" read></focsd-notification>
</focsd-notification-center>`,
        a11y: [
          '`focsd-notification` draws nothing itself: its attributes (`title`, `body`, `time`, `tone`, `href`, `read`) are the data the center reads.',
          '`max` caps the badge: with `max="9"` ten or more unread show as "9+", and the button name still says the real count.',
        ],
      },
    ],
  },
};
