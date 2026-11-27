/** Examples and accessibility notes: data and layout. */
const COLUMNS = `{ key: string, label: string, sortable?: boolean, numeric?: boolean }[]`;

export default {
  masonry: {
    summary: 'Cards of different heights in columns, like a pinboard; one column on narrow screens.',
    html: `<focsd-masonry min-column-width="12rem">
  <focsd-card><p>Short note.</p></focsd-card>
  <focsd-card><p>A longer card with more text, so it takes more space than its neighbors in the column.</p></focsd-card>
  <focsd-card><p>Medium card with a little more text.</p></focsd-card>
  <focsd-card><p>Another short one.</p></focsd-card>
  <focsd-card><p>The last card, of medium length, closes the set.</p></focsd-card>
</focsd-masonry>`,
    a11y: [
      'Uses CSS masonry (`display: grid-lanes`) where the browser has it, and places items itself elsewhere.',
      'The default `order="dom"` keeps the visual order close to the reading and focus order (WCAG 1.3.2, 2.4.3).',
      'Where the browser has CSS masonry, it places each item in the shortest column itself, so `order` has no effect and the layout behaves like `order="balanced"`. If the visual order must follow the reading order everywhere, set `nativeMasonry = false`.',
      '`order="balanced"` packs tighter but can separate what is next to what visually from the focus order: use it only for items that do not need to be read in sequence.',
      'Children keep their own semantics; the container adds no role.',
    ],
  },
  'virtual-list': {
    summary: 'A list of any length that renders only the rows in view; this one holds 100,000 items.',
    html: `<focsd-virtual-list id="virtual-list-demo" class="full" label="Products" item-height="36" style="block-size: 16rem"></focsd-virtual-list>`,
    script: `const list = document.getElementById('virtual-list-demo');
// The data: 100,000 rows. Each shows as text; set renderItem for richer rows.
list.items = Array.from({ length: 100000 }, (_, i) => 'Product ' + (i + 1));`,
    a11y: [
      'Rows carry `aria-setsize` and `aria-posinset`, so screen readers announce "item 4,051 of 100,000".',
      'The scrolling area is focusable, so keyboard users can scroll it.',
      'With `selectable="single"` or `"multiple"` it is an APG listbox with `aria-activedescendant`, Shift ranges and Ctrl/⌘ + A.',
      'Rows that grow above the view (images loading) keep what you are reading in place.',
    ],
    keyboard: [
      ['Arrow Up / Down', 'Move the active row (listbox); with `selectable="single"` the row is also selected'],
      ['Home / End', 'First / last row (listbox)'],
      ['Page Up / Page Down', 'Move by a page (listbox), or scroll'],
      ['Space / Enter', 'Toggle the active row (listbox)'],
      ['Shift + Arrow Up / Down, Home, End, Page Up / Down', 'Extend the selection (multiple)'],
      ['Ctrl / ⌘ + A', 'Select all, or clear when all are selected (multiple)'],
    ],
  },
  table: {
    summary: 'A semantic data table with sortable columns.',
    html: `<div class="full"><focsd-table id="table-demo" caption="Members"></focsd-table></div>`,
    script: `const table = document.getElementById('table-demo');
table.columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'projects', label: 'Projects', sortable: true, numeric: true },
];
table.rows = [
  { name: 'Lukas Brandt', role: 'Editor', projects: 8 },
  { name: 'Amara Okafor', role: 'Owner', projects: 12 },
  { name: 'Priya Raman', role: 'Editor', projects: 5 },
];`,
    props: [
      { name: 'columns', type: COLUMNS, description: 'Column definitions. Numeric columns are end-aligned in tabular figures.' },
      { name: 'rows', type: 'object[]', description: 'Row objects keyed by column `key`.' },
    ],
    a11y: [
      'A native `<table>` with `<caption>` and `th scope="col"`; sortable headers contain a button and the `th` carries `aria-sort`.',
      'The wrapper is a labeled scroll region that becomes focusable when the table overflows, so wide tables can be scrolled with the keyboard.',
    ],
  },
  'data-grid': {
    summary: 'A data grid with sorting, search, typed filters, pinning, resizing, reordering, grouping, editing and export.',
    html: `<div class="full"><focsd-data-grid id="grid-demo" label="Invoices" page-size="8" selection="multiple" quick-search toolbar></focsd-data-grid></div>`,
    script: `const grid = document.getElementById('grid-demo');
grid.columns = [
  { id: 'id', header: 'Invoice', type: 'number', pinned: 'start', width: 112, formatOptions: { useGrouping: false } },
  { id: 'customer', header: 'Customer', editable: true, required: true },
  { id: 'owner', header: 'Owner', display: 'avatar' },
  { id: 'status', header: 'Status', type: 'enum', editable: true,
    options: [
      { value: 'paid', label: 'Paid', tone: 'positive', icon: 'check' },
      { value: 'sent', label: 'Sent', tone: 'info' },
      { value: 'overdue', label: 'Overdue', tone: 'critical', icon: 'alert-circle' },
      { value: 'draft', label: 'Draft' },
    ] },
  { id: 'region', header: 'Region', type: 'enum', editable: true,
    options: [{ value: 'eu', label: 'Europe' }, { value: 'us', label: 'Americas' }, { value: 'ap', label: 'Asia Pacific' }] },
  { id: 'amount', header: 'Amount', type: 'number', aggregate: 'sum', editable: true, min: 0,
    formatOptions: { style: 'currency', currency: 'EUR' } },
  { id: 'due', header: 'Due', type: 'date', aggregate: 'max', editable: true },
];
const customers = ['Northwind', 'Contoso', 'Fabrikam', 'Tailspin', 'Wingtip', 'Adatum'];
const owners = ['Amara Okafor', 'Lukas Brandt', 'Priya Raman', 'Tomás Herrera', 'Mei Lin'];
grid.rows = Array.from({ length: 40 }, (_, i) => ({
  id: 1001 + i,
  customer: customers[i % customers.length],
  region: ['eu', 'us', 'ap'][i % 3],
  amount: ((i * 7919) % 9000) + 120,
  due: '2026-' + String((i % 12) + 1).padStart(2, '0') + '-' + String((i % 27) + 1).padStart(2, '0'),
  owner: owners[i % owners.length],
  status: ['paid', 'sent', 'overdue', 'draft', 'paid'][i % 5],
}));`,
    props: [
      {
        name: 'columns',
        type: '{ id, field, header, type, display, width, minWidth, maxWidth, pinned, hidden, sortable, filterable, resizable, editable, groupable, searchable, aggregate, formatOptions, options, labels, render, validate, required, min, max, valueGetter, valueSetter }[]',
        description:
          "Column definitions. `type` is `text`, `number`, `date`, `boolean` or `enum` (with `options`), or a type added with `registerType()`. An enum option with `tone`, `color` or `icon` shows its values as status chips; `display: 'avatar'` shows names with an avatar.",
      },
      {
        name: 'rows',
        type: 'object[]',
        description: 'Row objects. Edits replace rows immutably, so keep your own copy in sync from `focsd-cell-edit`.',
      },
      {
        name: 'rowId',
        type: 'string | (row) => id',
        description: 'Field or function giving a stable row id (default `id`). Needed for selection and editing.',
      },
      { name: 'selectedIds', type: 'unknown[] (read-only)', description: 'Ids of the selected rows.' },
    ],
    methods: [
      {
        name: 'getState()',
        description:
          'The view as JSON: column order, visibility, widths and pinning; sort; filters; search; grouping and expanded groups; page and page size; density.',
      },
      { name: 'setState(state)', description: 'Restore a saved view. Unknown columns and invalid filters are ignored.' },
      {
        name: 'exportCsv({ selectedOnly, raw })',
        description: 'CSV of the filtered, sorted, visible view (or the selection), with formula-injection protection.',
      },
      {
        name: 'downloadCsv(filename, options)',
        description: 'Download that CSV (`options` as for `exportCsv`). The file name defaults to the `label`.',
      },
      { name: 'setGroupBy(columnIds)', description: 'Group rows by these columns, outermost first.' },
      { name: 'expandAll() / collapseAll()', description: 'Open or close every group.' },
      { name: 'startEditing(rowId, columnId)', description: 'Move to a cell and start editing it.' },
      { name: 'scrollToRow(rowId)', description: 'Bring a row into view (changing page if needed) and focus it in the active column.' },
    ],
    a11y: [
      'APG grid (or treegrid when grouped) with `aria-rowcount`, `aria-colcount`, `aria-rowindex` and `aria-colindex` that stay correct under paging, windowing, pinning and hidden columns.',
      'One tab stop for all cells. Pinned columns are sticky cells inside each row, so every row is still one row to assistive technology.',
      'Sorting, filtering, grouping, selection, edits and column changes are announced in a polite live region ("Sorted by Amount, descending", "Filter applied: Region is Europe. 14 of 40 rows").',
      'Every pointer gesture has a keyboard path: the column menu resizes (Widen, Narrow, Autosize), pins and hides; the Columns panel shows, hides and reorders.',
      'Editors are labeled ("Edit Amount"); invalid input keeps the editor open with an error that is described and announced.',
    ],
    keyboard: [
      ['Arrow keys', 'Move between cells'],
      ['Home / End', 'First / last cell in the row'],
      ['Ctrl + Home / End', 'First / last cell in the grid'],
      ['Page Up / Down', 'Previous / next page, or a screen of rows when not paginated'],
      ['Enter (header)', 'Sort; Shift + Enter adds to the sort'],
      ['Alt + Arrow Down / Shift + F10 / Menu (header)', 'Open the column menu'],
      ['Space', 'Select the row; Shift + Space selects a range'],
      ['Ctrl / ⌘ + A', 'Select all rows (`selection="multiple"`)'],
      ['Enter / F2 / typing', 'Edit the cell (Enter saves and moves down, Tab saves and moves sideways, Escape cancels)'],
      ['Enter (read-only cell)', 'Fire `focsd-row-activate`'],
      ['Enter / Space / Arrow Right / Arrow Left (group row)', 'Toggle, expand or collapse the group (arrows in the first column)'],
    ],
  },
  tree: {
    summary: 'A hierarchical list that expands and collapses, like a file browser.',
    html: `<focsd-tree label="Project files">
  <focsd-tree-item label="src" value="src" expanded>
    <focsd-tree-item label="index.js" value="src/index.js"></focsd-tree-item>
    <focsd-tree-item label="components" value="src/components">
      <focsd-tree-item label="button.js" value="src/components/button.js"></focsd-tree-item>
    </focsd-tree-item>
  </focsd-tree-item>
  <focsd-tree-item label="package.json" value="package.json"></focsd-tree-item>
  <focsd-tree-item label="README.md" value="README.md"></focsd-tree-item>
</focsd-tree>`,
    a11y: [
      'APG tree view: `role="tree"`, items are `role="treeitem"` with `aria-level`, `aria-expanded` (parents only) and `aria-selected`.',
      'One tab stop. If the focused item is hidden because a parent collapses (for example from code), focus moves to the nearest visible parent, so it is never lost.',
    ],
    keyboard: [
      ['Arrow Up / Down', 'Previous / next visible item'],
      ['Arrow Right', 'Expand, or move to the first child'],
      ['Arrow Left', 'Collapse, or move to the parent'],
      ['Home / End', 'First / last item'],
      ['Enter / Space', 'Select'],
      ['Type a letter', 'Jump to an item'],
    ],
  },
  timeline: {
    summary: 'Events in time order, each with a date, a heading and details.',
    html: `<focsd-timeline>
  <focsd-timeline-item datetime="2026-10-01" heading="Project created">Amara created Atlas.</focsd-timeline-item>
  <focsd-timeline-item datetime="2026-10-03" heading="Invoice paid" tone="positive">Payment received.</focsd-timeline-item>
</focsd-timeline>`,
    a11y: ['A list of items, each with a machine-readable `<time datetime>` and its heading text. Markers are decorative.'],
  },
  'empty-state': {
    summary: 'Explains why a view is empty and what to do next.',
    html: `<focsd-empty-state headline="No reports yet" icon="search">
  <p>Reports you create will appear here.</p>
  <focsd-button slot="actions" variant="action">Create report</focsd-button>
</focsd-empty-state>`,
    a11y: [
      'A real heading (level from `level`, default 2) so the state is discoverable by heading navigation.',
      'Not a live region: announce changes elsewhere if content disappears after an action.',
    ],
  },
  code: {
    summary: 'A code block with a copy button.',
    html: `<div class="full"><focsd-code label="Install command" language="shell">pnpm add @focsd/components</focsd-code></div>`,
    a11y: [
      'The `<pre>` is a focusable, labeled region so long lines can be scrolled with the keyboard.',
      '"Copy code" announces "Copied" in a polite live region. If copying fails, it announces "Copy failed" and selects the code so it can be copied by hand.',
    ],
  },
  image: {
    summary: 'An image with a fixed aspect ratio and a fallback when it fails to load.',
    html: `<focsd-image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%230A5E73'/%3E%3Ccircle cx='120' cy='26' r='12' fill='%23F2B705'/%3E%3Cpath d='M0 90 50 40l30 30 20-20 60 40z' fill='%23141A18'/%3E%3C/svg%3E" alt="Illustration of hills under a sun" ratio="16/9" style="inline-size: 240px"></focsd-image>`,
    a11y: [
      '`srcset`, `sizes`, `width` and `height` (which also reserve the aspect ratio), `loading` (default `lazy`), `decoding`, `fetchpriority`, `crossorigin` and `referrerpolicy` are forwarded; `complete`, `naturalWidth`, `naturalHeight` and `decode()` work as on a native image.',
      '`alt` is required: describe the image, or use `alt=""` for decorative images.',
      'If loading fails, the fallback panel keeps the description (`role="img"` with `aria-label`).',
      'Loads lazily and decodes asynchronously by default.',
    ],
  },
  'scroll-area': {
    summary: 'A height-limited region whose content scrolls.',
    html: `<focsd-scroll-area label="Release notes" max-block-size="6rem">
  <p>v0.4: Added data grid.</p><p>v0.3: Added overlays.</p><p>v0.2: Added forms.</p><p>v0.1: Initial release.</p>
</focsd-scroll-area>`,
    a11y: ['A focusable, labeled `role="region"`, so keyboard users can scroll it (WCAG 2.1.1).'],
    keyboard: [['Arrow keys / Page Up / Down', 'Scroll (when focused)']],
  },
  splitter: {
    summary: 'Two resizable panes with a draggable divider.',
    html: `<div class="full"><focsd-splitter label="Resize file list" value="40" style="block-size: 10rem">
  <div slot="start">File list</div>
  <div slot="end">Preview</div>
</focsd-splitter></div>`,
    a11y: [
      'APG window splitter: the divider is a focusable `role="separator"` with `aria-valuenow/min/max` and `aria-controls` pointing at the start pane.',
    ],
    keyboard: [
      ['Arrow keys', 'Resize by 1% (10% with Shift)'],
      ['Home / End', 'Minimum / maximum'],
      ['Enter', 'Collapse or restore'],
    ],
    more: [
      {
        id: 'panes',
        title: 'Panes',
        summary: 'Any number of resizable panes, side by side or stacked, with collapsible panes and a saved layout.',
        html: `<div class="full"><focsd-splitter autosave="docs-mail" style="block-size: 14rem">
  <focsd-splitter-pane label="Folders" size="25" min="15">Inbox, Sent, Drafts</focsd-splitter-pane>
  <focsd-splitter-pane label="Messages" min="20">Quarterly report draft</focsd-splitter-pane>
  <focsd-splitter-pane label="Preview" size="35" collapsible>Select a message to read it here.</focsd-splitter-pane>
</focsd-splitter></div>`,
        a11y: [
          'Each boundary is an APG window splitter: a focusable `role="separator"` named "Resize <pane label>", with `aria-valuenow` (the size of the pane before it) and that pane’s `min` and `max` as `aria-valuemin` and `aria-valuemax`.',
          'Separators are vertical lines in a row of panes and horizontal lines with `orientation="vertical"`; `aria-orientation` says which.',
          'A collapsed pane is hidden (`display: none`), so its content leaves the tab order until it is restored.',
          'The visible line is thin, but the pointer target is 24 px wide.',
          'With `autosave`, the sizes are kept in `localStorage` under `focsd-splitter:<key>` and come back on the next visit. Splitters can be nested.',
          'Markup with `start` and `end` slots instead of panes keeps the two-pane behavior (`change` event).',
          '`orientation` is new and applies to panes only. It does not reflect, so style on `focsd-splitter[orientation=vertical]` only when you set the attribute, not the property.',
        ],
        keyboard: [
          ['Arrow keys', 'Resize by 1% (Left and Right in a row, mirrored right to left; Up and Down in a column)'],
          ['Shift + arrow keys', 'Resize by 10%'],
          ['Home / End', 'The pane before the separator to its minimum / maximum'],
          ['Enter', 'Collapse or restore the collapsible pane beside the separator'],
        ],
      },
    ],
  },
  carousel: {
    summary: 'A set of slides shown one at a time, with optional rotation.',
    html: `<focsd-carousel label="Featured templates">
  <focsd-carousel-slide><p>Invoice template</p></focsd-carousel-slide>
  <focsd-carousel-slide><p>Roadmap template</p></focsd-carousel-slide>
  <focsd-carousel-slide><p>Retro template</p></focsd-carousel-slide>
</focsd-carousel>`,
    a11y: [
      'APG carousel: a labeled region with `aria-roledescription="carousel"`; slides are groups named "1 of 3". Hidden slides are `inert`.',
      'With `autoplay`, a Stop/Start rotation button appears; rotation pauses while hovered or focused and starts paused under reduced motion.',
      'Slide changes are announced politely except while rotating.',
    ],
  },
  chart: {
    summary: 'Bar, line, area, stacked, scatter and donut charts whose data is also a summary, a table and keyboard-explorable points.',
    html: `<div class="full"><focsd-chart id="chart-demo" label="Revenue by quarter" x="quarter"></focsd-chart></div>`,
    script: `const chart = document.getElementById('chart-demo');
chart.series = [
  { key: 'online', label: 'Online' },
  { key: 'stores', label: 'Stores' },
];
chart.format = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };
chart.data = [
  { quarter: 'Q1', online: 1200, stores: 900 },
  { quarter: 'Q2', online: 1500, stores: 950 },
  { quarter: 'Q3', online: 1700, stores: 1100 },
  { quarter: 'Q4', online: 2100, stores: 1300 },
];`,
    a11y: [
      'A figure named by its caption and described by a generated summary ("Bar chart, 4 categories, 2 series. Highest: Online, Q4, $2,100."), or your own `description`.',
      'Data points are one tab stop: arrow keys move between categories (left and right) and series (up and down), Home and End jump to the ends, and each point is named "Series, category: value".',
      'The Show data table button reveals the same numbers as a real table with row and column headers.',
      'Series differ by pattern and marker shape as well as color, so the chart works in grayscale and for color-blind readers.',
      'Values are formatted with `Intl.NumberFormat` (`format` property) in the page language.',
      'Set `type` to `area` or `scatter`, add `stacked` to bars or areas, and `mirror` to flip the horizontal direction. See [the charts guide](/guides/charts/) for each type.',
    ],
    keyboard: [
      ['Tab', 'Move to the chart, then to the table button'],
      ['Arrow Left / Right', 'Previous / next category'],
      ['Arrow Up / Down', 'Previous / next series'],
      ['Home / End', 'First / last category in the series'],
    ],
  },
};
