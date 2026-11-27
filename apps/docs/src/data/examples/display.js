// cspell:ignore Zuletzt gespeichert
/** Examples and accessibility notes: display, feedback, layout and utilities. */
export default {
  badge: {
    summary: 'A short status label.',
    html: `<focsd-badge>Draft</focsd-badge>
<focsd-badge tone="positive">Active</focsd-badge>
<focsd-badge tone="caution">Expiring</focsd-badge>
<focsd-badge tone="critical">Overdue</focsd-badge>
<focsd-badge tone="info">Beta</focsd-badge>`,
    a11y: ['Plain inline text: the words carry the meaning, the tone color only reinforces it.'],
    more: [
      {
        id: 'indicator',
        title: 'Indicator',
        summary: 'A dot or a count on the corner of an avatar or icon, such as unread messages or who is online.',
        html: `<a href="#inbox">Inbox<focsd-badge count="3" label="unread"><focsd-icon name="info"></focsd-icon></focsd-badge></a>
<focsd-button><focsd-badge count="120" label="unread"><focsd-icon name="menu"></focsd-icon></focsd-badge>Messages</focsd-button>
<focsd-badge dot label="Online"><focsd-avatar name="Ada Lovelace"></focsd-avatar></focsd-badge>
<focsd-badge dot label="Away" placement="bottom-end"><focsd-avatar name="Grace Hopper"></focsd-avatar></focsd-badge>`,
        a11y: [
          'With `dot` or `count`, the default slot is the anchor (an avatar or icon) and the badge draws an indicator on one of its corners.',
          'The indicator is hidden from screen readers. Visually hidden text says the same thing: the count and the `label` ("3 unread"), or the dot’s `label` ("Online"). Inside a link or button it becomes part of the name, with a space on each side, such as "Inbox 3 unread" or "120 unread Messages".',
          'The visible count stops at `max` (99 by default, shown as "99+"); the hidden text keeps the real number.',
          'A `count` of 0 shows the anchor alone and adds nothing to the name.',
          'A dot needs a `label`; without one it is decorative, adds nothing to the name, and the badge warns once in the console, because a colored dot means nothing to a screen reader.',
          '`placement` picks the corner: `top-end` (the default), `top-start`, `bottom-end` or `bottom-start`. Start and end follow the reading direction, so `top-end` is top left in right-to-left text.',
          'The count is dark text on a light red tint with a red edge; the dot is solid red with a ring in the surface color. Both stay visible in forced colors.',
        ],
      },
    ],
  },
  tag: {
    summary: 'A short label for a status, a category or a filter, with an optional icon before it and an optional remove button after it.',
    html: `<div class="stack">
  <div class="row">
    <focsd-tag tone="caution" shape="pill">
      <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
      Waiting
    </focsd-tag>
    <focsd-tag tone="info" shape="pill">
      <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
      Shipped
    </focsd-tag>
    <focsd-tag tone="positive" shape="pill">
      <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
      Delivered
    </focsd-tag>
    <focsd-tag shape="pill">
      <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
      Canceled
    </focsd-tag>
  </div>
  <div class="row">
    <focsd-tag>Research</focsd-tag>
    <focsd-tag removable>Design</focsd-tag>
    <focsd-tag icon="star" removable>Starred</focsd-tag>
  </div>
</div>`,
    a11y: [
      'The label names the tag; the icon is decoration and hidden from assistive technology, so a status always reads in words, never by color or icon alone.',
      'A toned tag is filled with its tone and edged in it. Tones are `neutral` (default), `info`, `positive`, `caution` and `critical`.',
      'When `removable`, a real button named "Remove Design" fires `focsd-remove`; the tag does not remove itself, so your app stays in control (and can move focus sensibly).',
    ],
    keyboard: [['Enter / Space (remove button)', 'Fire `focsd-remove`']],
    more: [
      {
        id: 'colors',
        title: 'Category colors',
        summary:
          '`color` names a category hue (`blue`, `violet`, `pink`, `red`, `orange`, `amber`, `green`, `teal`). The colorful Prismatic preset shows it; other presets keep the plain or toned look, so the label still says what the tag means.',
        html: `<div class="row" data-focsd-brand="prismatic">
  <focsd-tag shape="pill" color="blue">Design</focsd-tag>
  <focsd-tag shape="pill" color="violet">Research</focsd-tag>
  <focsd-tag shape="pill" color="pink">Brand</focsd-tag>
  <focsd-tag shape="pill" color="orange">Ops</focsd-tag>
  <focsd-tag shape="pill" color="green">Growth</focsd-tag>
  <focsd-tag shape="pill" color="teal">Data</focsd-tag>
</div>`,
        a11y: ['The color only groups tags visually; the label carries the meaning, so nothing is lost without color (WCAG 1.4.1).'],
      },
      {
        id: 'sizes',
        title: 'Sizes and shapes',
        summary:
          '`size` takes `s`, `m` (default) or `l`; `shape="pill"` gives fully round ends. Use `icon` for a built-in icon or `slot="icon"` for your own.',
        html: `<div class="row">
  <focsd-tag size="s" shape="pill" tone="info" removable>
    <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
    Small
  </focsd-tag>
  <focsd-tag shape="pill" tone="info" removable>
    <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
    Medium
  </focsd-tag>
  <focsd-tag size="l" shape="pill" tone="info" removable>
    <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></svg>
    Large
  </focsd-tag>
</div>`,
        a11y: ['The remove button stays at least 24 px at every size (WCAG 2.5.8 target size).'],
      },
    ],
  },
  card: {
    summary: 'A bordered container for a related group of content.',
    html: `<focsd-card>
  <h3 slot="header">Northwind Studio</h3>
  <p>26 projects, 9 members.</p>
  <p slot="footer">Updated October 3</p>
</focsd-card>`,
    a11y: [
      'A plain container with no landmark or `article` role; wrap it in `<article>` yourself when the card is a self-contained item.',
      'Do not nest cards.',
    ],
  },
  separator: {
    summary: 'A horizontal or vertical divider.',
    html: `<div class="stack">
  <p>Billing details</p>
  <focsd-separator></focsd-separator>
  <p>Invoices</p>
  <div class="row">
    <a href="#">Edit</a>
    <focsd-separator orientation="vertical"></focsd-separator>
    <a href="#">Duplicate</a>
    <focsd-separator orientation="vertical"></focsd-separator>
    <a href="#">Archive</a>
  </div>
</div>`,
    a11y: [
      '`role="separator"` with `aria-orientation`; add `decorative` (`role="none"`) to hide purely visual dividers from assistive technology.',
      'Set the color with `--focsd-separator-color` (default the edge color, visible on every theme).',
    ],
  },
  alert: {
    summary: 'A message about the state of something, with tone, title and optional actions.',
    html: `<div class="stack">
  <focsd-alert tone="positive" headline="Changes saved" closable>Your workspace name now appears on new invoices.</focsd-alert>
  <focsd-alert tone="caution" headline="Seat limit almost reached">You are using 9 of 10 seats.</focsd-alert>
  <focsd-alert tone="critical" headline="Payment failed">The card ending 4242 was declined.</focsd-alert>
  <focsd-alert tone="info" headline="Scheduled maintenance">Sunday 02:00–03:00 UTC.</focsd-alert>
</div>`,
    a11y: [
      'Static by default. Set `live="polite"` (`role="status"`) or `live="assertive"` (`role="alert"`) only when the alert appears in response to something.',
      'Tone always comes with an icon and a headline in words, never color alone.',
      '`closable` adds a close (×) button named "Close". It fires a cancelable `close` (it does not bubble), then hides the alert; cancel it to keep the alert or to remove it yourself.',
    ],
  },
  avatar: {
    summary: 'A person or entity, as a photo or initials.',
    html: `<focsd-avatar name="Amara Okafor"></focsd-avatar>
<focsd-avatar name="Lukas Brandt" size="l"></focsd-avatar>
<focsd-avatar name="Priya Raman" size="s"></focsd-avatar>`,
    a11y: [
      '`role="img"` named by `name`; falls back to initials when there is no image or it fails.',
      'Add `decorative` when the name is already shown next to it.',
    ],
  },
  'avatar-group': {
    summary: 'Several avatars in a compact stack, with an overflow count.',
    html: `<focsd-avatar-group label="Project members" max="3">
  <focsd-avatar name="Amara Okafor"></focsd-avatar>
  <focsd-avatar name="Lukas Brandt"></focsd-avatar>
  <focsd-avatar name="Priya Raman"></focsd-avatar>
  <focsd-avatar name="Tomás Herrera"></focsd-avatar>
  <focsd-avatar name="Mei Chen"></focsd-avatar>
</focsd-avatar-group>`,
    a11y: ['A labeled `role="group"`; avatars over `max` collapse into "+2", announced as "2 more".'],
  },
  kbd: {
    summary: 'A keyboard key or shortcut.',
    html: `<p>Press <focsd-kbd>Ctrl</focsd-kbd> + <focsd-kbd>K</focsd-kbd> to search.</p>`,
    a11y: ['Renders a native `<kbd>`.'],
  },
  skeleton: {
    summary: 'A placeholder shape while content loads.',
    html: `<div class="stack" role="group" aria-busy="true" aria-label="Loading profile">
  <focsd-skeleton shape="circle"></focsd-skeleton>
  <focsd-skeleton lines="3"></focsd-skeleton>
</div>`,
    a11y: [
      'Hidden from assistive technology (`aria-hidden`). Mark the loading container with `aria-busy="true"` and announce completion if it matters.',
      'The shimmer stops under reduced motion.',
    ],
  },
  spinner: {
    summary: 'An indeterminate loading indicator.',
    html: `<div class="row">
  <focsd-spinner size="s"></focsd-spinner>
  <focsd-spinner></focsd-spinner>
  <focsd-spinner size="l" label="Saving"></focsd-spinner>
  <focsd-spinner size="xl"></focsd-spinner>
  <focsd-spinner style="--focsd-spinner-size: 5rem; --focsd-spinner-color: var(--focsd-positive)"></focsd-spinner>
</div>`,
    a11y: [
      'A polite `role="status"` named by `label` (default "Loading").',
      'Under reduced motion it pulses instead of rotating.',
      "`size` picks a preset: `s` (16px), `m` (24px, the default), `l` (40px) or `xl` (56px). For any other size set `--focsd-spinner-size`; the ring's thickness follows it. `--focsd-spinner-color` and `--focsd-spinner-track` set its colors.",
    ],
  },
  progress: {
    summary: 'Progress of a task, known or indeterminate.',
    html: `<div class="stack">
  <focsd-progress label="Uploading report.pdf" value="40"></focsd-progress>
  <focsd-progress label="Preparing export" indeterminate></focsd-progress>
</div>`,
    a11y: ['`role="progressbar"` with `aria-valuenow/min/max` and a required `label`; indeterminate omits `aria-valuenow`.'],
    more: [
      {
        id: 'ring',
        title: 'Ring',
        summary: 'Progress as a ring, with the percentage in the center, for a compact space such as a card or a toolbar.',
        html: `<focsd-progress variant="ring" label="Uploading report.pdf" value="40" show-value></focsd-progress>
<focsd-progress variant="ring" label="Syncing" indeterminate></focsd-progress>
<focsd-progress variant="ring" label="Saving" value="70" style="--focsd-progress-ring-size: 1.5rem"></focsd-progress>`,
        a11y: [
          'The ring is the same `role="progressbar"` as the bar, named by `label`, with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`; the drawing is hidden from assistive technology.',
          'With `show-value` the percentage appears in the center. It is hidden from screen readers, which already read the value from `aria-valuenow`.',
          'While `indeterminate`, there is no `aria-valuenow` and the ring turns. When reduced motion is preferred it stops turning and shows a still arc.',
          'Like the bar, the track is a sunk band with a thin edge-colored outline on each side. The arc against the band measures 6.33:1 (light), 10.02:1 (dark) and 16.39:1 (contrast), and the outline against the page 3.63:1, 3.63:1 and 21:1, so both the value and the ring’s extent meet the 3:1 non-text minimum.',
          'In forced colors the arc uses `Highlight`, the band `Canvas` and its outlines `CanvasText`.',
          'Set `--focsd-progress-ring-size` to change its size (3rem by default).',
        ],
      },
    ],
  },
  meter: {
    summary: 'A measurement within a known range, such as usage or a score.',
    html: `<div class="stack"><focsd-meter label="Seats used" value="9" min="0" max="10" high="8" optimum="0" value-text="9 of 10 seats"></focsd-meter></div>`,
    a11y: [
      '`role="meter"` with `aria-valuetext`; the range color is backed by the value text, so color is not the only signal.',
      'Use progress for tasks, meter for measurements.',
    ],
  },
  'visually-hidden': {
    summary: 'Text for screen readers only.',
    html: `<p>Total <focsd-visually-hidden>(including tax)</focsd-visually-hidden> €120</p>`,
    a11y: ['Hidden visually, still read. Becomes visible when focus is inside it.'],
  },
  icon: {
    summary: 'An icon from the built-in set or your own library (Lucide, Font Awesome, custom), decorative or labeled.',
    html: `<focsd-icon name="check"></focsd-icon>
<focsd-icon name="alert-triangle" label="Warning"></focsd-icon>
<focsd-icon name="search" label="Search"></focsd-icon>
<focsd-icon name="calendar"></focsd-icon>`,
    a11y: [
      'Decorative (`aria-hidden`) by default; with `label` it becomes `role="img"` with that name.',
      'Bring your own icons with `registerIconLibrary`, or slot your own SVG. See [Icons](/foundations/icons/).',
      '`mirror` flips directional icons in right-to-left text.',
      'Uses `currentColor`, so it follows the text color in every theme.',
    ],
  },
  'qr-code': {
    summary: 'A QR code for a link or short text, drawn as an SVG image that stays sharp at any size.',
    html: `<focsd-qr-code value="https://focsd.dev" label="QR code for focsd.dev"></focsd-qr-code>
<focsd-qr-code
  value="https://focsd.dev/docs"
  label="QR code for the Focsd docs"
  size="160"
  error-correction="H"
  style="--focsd-qr-code-ink: #000; --focsd-qr-code-surface: #fff"
></focsd-qr-code>`,
    a11y: [
      'The code is one image named by `label`. Say where the code leads ("QR code for focsd.dev") rather than "QR code"; the element warns once in the console when `label` is missing.',
      'Show the link or text next to the code too: not everyone can scan one.',
      'Colors follow the theme, so dark themes draw a light-on-dark (reversed) code, which some scanners refuse. For print or scanning set `--focsd-qr-code-ink: #000; --focsd-qr-code-surface: #fff`.',
      'Pages with a strict style policy (no inline styles) set `--focsd-qr-code-ink` and `--focsd-qr-code-surface` in a stylesheet rather than a `style` attribute.',
      'In forced colors the code stays black on white, since a code drawn in system colors may not scan.',
      'A value too long for any QR code draws an empty image that keeps its name and fires `focsd-error` with `detail.reason` `too-long`.',
    ],
    keyboard: [],
  },
  'loading-overlay': {
    summary: 'Covers a form or panel with a spinner while it loads or saves, and keeps people from editing it meanwhile.',
    html: `<focsd-loading-overlay id="save-overlay" label="Saving changes">
  <form class="stack">
    <focsd-text-field label="Team name" value="Platform"></focsd-text-field>
    <focsd-textarea label="Release notes" value="Faster search and a new export option."></focsd-textarea>
    <focsd-button id="save-button" variant="action">Save</focsd-button>
  </form>
</focsd-loading-overlay>`,
    script: `const overlay = document.getElementById('save-overlay');
const save = () => new Promise((done) => setTimeout(done, 1500)); // your save

// run() shows the overlay until save() finishes (or fails).
document.getElementById('save-button').addEventListener('click', () => overlay.run(save));`,
    a11y: [
      'While `active`, the content is `inert` (no focus, no clicks, hidden from assistive technology) and marked `aria-busy`.',
      '"Loading" (or `label`) is announced when loading starts and "Loaded" when it ends, through a polite status region. When focus moves to the overlay, its name already says "Loading", so the status stays quiet until "Loaded".',
      'An overlay that is already `active` when it first renders neither announces nor moves focus; only later changes of `active` do.',
      'If focus was inside the content, it moves to the overlay while loading and comes back afterwards; if that element is gone, it goes to the first focusable element in the content. Focus elsewhere on the page is left alone.',
      'Use `label` to say what is happening ("Saving changes"); keep it short. For richer content, put an element with `slot="label"` inside (its text is announced), and `slot="indicator"` for your own image or animation in place of the spinner.',
      'No glue code for the common cases: `run(save)` shows it until `save()` settles, and `busy-on-submit` turns it on when a form inside posts to the server.',
      'In forced colors the overlay is an opaque system surface with an outline.',
    ],
    keyboard: [],
  },
  'format-number': {
    summary: 'Shows a number, price, percentage, measurement or file size the way readers in their language expect it.',
    html: `<p>Downloads: <focsd-format-number value="1234567" notation="compact"></focsd-format-number></p>
<p>Price: <focsd-format-number value="1234.5" type="currency" currency="EUR" locale="de"></focsd-format-number></p>
<p>Conversion: <focsd-format-number value="0.256" type="percent"></focsd-format-number></p>
<p>Speed: <focsd-format-number value="50" type="unit" unit="kilometer-per-hour"></focsd-format-number></p>
<p>File: <focsd-format-number value="1500" type="bytes"></focsd-format-number>,
  disk image: <focsd-format-number value="1536" type="bytes" binary></focsd-format-number></p>
<p lang="fr">Total : <focsd-format-number value="1234.5"></focsd-format-number></p>`,
    a11y: [
      'The text sits in a `<data>` element whose `value` is the raw number, so scripts and machines can read the exact figure.',
      'Without `locale` it follows the nearest `lang` attribute, so the separators match the language around it and screen readers read it in that language.',
      'Write the unit in `unit` or `currency` rather than next to the number, so it is formatted and read together with it.',
      'It is plain inline text: it takes the surrounding font and color, and adds no role or focus stop.',
      'A value that is not a number shows nothing (and warns in the console), rather than "NaN".',
      'With `type="bytes"` the size is scaled to its unit first (kB, or KiB with `binary`), so `notation="compact"` changes nothing and `notation="scientific"` gives text such as "1.5E0 KiB". Leave `notation` at `standard` for sizes.',
    ],
    keyboard: [],
  },
  'relative-time': {
    summary: 'Shows when something happened, or will happen, as "3 minutes ago" or "in 2 hours", and keeps the text current.',
    html: `<p>Comment posted <focsd-relative-time datetime="2026-10-15T10:41:00Z"></focsd-relative-time></p>
<p>Invoice sent <focsd-relative-time datetime="2026-10-05T09:00:00Z" format="auto"></focsd-relative-time></p>
<p>Next backup <focsd-relative-time datetime="2026-10-16T02:00:00Z"></focsd-relative-time></p>
<p lang="de">Zuletzt gespeichert <focsd-relative-time datetime="2026-10-15T09:30:00Z"></focsd-relative-time></p>`,
    a11y: [
      'The text sits in a `<time>` element whose `datetime` is the exact moment, so scripts and machines can read it.',
      'The full date and time follows the relative text as visually hidden text, so a screen reader reads "3 minutes ago, October 15, 2026 at 10:41 AM". The same text is the tooltip.',
      'It has no live region: the text updates once a minute (once an hour for older times) without being announced, which would be noise.',
      'With `format="auto"`, times more than 7 days away show the date instead, which is easier to place than "3 weeks ago".',
      'Without `locale` it follows the nearest `lang` attribute. With `locale` the text carries that `lang`, so screen readers read it in that language.',
      'Server-rendered pages show the text for the moment the server rendered it; it corrects itself when the element loads in the browser.',
    ],
    keyboard: [],
  },
  'theme-toggle': {
    summary: 'Lets people choose a light or dark theme, or follow their system, and remembers the choice.',
    html: `<focsd-theme-toggle target="#theme-toggle-demo" storage-key-prefix="docs-demo-"></focsd-theme-toggle>
<focsd-card id="theme-toggle-demo">
  <p>This panel follows the toggle. On a site, leave out <code>target</code> so the toggle sets the theme on <code>&lt;html&gt;</code>.</p>
  <focsd-button variant="action">Save</focsd-button>
</focsd-card>`,
    a11y: [
      'It is a radio group named "Color theme" (or `label`). Each option has visible text (Light, Dark, System, High contrast) beside its icon, so the choice never depends on the icon alone.',
      'The group is one Tab stop. The arrow keys move between the options and choose them, as in any radio group; Home and End go to the first and last. In right-to-left text, Left moves forward.',
      'The chosen option shows a border and a bar under it as well as a color change, and a Highlight border in forced-colors mode.',
      'System removes `data-focsd-theme`, so the page follows `prefers-color-scheme` (and `prefers-contrast`). The choice is stored as `focsd-theme` in `localStorage`; storage that is blocked is ignored.',
      "Put the tokens' `noFlashScript` in the page head so a returning visitor's theme applies before the first paint.",
    ],
    keyboard: [
      ['Tab', 'Move to the chosen option'],
      ['Arrow keys', 'Move to the next or previous option and choose it'],
      ['Home / End', 'Choose the first or last option'],
    ],
  },
  'theme-picker': {
    summary: 'Lets people choose one of the theme presets, each shown by name with a swatch of its colors.',
    html: `<focsd-theme-picker target="#theme-picker-demo" storage-key-prefix="docs-demo-" presets="harbor signal mineral"></focsd-theme-picker>
<focsd-card id="theme-picker-demo">
  <p>This panel gets the chosen <code>data-focsd-brand</code>. Load <code>@focsd-dev/tokens/presets.css</code> for its colors, type and corners to change.</p>
  <focsd-button variant="action">Save</focsd-button>
</focsd-card>`,
    a11y: [
      'It is a radio group named "Theme preset" (or `label`). Each card is a radio named by its text ("Harbor"); the first is "Wayfinding (default)", which removes the preset.',
      'The swatch (action, route and surface colors, in the current light or dark scheme) is decorative and hidden from assistive technology. The chosen card has a check mark and a heavier border, so the choice never depends on color.',
      'The group is one Tab stop; the arrow keys move between the cards and choose them, Home and End go to the first and last, and Left moves forward in right-to-left text.',
      'High contrast always wins: under `data-focsd-theme="contrast"` or `prefers-contrast: more` a preset keeps its type and corners but not its colors.',
      'The choice is stored as `focsd-brand` in `localStorage`; storage that is blocked is ignored.',
    ],
    keyboard: [
      ['Tab', 'Move to the chosen card'],
      ['Arrow keys', 'Move to the next or previous card and choose it'],
      ['Home / End', 'Choose the first or last card'],
    ],
  },
  stat: {
    summary: 'A key figure with a label and its change, such as revenue up 12% from last month.',
    html: `<div class="stack">
  <focsd-stat label="Revenue" value="48200" format="currency USD 0" period="last month" delta="0.124"></focsd-stat>
  <focsd-stat label="Churn" value="0.032" format="percent 1" period="last month" delta="-0.008" good="down"></focsd-stat>
  <focsd-stat label="Open tickets" value="213" delta="0"></focsd-stat>
</div>`,
    a11y: [
      'A group named by its `label`. The value, then the change, are read as words: "Up 12.4% from last month, good". An arrow is only decoration.',
      'The change is never carried by color alone: the direction is in the words, and the good or bad judgement is visible text, not only a green or red tint.',
      '`delta` is a fraction under the default `delta-format` (0.12 is 12%); the sign sets the direction unless `trend` is set. `good="down"` marks a fall as good news, for costs or churn.',
      '`value` can be a number or any text. Format numbers with `format`: a short form (`currency USD`, `currency EUR 0`, `percent 1`, `compact`, `unit kilometer`, `decimal 2`, where a trailing number is the most decimals), JSON for any other `Intl.NumberFormat` options, or a property.',
      'With `href`, the label is a link.',
    ],
    more: [
      {
        id: 'animated',
        title: 'Counting up',
        summary: 'With `animate` the figure counts to each new value. Reduced motion shows the final value at once.',
        html: `<div class="stack"><focsd-stat id="stat-live" label="Active users" value="1200" animate period="yesterday" delta="0.05"></focsd-stat>
<focsd-button id="stat-live-button">Add 340 users</focsd-button></div>`,
        script: `const tile = document.getElementById('stat-live');

document.getElementById('stat-live-button').addEventListener('click', () => {
  tile.value = Number(tile.value) + 340;
});`,
        a11y: [
          'The counting text is hidden from screen readers; a visually hidden copy holds the final value, so nothing is read out while the digits change.',
          'Under `prefers-reduced-motion: reduce` the value changes at once, with no counting.',
          'The property is `animated` (the attribute is `animate`), because every element already has an `animate()` method.',
        ],
      },
    ],
  },
  'animated-number': {
    summary: 'A number that counts to its value, for figures that change on screen.',
    html: `<p>Total: <focsd-animated-number id="count-demo" value="1280" format="decimal 0" duration="900"></focsd-animated-number> orders</p>
<focsd-button id="count-demo-button">Add 120 orders</focsd-button>`,
    script: `const number = document.getElementById('count-demo');

document.getElementById('count-demo-button').addEventListener('click', () => {
  number.value += 120;
});`,
    a11y: [
      'The counting digits are hidden from assistive technology. A visually hidden copy of the final value is what is read, once, so a screen reader never hears 1,281, 1,282, 1,283.',
      'Under `prefers-reduced-motion: reduce` the text is the final value in the same frame: there is no counting.',
      '`format` takes a short form (`decimal 0`, `currency USD`, `percent 1`, `compact`) or `Intl.NumberFormat` options (JSON as an attribute); an invalid format warns once and falls back to the plain number. `from` sets where a count starts and `duration` how long it takes, in milliseconds.',
      'The change is not announced as a live region. If people need to hear it, announce it from your own code.',
    ],
  },
  'status-dot': {
    summary: 'A small shape that shows a status: online, offline, busy, warning, error or unknown.',
    html: `<div class="stack">
  <focsd-status-dot status="online" label-visible></focsd-status-dot>
  <focsd-status-dot status="busy" label-visible></focsd-status-dot>
  <focsd-status-dot status="warning" label="Disk almost full" label-visible></focsd-status-dot>
  <focsd-status-dot status="error" label-visible></focsd-status-dot>
  <focsd-status-dot status="offline" label-visible></focsd-status-dot>
  <focsd-status-dot status="neutral" label-visible></focsd-status-dot>
</div>`,
    a11y: [
      'Every status has its own shape (filled, ring, bar, triangle, cross, dash) as well as its own color, so it works in grayscale and for color-blind readers.',
      'It is an image named by its status ("Online"). A custom `label` goes first and the status stays in the name ("Disk almost full, Warning"), so assistive technology always hears the status. Without `label-visible` the name is only read.',
      'Unknown statuses fall back to neutral, named "Unknown".',
      '`pulse` adds a slow halo to an online dot. It beats twice (about 4 seconds) and stops, so it never runs for more than 5 seconds. It is hidden under reduced motion and in forced colors, and it only animates `transform` and `opacity`.',
      'In forced colors every shape is drawn in the system text color, so the shape alone carries the status.',
    ],
  },
  'image-compare': {
    summary: 'A before and after pair of pictures with a draggable divider.',
    html: `<focsd-image-compare label="Bridge, 1990 and today" style="max-inline-size: 28rem">
  <img slot="before" src="/media/bridge-1990.svg" alt="The bridge in 1990, brown steel" width="800" height="450" />
  <img slot="after" src="/media/bridge-today.svg" alt="The bridge today, painted red" width="800" height="450" />
</focsd-image-compare>`,
    a11y: [
      'The divider handle is a slider (`role="slider"`) from 0 to 100, with the value said in words: "60% before image". Both pictures\' `alt` texts are in its description, so a screen reader hears what each side shows.',
      'The before image sits on the inline-start side (left in left-to-right text, right in right-to-left), and the slider value is how much of the before image shows.',
      'Dragging works anywhere on the figure, not only on the handle, and a drag moves focus to the handle. `focsd-position-change` fires once at the end of a drag and on each key press.',
      'Give both pictures real `alt` text. A missing `alt` is warned about once, because the slider has nothing to describe without it.',
      'With `orientation="vertical"` the divider is horizontal and the before image is on top.',
    ],
    keyboard: [
      ['Arrow keys', 'Move the divider by 1 (Left and Right swap in right-to-left text)'],
      ['Shift + arrow / Page Up / Page Down', 'Move the divider by 10'],
      ['Home / End', 'Show all of the after image / all of the before image'],
    ],
    more: [
      {
        id: 'vertical',
        title: 'Vertical',
        summary: 'A starting `position` and a vertical divider.',
        html: `<focsd-image-compare orientation="vertical" position="30" label="Bridge, vertical" style="max-inline-size: 20rem">
  <img slot="before" src="/media/bridge-1990.svg" alt="The bridge in 1990" width="800" height="450" />
  <img slot="after" src="/media/bridge-today.svg" alt="The bridge today" width="800" height="450" />
</focsd-image-compare>`,
        a11y: [
          'Up and Right arrows raise the value and Down and Left lower it, as for any slider (APG), so the divider moves down when you press Up. The value is how much of the before image shows.',
        ],
      },
    ],
  },
};
