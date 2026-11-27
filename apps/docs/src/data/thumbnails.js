/**
 * The components gallery's thumbnails: a small, real demo per component, shown inert and hidden
 * from assistive technology (the card's name and summary describe it). `props` holds data a
 * component takes from script (rows, series, values), keyed by a selector inside the thumbnail.
 * Overlays cannot be open in a card, so theirs are drawn: real buttons on a mocked surface.
 * `zoom` shows a page-sized component at half size.
 *
 * @typedef {{ html: string, props?: Record<string, Record<string, unknown>>, zoom?: boolean }} Thumb
 */

/** A drawn surface for an overlay: a title, a line of text and real buttons. */
const mockDialog = (title, text, actions, closable = true) =>
  `<div class="gp-mock gp-mock-dialog">${closable ? '<span class="gp-mock-x" aria-hidden="true">×</span>' : ''}<strong>${title}</strong><span>${text}</span><div class="row end">${actions}</div></div>`;

/** A drawn menu under a real trigger. */
const mockMenu = (trigger, items) =>
  `<div class="gp-pop">${trigger}<div class="gp-mock gp-mock-menu">${items.map((i) => `<span>${i}</span>`).join('')}</div></div>`;

/** A drawn bubble above a real trigger. */
const mockBubble = (/** @type {string} */ trigger, /** @type {string} */ text, wide = false) =>
  `<div class="gp-pop gp-pop-up">${trigger}<div class="gp-mock gp-mock-bubble${wide ? ' wide' : ''}">${text}</div></div>`;

const DAY = 86_400_000;

const T0 = Date.UTC(2026, 10, 20, 9, 30);

