/** Examples and accessibility notes: navigation and lists. */
export default {
  tabs: {
    summary: 'Related panels on one page, one shown at a time.',
    html: `<div class="full"><focsd-tabs label="Workspace settings">
  <focsd-tab>General</focsd-tab>
  <focsd-tab>Members</focsd-tab>
  <focsd-tab disabled>Billing</focsd-tab>
  <focsd-tab>Security</focsd-tab>
  <focsd-tab-panel><p>Name, region and default language for the workspace.</p></focsd-tab-panel>
  <focsd-tab-panel><p>Invite people and change their roles.</p></focsd-tab-panel>
  <focsd-tab-panel><p>Billing is managed by your organization.</p></focsd-tab-panel>
  <focsd-tab-panel><p>Two-factor authentication and session length.</p></focsd-tab-panel>
</focsd-tabs></div>`,
    a11y: [
      'APG tabs with automatic activation: `role="tablist"`, `tab` and `tabpanel`, with `aria-selected`, `aria-controls` and `aria-labelledby` set on the hosts.',
      'One tab stop for the tab list; disabled tabs are skipped; arrows are mirrored in right-to-left pages.',
    ],
    keyboard: [
      ['Arrow Left / Right', 'Previous / next tab (selects it)'],
      ['Home / End', 'First / last tab'],
      ['Tab', 'Move into the active panel'],
    ],
  },
  breadcrumb: {
    summary: 'Shows where the current page sits in the hierarchy.',
    html: `<focsd-breadcrumb>
  <focsd-breadcrumb-item href="#">Home</focsd-breadcrumb-item>
  <focsd-breadcrumb-item href="#">Projects</focsd-breadcrumb-item>
  <focsd-breadcrumb-item current>Atlas</focsd-breadcrumb-item>
</focsd-breadcrumb>`,
    a11y: [
      'A `<nav aria-label="Breadcrumb">` landmark around an ordered list.',
      'The current item has `aria-current="page"` and is plain text; separators are hidden from screen readers.',
    ],
  },
  pagination: {
    summary: 'Links or buttons for moving between pages of results.',
    html: `<focsd-pagination total="12" page="5"></focsd-pagination>`,
    a11y: [
      'A `<nav aria-label="Pagination">` landmark. Page buttons are named "Page 5"; the current one has `aria-current="page"`.',
      'Previous/next are named "Previous page"/"Next page" and disabled at the ends. Ellipses are hidden.',
      'With `href="/results?page={page}"` it renders real links; otherwise buttons that fire `focsd-page-change` with `detail.page`.',
    ],
  },
  'nav-menu': {
    summary: 'Site navigation with disclosure groups (not an application menu).',
    html: `<focsd-nav-menu label="Product">
  <focsd-nav-item href="#" current>Overview</focsd-nav-item>
  <focsd-nav-item label="Products">
    <a href="#">Analytics</a>
    <a href="#">Reports</a>
  </focsd-nav-item>
  <focsd-nav-item label="Company">
    <a href="#">About</a>
  </focsd-nav-item>
</focsd-nav-menu>`,
    a11y: [
      'APG disclosure navigation: groups are `<button aria-expanded>` that show their links; there is no `role="menu"`, so links behave like links.',
      'Opening one group closes the others; Escape closes and returns focus to its button; moving focus out closes it.',
    ],
    keyboard: [
      ['Enter / Space', 'Open or close a group'],
      ['Escape', 'Close the open group'],
      ['Tab', 'Move through links'],
    ],
  },
  sidebar: {
    summary: 'An app-shell navigation landmark that collapses to icons.',
    frame: true,
    html: `<focsd-sidebar label="Workspace">
  <focsd-sidebar-item href="#" icon="menu" current>Projects</focsd-sidebar-item>
  <focsd-sidebar-item href="#" icon="search">Members</focsd-sidebar-item>
  <focsd-sidebar-item href="#" icon="settings">Settings</focsd-sidebar-item>
</focsd-sidebar>`,
    a11y: [
      'A `<nav aria-label>` landmark with a collapse `<button aria-expanded>`; its name stays "Collapse sidebar" while the state changes.',
      'When collapsed, item labels stay available as accessible names.',
    ],
  },
  menubar: {
    summary: 'A horizontal bar of application menus, like File and Edit.',
    html: `<focsd-menubar label="Editor">
  <focsd-menubar-item label="File">
    <focsd-menu-item value="new">New</focsd-menu-item>
    <focsd-menu-item value="open">Open</focsd-menu-item>
  </focsd-menubar-item>
  <focsd-menubar-item label="Edit">
    <focsd-menu-item value="undo">Undo</focsd-menu-item>
    <focsd-menu-item value="redo">Redo</focsd-menu-item>
  </focsd-menubar-item>
  <focsd-menubar-item label="View">
    <focsd-menu-item value="zoom">Zoom</focsd-menu-item>
  </focsd-menubar-item>
</focsd-menubar>`,
    a11y: [
      'APG menubar: `role="menubar"` with one tab stop; each item is a `role="menuitem"` with `aria-haspopup="menu"` and `aria-expanded`.',
      'Use only for application-style commands. For site navigation use `focsd-nav-menu`.',
    ],
    keyboard: [
      ['Arrow Left / Right', 'Move between menus (and switch the open menu)'],
      ['Enter / Space / Arrow Down', 'Open at the first item'],
      ['Arrow Up', 'Open at the last item'],
      ['Escape', 'Close and return focus'],
    ],
  },
  stepper: {
    summary: 'Shows progress through a multi-step flow.',
    html: `<focsd-stepper label="Checkout progress" current="1">
  <focsd-step>Cart</focsd-step>
  <focsd-step>Shipping</focsd-step>
  <focsd-step>Payment</focsd-step>
</focsd-stepper>`,
    a11y: [
      'A `role="list"` of steps, named by `label`; the current step has `aria-current="step"`.',
      'Each step carries visually hidden status text ("Completed", "Current step", "Not started"), so state is never shown by color alone.',
    ],
  },
  header: {
    summary: 'The top bar of an app or site: brand, navigation and actions. Collapses to a menu button on small screens.',
    frame: true,
    html: `<focsd-header sticky collapse-below="640">
  <strong slot="brand">Northwind</strong>
  <focsd-nav-menu label="Main">
    <focsd-nav-item href="#" current>Overview</focsd-nav-item>
    <focsd-nav-item label="Products">
      <a href="#">Analytics</a>
      <a href="#">Reports</a>
    </focsd-nav-item>
    <focsd-nav-item href="#">Pricing</focsd-nav-item>
  </focsd-nav-menu>
  <focsd-button slot="actions" variant="action">Sign in</focsd-button>
</focsd-header>
<p style="padding: 1rem">Narrow the window below 640px to see the menu button.</p>`,
    a11y: [
      'A `<header role="banner">` landmark: use one per page, at the top level (not inside `<main>`).',
      'Below `collapse-below` pixels (default 768) a "Menu" button with `aria-expanded` and `aria-controls` shows and hides the navigation; slotted `focsd-nav-menu`s switch to a vertical layout whose groups open in place.',
      'Escape closes the menu and returns focus to the button; following a link closes it.',
      '`sticky` keeps the header at the top while scrolling. Make sure focused elements are never hidden behind it (WCAG 2.4.11): add `scroll-padding-top` equal to its height.',
    ],
    keyboard: [
      ['Enter / Space (Menu)', 'Open or close the navigation'],
      ['Escape', 'Close and return focus to Menu'],
    ],
  },
  footer: {
    summary: 'The bottom of a site: brand, grouped links and a legal row.',
    frame: true,
    html: `<focsd-footer>
  <strong slot="brand">Northwind</strong>
  <p slot="brand">Invoicing for small studios.</p>
  <focsd-footer-section heading="Product">
    <a href="#">Features</a>
    <a href="#">Pricing</a>
  </focsd-footer-section>
  <focsd-footer-section heading="Company">
    <a href="#">Our story</a>
    <a href="#">Careers</a>
  </focsd-footer-section>
  <small slot="legal">© 2026 Northwind Ltd</small>
  <a slot="legal" href="#">Privacy</a>
</focsd-footer>`,
    a11y: [
      'A `<footer role="contentinfo">` landmark: use one per page, at the top level.',
      'Each `focsd-footer-section` is a navigation landmark named by its heading (level 2 by default; set `level` to fit your outline), so screen-reader users can jump between link groups.',
      'Sections wrap into a responsive grid; links keep a 24px minimum target.',
    ],
  },
  'skip-link': {
    summary: 'Lets keyboard users jump past repeated navigation to the main content.',
    frame: true,
    html: `<focsd-skip-link href="#main">Skip to main content</focsd-skip-link>
<p>Press Tab to reveal the skip link.</p>
<main id="main" tabindex="-1"><p>Main content</p></main>`,
    a11y: [
      'Hidden until focused, then shown in the top start corner above everything else. Make it the first element in `<body>`.',
      'Activating it moves focus to the target, adding `tabindex="-1"` when the target has none.',
      'With the default `href="#main"` and no element with that id, it focuses the main landmark of the first `focsd-app-shell` in the document. A shell inside another component\'s shadow root is not found, and with two shells the first wins; give your main an id and point `href` at it instead.',
    ],
    keyboard: [
      ['Tab (first)', 'Reveal'],
      ['Enter', 'Jump to the target'],
    ],
  },
  list: {
    summary: 'A styled list, optionally selectable like a listbox.',
    html: `<div class="stack">
  <focsd-list label="Recent files">
    <focsd-list-item>report-q3.pdf</focsd-list-item>
    <focsd-list-item>roadmap.key</focsd-list-item>
  </focsd-list>
  <focsd-list label="Assignee" selectable value="amara">
    <focsd-list-item value="amara">Amara Okafor</focsd-list-item>
    <focsd-list-item value="lukas">Lukas Brandt</focsd-list-item>
    <focsd-list-item value="priya" disabled>Priya Raman (away)</focsd-list-item>
    <focsd-list-item value="tomas">Tomás Herrera</focsd-list-item>
  </focsd-list>
</div>`,
    a11y: [
      'Static: `role="list"` and `listitem`.',
      'Selectable: a labeled `role="listbox"` of `option`s with `aria-selected`, one tab stop, firing `change`.',
    ],
    keyboard: [
      ['Arrow Up / Down', 'Move (selectable)'],
      ['Home / End', 'First / last item'],
      ['Enter / Space', 'Select'],
    ],
    more: [
      {
        id: 'sortable',
        title: 'Sortable',
        summary: 'Reorder by keyboard with the handle, or drag it.',
        html: `<focsd-list label="Release checklist" sortable>
  <focsd-list-item>Write release notes</focsd-list-item>
  <focsd-list-item>Design review</focsd-list-item>
  <focsd-list-item>Run the test suite</focsd-list-item>
  <focsd-list-item>Tag the release</focsd-list-item>
  <focsd-list-item>Announce it</focsd-list-item>
</focsd-list>`,
        a11y: [
          'Each item has a "Reorder {item}" button before its content. Grabbing, each move, the drop and a cancel are announced politely ("Grabbed Design review, position 2 of 5", "Moved to position 3 of 5", "Dropped at position 3"). When an item holds other controls, such as a menu button, or its text changes after it is shown, set its `label` so the handle and announcements use that name and not all of its text.',
          'The handle keeps focus while the item moves. A click elsewhere or focus leaving the list puts a grabbed item back.',
          'Dragging the handle with a mouse or a finger lifts the item, shows a dashed placeholder where it will land, and scrolls a scrolling container near its edges.',
          'The list fires a cancelable `focsd-reorder` with `detail.from`, `detail.to` and `detail.item`; cancel it to put the item back. Otherwise the list moves the item element itself.',
          'A disabled item cannot be moved: its handle is disabled.',
          'A list that is both `selectable` and `sortable` puts no button inside its options (an option may not hold one). The handle is for a mouse or a finger only and is hidden from screen readers; Alt + Arrow Up or Down moves the focused option one place and announces "Moved to position 2 of 5".',
        ],
        keyboard: [
          ['Space / Enter (on a handle)', 'Grab the item, or drop it'],
          ['Arrow Up / Down', 'Move the grabbed item one place'],
          ['Escape', 'Put the item back where it was'],
          ['Tab', 'Drop the item and move on'],
          ['Alt + Arrow Up / Down', 'Move the focused option one place (selectable and sortable)'],
        ],
      },
    ],
  },
  'description-list': {
    summary: 'Term and value pairs, such as account details.',
    html: `<focsd-description-list class="stack">
  <focsd-description-item term="Plan">Team</focsd-description-item>
  <focsd-description-item term="Seats">9 of 10</focsd-description-item>
  <focsd-description-item term="Renews">November 1, 2026</focsd-description-item>
</focsd-description-list>`,
    a11y: ['Each item renders a valid `<dl><dt>term</dt><dd>value</dd></dl>` group, so screen readers announce term and value together.'],
  },
  'app-shell': {
    summary:
      'Lays out a header, sidebar, main content and footer for a whole app, with a skip link, and moves the sidebar into a drawer on narrow screens.',
    frame: true,
    html: `<focsd-app-shell nav-label="Workspace">
  <focsd-header slot="header" collapse-below="0"><a href="#" slot="brand">Northwind</a></focsd-header>
  <focsd-sidebar slot="sidebar" label="Workspace">
    <focsd-sidebar-item href="#" icon="menu" current>Projects</focsd-sidebar-item>
    <focsd-sidebar-item href="#" icon="search">Reports</focsd-sidebar-item>
    <focsd-sidebar-item href="#" icon="settings">Settings</focsd-sidebar-item>
  </focsd-sidebar>
  <h1>Projects</h1>
  <p>Twelve projects, three due this week.</p>
  <focsd-footer slot="footer"><p>© 2026 Northwind</p></focsd-footer>
</focsd-app-shell>`,
    a11y: [
      "The shell renders the page's one `main` landmark around its default slot; the header and footer keep their own banner and contentinfo landmarks, and the sidebar its navigation landmark.",
      'The first Tab stop is a "Skip to main content" link, hidden until focused. It moves focus to `main`.',
      '`main` scrolls on its own while the header and footer stay put. It is a tab stop, so keyboard users can scroll it even when it holds no links.',
      'Below `collapse-below` (768 pixels by default) the sidebar moves into a modal dialog named by `nav-label`, opened by an "Open navigation" button before the header. Escape, the close button or following a link closes it, and focus returns to the button.',
      'Put the content straight in the default slot: a `<main>` inside the shell would be a second main landmark, and the shell warns about it in the console.',
      'Right-to-left pages put the sidebar, and the drawer, on the right.',
    ],
    keyboard: [
      ['Tab', 'The skip link first, then the header, sidebar, main and footer'],
      ['Enter', 'On the skip link: move focus to the main content'],
      ['Escape', 'Close the navigation drawer'],
    ],
  },
  'table-of-contents': {
    summary: 'A list of links to the headings on the page that marks the section you are reading.',
    html: `<focsd-table-of-contents for="#guide"></focsd-table-of-contents>
<article id="guide">
  <h2>Install</h2>
  <p>Add the package to your project.</p>
  <h3>With npm</h3>
  <p>Run npm install @focsd/components.</p>
  <h2>Usage</h2>
  <p>Write the elements in your HTML.</p>
</article>`,
    a11y: [
      'It renders a navigation landmark named "On this page"; set `label` when a page has more than one.',
      'It lists the `h2` and `h3` headings of the first element matching `for` (by default `main`, or `focsd-app-shell`). Set `levels` to choose others, such as `levels="2"`. An `h3` is nested in a list under the `h2` before it.',
      'A heading without an `id` gets one made from its text, so its link and the address bar point at it.',
      'The link of the section in view has `aria-current="location"`, which screen readers read as "current location".',
      'Following a link scrolls to the heading (without animation when reduced motion is preferred), moves focus to it and adds its `#id` to the address, so Back returns to where you were.',
      'Put your own links (`a[href^="#"]`) inside to replace the generated list; the current section is still marked on them.',
    ],
    keyboard: [
      ['Tab', 'Move between links'],
      ['Enter', 'Go to the heading and focus it'],
    ],
  },
  dock: {
    summary:
      'A compact row of icons in a raised container for switching between views or categories, one at a time. Labels show as tooltips, or under the icons.',
    html: `<div class="stack">
  <focsd-dock label="Mail folders" name="folder" value="starred" id="dock-demo">
    <focsd-dock-item value="starred" icon="star">Starred</focsd-dock-item>
    <focsd-dock-item value="search" icon="search">Search</focsd-dock-item>
    <focsd-dock-item value="schedule" icon="calendar">Schedule</focsd-dock-item>
    <focsd-dock-item value="drafts" icon="edit">Drafts</focsd-dock-item>
  </focsd-dock>
  <output id="dock-demo-out" for="dock-demo" aria-live="polite">Showing starred</output>
</div>`,
    script: `const dock = document.getElementById('dock-demo');
const out = document.getElementById('dock-demo-out');

dock.addEventListener('change', () => {
  out.textContent = 'Showing ' + dock.value;
});`,
    a11y: [
      'A radio group named by `label` (default "Views"), with each item a radio named by its text. Screen readers say "Search, radio button, 2 of 4".',
      'Each label shows as a tip on hover and on keyboard focus (Escape hides it), so sighted people can learn what an icon means. Set `label-display="shown"` to show the labels under the icons instead.',
      'The dock is an opaque raised surface with an edge and a shadow, so its icons stay readable over any content behind it. `--focsd-dock-background`, `--focsd-dock-border-color`, `--focsd-dock-shadow` and `--focsd-dock-radius` restyle it.',
      'Selection follows focus: one arrow press moves and chooses. Use it when the choice shows at once, such as a filter or a view.',
      'The selected item has a filled surface, full-strength text and a bar under it, so color is never the only cue. In forced colors it takes the system selected-item colors.',
      "Every item is as tall as the density's controls (32, 36 or 44 px), so the dock lines up with buttons and fields beside it, and never under the 24 px target size.",
      'Not for links between pages: use `focsd-bottom-nav` or `focsd-nav-menu`, which are real links in a navigation landmark.',
    ],
    keyboard: [
      ['Arrow keys', 'Move to the next or previous item and select it (Left and Right swap in right-to-left text)'],
      ['Home / End', 'First / last item'],
      ['Tab', 'Move into the dock, then out of it'],
    ],
    more: [
      {
        id: 'custom-icons',
        title: 'Labels under the icons, your own icons and sizes',
        summary:
          '`label-display="shown"` puts each label under its icon. Put any SVG or `focsd-icon` in the `icon` slot. `size` takes `s`, `m` or `l`.',
        html: `<div class="stack">
  <focsd-dock label="Layout" size="s" value="grid" label-display="shown">
    <focsd-dock-item value="grid">
      <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
      Grid
    </focsd-dock-item>
    <focsd-dock-item value="list" icon="menu">List</focsd-dock-item>
  </focsd-dock>
  <focsd-dock label="Text alignment" size="l" value="left">
    <focsd-dock-item value="left" icon="arrow-left">Align left</focsd-dock-item>
    <focsd-dock-item value="right" icon="arrow-right">Align right</focsd-dock-item>
  </focsd-dock>
</div>`,
        a11y: [
          'The icon is decoration and hidden from assistive technology; the label always names the item, shown or not.',
          'Show the labels when the icons are not ones everyone knows: visible labels are easier for everyone, and on touch screens there is no hover.',
        ],
      },
    ],
  },
  'bottom-nav': {
    summary: 'A bar of three to five top-level destinations along the bottom of a phone screen.',
    frame: true,
    html: `<focsd-bottom-nav position="static" hide-above="0" label="Main">
  <focsd-bottom-nav-item href="#home" icon="home" label="Home" current></focsd-bottom-nav-item>
  <focsd-bottom-nav-item href="#search" icon="search" label="Search"></focsd-bottom-nav-item>
  <focsd-bottom-nav-item href="#inbox" icon="inbox" label="Inbox" badge="3"></focsd-bottom-nav-item>
  <focsd-bottom-nav-item href="#profile" icon="user" label="Profile"></focsd-bottom-nav-item>
</focsd-bottom-nav>`,
    a11y: [
      'A navigation landmark named "Main" (set `label` for another name) holding real links. Open in a new tab, copy the address and modifier clicks all work, and without JavaScript each one still goes to its page.',
      'The current item has `aria-current="page"`, and is shown with a heavier label and a bar above it, so it is never only a color. In forced colors it gets an outline.',
      'A `badge` joins the link\'s name, so a screen reader hears "Inbox, 3 new", not a bare 3. The visible badge is hidden from assistive technology.',
      'Items are at least 48 px wide and tall. On a phone with a home indicator the bar pads itself by the safe-area inset.',
      'Use three to five items. Fewer or more logs a warning, because more than five crowds the targets.',
      'It shows below 768 px by default and hides on wider screens (`hide-above`, in px; 0 never hides). Give wider screens a sidebar or a header navigation instead.',
      'Fixed to the bottom by default, the element keeps the bar\'s height in the page, so the last of your content is never covered. `position="sticky"` and `"static"` are the alternatives.',
      'Place the bar last in the page, after all other content. Placed first, the space it keeps is at the top and the bar covers the last content.',
      "A fixed bar covers what scrolls under it, so a focused element could end up hidden behind it (WCAG 2.4.11). Set `scroll-padding-block-end` on `html` to the bar's height: `calc(var(--focsd-bottom-nav-height, 4rem) + env(safe-area-inset-bottom))`. The component cannot set it from inside its shadow root.",
      'To use a client-side router, register it once with `setLinkHandler`, as in [the router recipes](/foundations/utilities/).',
    ],
    keyboard: [
      ['Tab', 'Move between the links'],
      ['Enter', 'Follow the focused link'],
    ],
  },
};