/** @type {Record<string, Thumb>} */
export const THUMBS = {
  // Actions
  button: { html: '<div class="row"><focsd-button variant="action">Save</focsd-button><focsd-button>Cancel</focsd-button></div>' },
  'button-group': {
    html: '<focsd-button-group label="Pages"><focsd-button>Prev</focsd-button><focsd-button>1</focsd-button><focsd-button>Next</focsd-button></focsd-button-group>',
  },
  'copy-button': {
    html: '<div class="row"><code>npm i @focsd/components</code><focsd-copy-button value="npm i @focsd/components"></focsd-copy-button></div>',
  },
  dock: {
    html: '<focsd-dock label="Views" value="a"><focsd-dock-item value="a" icon="star">Starred</focsd-dock-item><focsd-dock-item value="b" icon="search">Search</focsd-dock-item><focsd-dock-item value="c" icon="calendar">Plan</focsd-dock-item></focsd-dock>',
  },
  'icon-button': {
    html: '<div class="row"><focsd-icon-button label="Edit" icon="edit"></focsd-icon-button><focsd-icon-button label="Copy" icon="copy"></focsd-icon-button><focsd-icon-button label="Delete" icon="trash" variant="critical"></focsd-icon-button></div>',
  },
  link: { html: '<p class="center">Read the <focsd-link href="#">getting started guide</focsd-link>.</p>' },
  'split-button': {
    html: '<focsd-split-button variant="action" label="More save options">Save<focsd-menu-item>Save as draft</focsd-menu-item></focsd-split-button>',
  },
  toggle: { html: '<div class="row"><focsd-toggle pressed>Bold</focsd-toggle><focsd-toggle>Italic</focsd-toggle></div>' },
  'toggle-group': {
    html: '<focsd-toggle-group label="Align" value="left"><focsd-toggle value="left">Left</focsd-toggle><focsd-toggle value="center">Center</focsd-toggle><focsd-toggle value="right">Right</focsd-toggle></focsd-toggle-group>',
  },
  toolbar: {
    html: '<focsd-toolbar label="Text style"><focsd-toggle pressed>B</focsd-toggle><focsd-toggle>I</focsd-toggle><focsd-toggle>U</focsd-toggle><focsd-separator orientation="vertical"></focsd-separator><focsd-button>Link</focsd-button></focsd-toolbar>',
  },

  // Forms: text input
  'text-field': { html: '<focsd-text-field label="Workspace name" value="Northwind" hint="Shown on invoices"></focsd-text-field>' },
  textarea: { html: '<focsd-textarea label="Notes" value="Ship the invoices on Friday." rows="2"></focsd-textarea>' },
  'number-field': { html: '<focsd-number-field label="Seats" value="12" min="1" max="50"></focsd-number-field>' },
  'currency-field': { html: '<focsd-currency-field label="Budget" currency="USD" value="2500"></focsd-currency-field>' },
  'phone-field': { html: '<focsd-phone-field label="Phone" country="US" value="+12025550142"></focsd-phone-field>', zoom: true },
  'password-field': { html: '<focsd-password-field label="Password" value="correct horse"></focsd-password-field>' },
  'search-field': { html: '<focsd-search-field label="Search" placeholder="Search invoices"></focsd-search-field>' },
  'otp-field': { html: '<focsd-otp-field label="Code" length="4" value="482"></focsd-otp-field>' },
  editable: { html: '<focsd-editable label="Project name" value="Atlas launch"></focsd-editable>' },
  'rich-text': {
    html: '<div class="gp-mock gp-mock-editor"><div class="gp-mock-toolbar"><b>B</b><i>I</i><u>U</u><span>Link</span></div><p><strong>Release 2.4</strong>: search is <em>twice as fast</em>.</p></div>',
  },

  // Forms: choice
  checkbox: {
    html: '<div class="stack"><focsd-checkbox checked>Email me updates</focsd-checkbox><focsd-checkbox indeterminate>Select all</focsd-checkbox></div>',
  },
  'checkbox-group': {
    html: '<focsd-checkbox-group label="Notify me about"><focsd-checkbox checked>Releases</focsd-checkbox><focsd-checkbox>Security</focsd-checkbox></focsd-checkbox-group>',
  },
  'radio-group': {
    html: '<focsd-radio-group label="Plan" value="team"><focsd-radio value="solo">Solo</focsd-radio><focsd-radio value="team">Team</focsd-radio></focsd-radio-group>',
  },
  switch: { html: '<div class="stack"><focsd-switch checked>Autosave</focsd-switch><focsd-switch>Dark mode</focsd-switch></div>' },
  'segmented-control': {
    zoom: true,
    html: '<focsd-segmented-control label="View" value="week" style="inline-size: 22rem"><focsd-segment value="day">Day</focsd-segment><focsd-segment value="week">Week</focsd-segment><focsd-segment value="month">Month</focsd-segment></focsd-segmented-control>',
  },
  select: {
    html: '<focsd-select label="Region" value="eu"><focsd-option value="eu">EU (Frankfurt)</focsd-option><focsd-option value="us">US (Virginia)</focsd-option></focsd-select>',
  },
  combobox: {
    html: '<focsd-combobox label="Country" value="ca" placeholder="Type a country"><focsd-option value="ca">Canada</focsd-option><focsd-option value="cl">Chile</focsd-option></focsd-combobox>',
  },
  'multi-select': {
    html: '<focsd-multi-select label="Teams" value="design,support"><focsd-option value="design">Design</focsd-option><focsd-option value="support">Support</focsd-option><focsd-option value="sales">Sales</focsd-option></focsd-multi-select>',
  },
  'tag-input': { html: '<focsd-tag-input label="Labels" value="urgent,billing"></focsd-tag-input>' },
  listbox: {
    html: '<focsd-listbox label="Sort by" value="newest"><focsd-option value="newest">Newest</focsd-option><focsd-option value="oldest">Oldest</focsd-option><focsd-option value="name">Name</focsd-option></focsd-listbox>',
  },
  slider: { html: '<focsd-slider label="Volume" value="60"></focsd-slider>' },
  rating: { html: '<focsd-rating label="Rating" value="4"></focsd-rating>' },

  // Forms: date and time
  calendar: { html: '<focsd-calendar value="2026-11-26"></focsd-calendar>', zoom: true },
  'date-field': { html: '<focsd-date-field label="Start date" value="2026-11-26"></focsd-date-field>' },
  'date-picker': { html: '<focsd-date-picker label="Due date" value="2026-12-04"></focsd-date-picker>' },
  'date-range-picker': {
    html: '<focsd-date-range-picker label="Trip" value-start="2026-12-04" value-end="2026-12-11" style="inline-size: 24rem"></focsd-date-range-picker>',
    zoom: true,
  },
  'date-time-picker': {
    html: '<focsd-date-time-picker label="Meeting" value="2026-12-04T14:30" style="inline-size: 24rem"></focsd-date-time-picker>',
    zoom: true,
  },
  'time-field': { html: '<focsd-time-field label="Reminder" value="09:30"></focsd-time-field>' },

  // Forms: color, files and signatures
  'color-picker': { html: '<focsd-color-picker label="Brand color" value="#0b5cad"></focsd-color-picker>' },
  'swatch-picker': {
    html: '<focsd-swatch-picker label="Label color" value="#2e8b57" swatches="#ff6347,#2e8b57,#1e90ff,#9932cc"></focsd-swatch-picker>',
  },
  'file-upload': { html: '<focsd-file-upload label="Attachments" accept=".pdf,.png"></focsd-file-upload>' },
  'signature-pad': { html: '<focsd-signature-pad label="Signature" typed typed-name="Amara Okafor"></focsd-signature-pad>' },

  // Forms: structure
  field: {
    html: '<focsd-field><label slot="label" for="gp-native">Native input</label><input id="gp-native" slot="control" value="Any control"><span slot="hint">Label, hint and messages for it</span></focsd-field>',
  },
  fieldset: {
    html: '<focsd-fieldset label="Shipping"><focsd-text-field label="City" value="Lisbon"></focsd-text-field></focsd-fieldset>',
  },
  'error-summary': {
    html: '<div class="gp-mock gp-mock-error"><strong>Fix 2 things to continue</strong><span class="gp-mock-link">Enter your full name</span><span class="gp-mock-link">Enter a valid email</span></div>',
  },

  // Overlays
  'alert-dialog': {
    html: mockDialog(
      'Delete project?',
      'This cannot be undone.',
      '<focsd-button>Cancel</focsd-button><focsd-button variant="critical">Delete</focsd-button>',
    ),
  },
  dialog: {
    html: mockDialog(
      'Invite people',
      'They get an email with a link.',
      '<focsd-button>Cancel</focsd-button><focsd-button variant="action">Send</focsd-button>',
    ),
  },
  drawer: {
    html: '<div class="gp-mock gp-mock-page"><div class="gp-mock gp-mock-side end"><span class="gp-mock-x" aria-hidden="true">×</span><strong>Filters</strong><span>Status</span><span>Owner</span></div></div>',
  },
  'bottom-sheet': {
    html: '<div class="gp-mock gp-mock-page"><div class="gp-mock gp-mock-sheet"><i></i><strong>Share</strong><span>Copy link</span></div></div>',
  },
  popover: { html: mockBubble('<focsd-button>Details</focsd-button>', 'Popover with any content', true) },
  'hover-card': {
    html: mockBubble('<focsd-link href="#">@amara</focsd-link>', '<strong>Amara Okafor</strong><span>Design lead</span>', true),
  },
  tooltip: { html: mockBubble('<focsd-icon-button label="Settings" icon="menu"></focsd-icon-button>', 'Settings') },
  toggletip: { html: mockBubble('<focsd-icon-button label="More info" icon="info"></focsd-icon-button>', 'Prices include tax', true) },
  menu: { html: mockMenu('<focsd-button>Actions</focsd-button>', ['Rename', 'Duplicate', 'Delete']) },
  'context-menu': { html: mockMenu('<div class="gp-mock gp-mock-area">Right-click here</div>', ['Copy', 'Paste']) },
  command: {
    html: '<div class="gp-mock gp-mock-command"><span class="gp-mock-input">Search commands…</span><span class="active">New invoice</span><span>Open settings</span></div>',
  },
  'floating-panel': {
    html: '<div class="gp-mock gp-mock-page"><div class="gp-mock gp-mock-float"><strong>Layers</strong><span>Header</span><span>Card</span></div></div>',
  },
  lightbox: { html: '<div class="gp-mock gp-mock-lightbox"><img src="/media/lake.svg" alt=""><span>1 / 4</span></div>' },
  'notification-center': {
    html: mockMenu(
      '<focsd-badge count="3" placement="top-end"><focsd-icon-button label="Notifications" icon="info"></focsd-icon-button></focsd-badge>',
      ['Invoice paid', 'New comment', 'Build failed'],
    ),
  },
  tour: {
    html: mockBubble(
      '<focsd-button variant="action">New project</focsd-button>',
      '<strong>Step 1 of 3</strong><span>Start here</span>',
      true,
    ),
  },

  // Navigation
  'bottom-nav': {
    html: '<focsd-bottom-nav position="static" hide-above="0" label="Main"><focsd-bottom-nav-item href="#" icon="star" current>Starred</focsd-bottom-nav-item><focsd-bottom-nav-item href="#" icon="search">Search</focsd-bottom-nav-item><focsd-bottom-nav-item href="#" icon="calendar">Plan</focsd-bottom-nav-item></focsd-bottom-nav>',
  },
  breadcrumb: {
    html: '<focsd-breadcrumb><focsd-breadcrumb-item href="#">Home</focsd-breadcrumb-item><focsd-breadcrumb-item href="#">Projects</focsd-breadcrumb-item><focsd-breadcrumb-item current>Atlas</focsd-breadcrumb-item></focsd-breadcrumb>',
  },
  footer: {
    html: '<focsd-footer style="inline-size: 26rem"><strong slot="brand">Northwind</strong><focsd-footer-section heading="Product"><a href="#">Pricing</a></focsd-footer-section><focsd-footer-section heading="Company"><a href="#">About</a></focsd-footer-section><span slot="legal">© 2026 Northwind</span></focsd-footer>',
    zoom: true,
  },
  header: {
    html: '<focsd-header collapse-below="0" style="inline-size: 26rem"><strong slot="brand">Northwind</strong><focsd-nav-menu label="Main"><focsd-nav-item href="#" current>Overview</focsd-nav-item><focsd-nav-item href="#">Pricing</focsd-nav-item></focsd-nav-menu><focsd-button slot="actions" variant="action">Sign in</focsd-button></focsd-header>',
    zoom: true,
  },
  menubar: {
    html: '<focsd-menubar label="Editor"><focsd-menubar-item label="File"><focsd-menu-item>New</focsd-menu-item></focsd-menubar-item><focsd-menubar-item label="Edit"><focsd-menu-item>Undo</focsd-menu-item></focsd-menubar-item><focsd-menubar-item label="View"><focsd-menu-item>Zoom</focsd-menu-item></focsd-menubar-item></focsd-menubar>',
  },
  'nav-menu': {
    html: '<focsd-nav-menu label="Main"><focsd-nav-item href="#" current>Overview</focsd-nav-item><focsd-nav-item href="#">Reports</focsd-nav-item><focsd-nav-item href="#">Settings</focsd-nav-item></focsd-nav-menu>',
  },
  pagination: { html: '<focsd-pagination total="12" page="5"></focsd-pagination>' },
  sidebar: {
    zoom: true,
    html: '<focsd-sidebar label="Workspace" style="block-size: 13rem"><focsd-sidebar-item href="#" icon="star" current>Starred</focsd-sidebar-item><focsd-sidebar-item href="#" icon="search">Search</focsd-sidebar-item><focsd-sidebar-item href="#" icon="calendar">Calendar</focsd-sidebar-item></focsd-sidebar>',
  },
  'skip-link': { html: '<div class="gp-mock gp-mock-page gp-mock-skip"><span class="gp-mock-chip">Skip to main content</span></div>' },
  stepper: {
    html: '<focsd-stepper label="Checkout" current="1"><focsd-step>Cart</focsd-step><focsd-step>Shipping</focsd-step><focsd-step>Payment</focsd-step></focsd-stepper>',
  },
  'table-of-contents': {
    html: '<div class="gp-mock gp-mock-toc"><strong>On this page</strong><span class="active">Overview</span><span>Install</span><span>Usage</span></div>',
  },
  tabs: {
    html: '<focsd-tabs label="Settings"><focsd-tab>General</focsd-tab><focsd-tab>Members</focsd-tab><focsd-tab>Billing</focsd-tab><focsd-tab-panel><p>Name and region.</p></focsd-tab-panel><focsd-tab-panel><p>People.</p></focsd-tab-panel><focsd-tab-panel><p>Plan.</p></focsd-tab-panel></focsd-tabs>',
  },

  // Disclosure
  accordion: {
    html: '<focsd-accordion><focsd-accordion-item summary="Shipping" open><p>Ships in 2 days.</p></focsd-accordion-item><focsd-accordion-item summary="Returns"><p>30 days.</p></focsd-accordion-item></focsd-accordion>',
  },
  disclosure: { html: '<focsd-disclosure summary="Show details" open><p>Created by Amara on Monday.</p></focsd-disclosure>' },

  // Data
  'data-grid': {
    html: '<focsd-data-grid class="gp-grid-demo" label="Invoices" page-size="5" style="inline-size: 29rem"></focsd-data-grid>',
    zoom: true,
    props: {
      '.gp-grid-demo': {
        columns: [
          { id: 'id', header: 'Invoice', type: 'number' },
          { id: 'customer', header: 'Customer' },
          { id: 'amount', header: 'Amount', type: 'number' },
        ],
        rows: [
          { id: 1042, customer: 'Northwind', amount: 1200 },
          { id: 1043, customer: 'Contoso', amount: 860 },
          { id: 1044, customer: 'Fabrikam', amount: 2310 },
          { id: 1045, customer: 'Tailspin', amount: 540 },
          { id: 1046, customer: 'Adatum', amount: 1780 },
        ],
      },
    },
  },
  table: {
    html: '<focsd-table class="gp-table-demo" caption="Members"></focsd-table>',
    props: {
      '.gp-table-demo': {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'role', label: 'Role' },
        ],
        rows: [
          { name: 'Amara Okafor', role: 'Owner' },
          { name: 'Lukas Brandt', role: 'Editor' },
          { name: 'Priya Raman', role: 'Viewer' },
        ],
      },
    },
  },
  tree: {
    html: '<focsd-tree label="Files"><focsd-tree-item label="src" value="src" expanded><focsd-tree-item label="index.js" value="i"></focsd-tree-item><focsd-tree-item label="button.js" value="b"></focsd-tree-item></focsd-tree-item><focsd-tree-item label="package.json" value="p"></focsd-tree-item></focsd-tree>',
  },
  'virtual-list': {
    html: '<focsd-virtual-list class="gp-list-demo" label="Products" item-height="28" style="inline-size: 15rem; block-size: 11rem"></focsd-virtual-list>',
    props: { '.gp-list-demo': { items: Array.from({ length: 100 }, (_, i) => `Product ${i + 1}`) } },
  },

  // Charts
  chart: {
    html: '<focsd-chart class="gp-chart-demo" label="Revenue" x="quarter" height="190" style="inline-size: 17rem"></focsd-chart>',
    props: {
      '.gp-chart-demo': {
        series: [
          { key: 'online', label: 'Online' },
          { key: 'stores', label: 'Stores' },
        ],
        data: [
          { quarter: 'Q1', online: 42, stores: 30 },
          { quarter: 'Q2', online: 55, stores: 34 },
          { quarter: 'Q3', online: 61, stores: 39 },
          { quarter: 'Q4', online: 74, stores: 41 },
        ],
      },
    },
  },
  gauge: {
    html: '<focsd-gauge class="gp-gauge-demo" label="CPU load" value="72" format="unit percent" show-value></focsd-gauge>',
    props: {
      '.gp-gauge-demo': {
        bands: [
          { to: 60, label: 'Normal', tone: 'positive' },
          { to: 85, label: 'Warning', tone: 'caution' },
          { to: 100, label: 'Critical', tone: 'critical' },
        ],
      },
    },
  },
  sparkline: {
    html: '<p class="center">Signups <focsd-sparkline class="gp-spark-demo" label="Signups per day" show-last></focsd-sparkline></p>',
    props: { '.gp-spark-demo': { values: [4, 8, 6, 12, 19, 17, 24] } },
  },

  // Display
  avatar: {
    html: '<div class="row"><focsd-avatar name="Amara Okafor"></focsd-avatar><focsd-avatar name="Lukas Brandt" size="l"></focsd-avatar></div>',
  },
  'avatar-group': {
    html: '<focsd-avatar-group label="Team" max="3"><focsd-avatar name="Amara Okafor"></focsd-avatar><focsd-avatar name="Lukas Brandt"></focsd-avatar><focsd-avatar name="Priya Raman"></focsd-avatar><focsd-avatar name="Tomás Herrera"></focsd-avatar></focsd-avatar-group>',
  },
  badge: {
    html: '<div class="row"><focsd-badge tone="positive">Paid</focsd-badge><focsd-badge tone="caution">Due</focsd-badge><focsd-badge tone="critical">Late</focsd-badge></div>',
  },
  card: { html: '<focsd-card><strong slot="header">Atlas</strong><p>9 tasks left this week.</p></focsd-card>' },
  carousel: {
    html: '<focsd-carousel label="Templates" style="inline-size: 12rem"><focsd-carousel-slide><p>Invoice</p></focsd-carousel-slide><focsd-carousel-slide><p>Roadmap</p></focsd-carousel-slide></focsd-carousel>',
  },
  code: { html: '<focsd-code label="Install" language="shell">npm i @focsd/components</focsd-code>' },
  'description-list': {
    html: '<focsd-description-list style="inline-size: 12rem"><focsd-description-item term="Plan">Team</focsd-description-item><focsd-description-item term="Seats">9 of 10</focsd-description-item></focsd-description-list>',
  },
  image: { html: '<focsd-image src="/media/hill.svg" alt="" ratio="16/9" style="inline-size: 12rem"></focsd-image>' },
  'image-compare': {
    html: '<focsd-image-compare label="Bridge, then and now" style="inline-size: 13rem"><img slot="before" src="/media/bridge-1990.svg" alt="" width="800" height="450"><img slot="after" src="/media/bridge-today.svg" alt="" width="800" height="450"></focsd-image-compare>',
  },
  kbd: { html: '<p class="center">Press <focsd-kbd>Ctrl</focsd-kbd> + <focsd-kbd>K</focsd-kbd></p>' },
  list: {
    html: '<focsd-list label="Files"><focsd-list-item>report-q3.pdf</focsd-list-item><focsd-list-item>roadmap.key</focsd-list-item></focsd-list>',
  },
  'qr-code': { html: '<focsd-qr-code value="https://focsd.dev" label="QR code for focsd.dev" size="96"></focsd-qr-code>' },
  stat: { html: '<focsd-stat label="Revenue" value="48200" format="currency USD 0" period="last month" delta="0.124"></focsd-stat>' },
  'status-dot': {
    html: '<div class="stack"><focsd-status-dot status="online" label="Online" label-visible></focsd-status-dot><focsd-status-dot status="busy" label="Busy" label-visible></focsd-status-dot></div>',
  },
  tag: {
    html: '<div class="row"><focsd-tag tone="caution" shape="pill" icon="calendar">Waiting</focsd-tag><focsd-tag tone="positive" shape="pill" icon="check">Delivered</focsd-tag><focsd-tag tone="info" shape="pill" removable>Billing</focsd-tag></div>',
  },
  timeline: {
    html: '<focsd-timeline><focsd-timeline-item heading="Project created" datetime="2026-10-01">By Amara</focsd-timeline-item><focsd-timeline-item heading="Invoice paid" datetime="2026-10-03" tone="positive">Received</focsd-timeline-item></focsd-timeline>',
  },

  // Feedback
  alert: { html: '<focsd-alert tone="positive" headline="Saved">Your changes are live.</focsd-alert>' },
  'empty-state': {
    html: '<focsd-empty-state headline="No invoices yet" icon="upload" style="inline-size: 20rem"><p>Create one to get paid.</p></focsd-empty-state>',
    zoom: true,
  },
  'loading-overlay': {
    html: '<focsd-loading-overlay active label="Loading report"><div class="gp-mock gp-mock-card"><strong>Q3 report</strong><span>Figures</span></div></focsd-loading-overlay>',
  },
  meter: { html: '<focsd-meter label="Storage" value="0.7" low="0.6" high="0.85" style="inline-size: 12rem"></focsd-meter>' },
  progress: {
    html: '<div class="stack" style="inline-size: 12rem"><focsd-progress label="Upload" value="64" max="100" show-value></focsd-progress><focsd-progress label="Sync" variant="ring" value="40" max="100"></focsd-progress></div>',
  },
  skeleton: {
    html: '<div class="stack" style="inline-size: 12rem"><focsd-skeleton shape="circle"></focsd-skeleton><focsd-skeleton shape="text" lines="3"></focsd-skeleton></div>',
  },
  spinner: {
    html: '<div class="row"><focsd-spinner label="Loading" size="s"></focsd-spinner><focsd-spinner label="Loading"></focsd-spinner><focsd-spinner label="Loading" size="l"></focsd-spinner></div>',
  },
  toaster: { html: '<div class="gp-mock gp-mock-toast"><span>Draft saved</span><focsd-button>Undo</focsd-button></div>' },

  // Layout
  'app-shell': {
    html: '<div class="gp-mock gp-mock-shell"><div class="gp-mock-bar"><strong>Northwind</strong></div><div class="gp-mock-nav"><span class="active">Home</span><span>Reports</span></div><div class="gp-mock-main"><span></span><span></span></div></div>',
  },
  masonry: {
    html: '<focsd-masonry min-column-width="4rem" style="inline-size: 13rem"><div class="gp-tile" style="block-size: 2rem"></div><div class="gp-tile" style="block-size: 3.5rem"></div><div class="gp-tile" style="block-size: 2.5rem"></div><div class="gp-tile" style="block-size: 1.5rem"></div><div class="gp-tile" style="block-size: 3rem"></div></focsd-masonry>',
  },
  'scroll-area': {
    html: '<focsd-scroll-area label="Changelog" max-block-size="5rem" style="inline-size: 12rem"><p>2.4: faster search.</p><p>2.3: dark mode.</p><p>2.2: CSV export.</p><p>2.1: shortcuts.</p></focsd-scroll-area>',
  },
  separator: {
    html: '<div class="stack" style="inline-size: 12rem"><span>Account</span><focsd-separator></focsd-separator><span>Sign out</span></div>',
  },
  splitter: {
    html: '<focsd-splitter label="Panels" style="inline-size: 13rem; block-size: 6rem"><div slot="start" class="gp-tile">Files</div><div slot="end" class="gp-tile">Editor</div></focsd-splitter>',
  },

  // Utility
  'animated-number': {
    html: '<p class="center gp-big"><focsd-animated-number value="1280" duration="0"></focsd-animated-number> users</p>',
  },
  'format-number': {
    html: '<p class="center gp-big"><focsd-format-number value="48200" type="currency" currency="USD"></focsd-format-number></p>',
  },
  icon: {
    html: '<div class="row gp-big"><focsd-icon name="star"></focsd-icon><focsd-icon name="search"></focsd-icon><focsd-icon name="calendar"></focsd-icon><focsd-icon name="edit"></focsd-icon></div>',
  },
  'relative-time': {
    html: `<p class="center">Updated <focsd-relative-time datetime="${new Date(T0 - 3 * DAY).toISOString()}" frozen></focsd-relative-time></p>`,
  },
  'theme-picker': {
    html: '<focsd-theme-picker presets="harbor signal" storage-key-prefix="gallery-thumb-" target=".gp-theme-target"></focsd-theme-picker>',
    zoom: true,
  },
  'theme-toggle': { html: '<focsd-theme-toggle storage-key-prefix="gallery-thumb-" target=".gp-theme-target"></focsd-theme-toggle>' },
  'visually-hidden': {
    html: '<p class="center">Visible text<focsd-visually-hidden> and text for screen readers</focsd-visually-hidden></p>',
  },

  // AI
  'attachment-tile': {
    html: '<focsd-attachment-tile name="report-q3.pdf" size="482000" media-type="application/pdf" removable style="inline-size: 17rem"></focsd-attachment-tile>',
  },
  'chat-message': {
    html: '<focsd-chat-message class="gp-msg-demo" from="assistant"></focsd-chat-message>',
    props: {
      '.gp-msg-demo': {
        message: {
          id: 'a1',
          role: 'assistant',
          status: 'done',
          createdAt: T0,
          parts: [{ type: 'text', text: 'Yes: React 19 renders custom elements directly.' }],
        },
      },
    },
  },
  'chat-thread': {
    html: '<focsd-chat-thread class="gp-thread-demo" label="Conversation" style="--focsd-chat-thread-height: 11rem; inline-size: 17rem"></focsd-chat-thread>',
    props: {
      '.gp-thread-demo': {
        messages: [
          { id: 'u1', role: 'user', status: 'done', createdAt: T0, parts: [{ type: 'text', text: 'Does it work with Vue?' }] },
          {
            id: 'a1',
            role: 'assistant',
            status: 'done',
            createdAt: T0 + 5000,
            parts: [{ type: 'text', text: 'Yes, mark focsd- tags as custom elements.' }],
          },
        ],
      },
    },
  },
  composer: { html: '<focsd-composer placeholder="Ask about a component" style="inline-size: 18rem"></focsd-composer>' },
  'message-actions': { html: '<focsd-message-actions text="Copied answer"></focsd-message-actions>' },
  'prompt-suggestions': {
    html: '<focsd-prompt-suggestions class="gp-prompts-demo" label="Try asking"></focsd-prompt-suggestions>',
    props: { '.gp-prompts-demo': { suggestions: ['Show a date picker', 'How do I theme it?'] } },
  },
  'file-changes': {
    html: `<focsd-file-changes style="inline-size: 19rem" files='[{"path":"src/lib/runs.ts","additions":24,"deletions":9},{"path":"src/app/load-more.tsx","status":"added","additions":36},{"path":"src/lib/cache.ts","status":"deleted","deletions":12}]'></focsd-file-changes>`,
  },
  reasoning: { html: '<focsd-reasoning text="Checking the catalog for date components."></focsd-reasoning>' },
  'source-chip': {
    html: '<div class="row"><focsd-source-chip href="https://www.w3.org/WAI/ARIA/apg/" index="1">Feed pattern</focsd-source-chip><focsd-source-chip href="https://developer.mozilla.org/" index="2">MDN</focsd-source-chip></div>',
  },
  'streaming-text': {
    html: '<focsd-streaming-text text="Markdown is **built** as it arrives, with `code` and lists." style="inline-size: 13rem"></focsd-streaming-text>',
  },
  'tool-call': {
    html: '<focsd-tool-call class="gp-tool-demo" status="done"></focsd-tool-call>',
    props: { '.gp-tool-demo': { name: 'search_docs', input: { query: 'date range' }, output: { matches: 2 } } },
  },
};
