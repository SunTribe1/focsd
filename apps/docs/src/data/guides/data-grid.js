// cspell:ignore Mitarbeitende durchsuchen Suchen Kompakte Zeilen Gruppieren nach Nach Keine Gruppierung gruppieren Gehalt Beginn Zeilen exportieren Nein von
/** Live examples for the data grid guide (src/content/docs/guides/data-grid.mdx). */

const PEOPLE = `const people = [
  { id: 1, name: 'Ada Lovelace', team: 'Research', started: '2019-03-04', salary: 98000, remote: true },
  { id: 2, name: 'Grace Hopper', team: 'Platform', started: '2016-07-18', salary: 121000, remote: false },
  { id: 3, name: 'Alan Turing', team: 'Research', started: '2021-01-11', salary: 104500, remote: true },
  { id: 4, name: 'Katherine Johnson', team: 'Data', started: '2018-09-24', salary: 112000, remote: false },
  { id: 5, name: 'Linus Torvalds', team: 'Platform', started: '2022-05-02', salary: 99500, remote: true },
  { id: 6, name: 'Margaret Hamilton', team: 'Data', started: '2015-11-30', salary: 131000, remote: true },
];`;

const PEOPLE_COLUMNS = `[
  { id: 'name', header: 'Name' },
  { id: 'team', header: 'Team', groupable: true },
  { id: 'started', header: 'Started', type: 'date' },
  { id: 'salary', header: 'Salary', type: 'number', formatOptions: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } },
  { id: 'remote', header: 'Remote', type: 'boolean' },
]`;

export const examples = [
  {
    id: 'basics',
    title: 'Columns and rows',
    lead: 'Give the grid a label, column definitions and row objects. Every column sorts, filters by its type and resizes; nothing else is required.',
    html: `<div class="full"><focsd-data-grid id="dg-basics" label="People"></focsd-data-grid></div>`,
    script: `${PEOPLE}
const grid = document.getElementById('dg-basics');
grid.columns = ${PEOPLE_COLUMNS};
grid.rows = people;`,
  },
  {
    id: 'saved-view',
    title: 'Search, filters and a saved view',
    lead: 'Turn on the toolbar and quick search. `focsd-state-change` fires (debounced) whenever the view changes; save `getState()` and restore it with `setState()`.',
    html: `<div class="full"><focsd-data-grid id="dg-view" label="People" toolbar quick-search></focsd-data-grid></div>`,
    script: `${PEOPLE}
const grid = document.getElementById('dg-view');
grid.columns = ${PEOPLE_COLUMNS};
grid.rows = people;

// Restore the last view, then keep saving it.
const saved = localStorage.getItem('people-view');
if (saved) grid.setState(JSON.parse(saved));
grid.addEventListener('focsd-state-change', (event) => {
  localStorage.setItem('people-view', JSON.stringify(event.detail.state));
});`,
  },
  {
    id: 'grouping',
    title: 'Grouping and totals',
    lead: 'Mark columns `groupable` and give number or date columns an `aggregate` (`sum`, `avg`, `min`, `max`, `count` or a function). Group rows show the totals; grouped grids become a treegrid.',
    html: `<div class="full"><focsd-data-grid id="dg-group" label="Salaries by team" toolbar></focsd-data-grid></div>`,
    script: `${PEOPLE}
const grid = document.getElementById('dg-group');
grid.columns = [
  { id: 'name', header: 'Name' },
  { id: 'team', header: 'Team', groupable: true },
  { id: 'salary', header: 'Salary', type: 'number', aggregate: 'sum',
    formatOptions: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 } },
  { id: 'started', header: 'Earliest start', type: 'date', aggregate: 'min' },
];
grid.rows = people;
grid.setGroupBy(['team']);`,
  },
  {
    id: 'editing',
    title: 'Editing with validation',
    lead: 'Editable columns open a typed editor on Enter, F2 or typing. Built-in checks cover `required`, `min`, `max` and enum options; `validate(value, row)` adds your own. `focsd-cell-edit` is cancelable, so you can veto or persist each change.',
    html: `<div class="full"><focsd-data-grid id="dg-edit" label="Budget"></focsd-data-grid>
<p class="focsd-docs-target" id="dg-edit-log">Edit a cell to see the event.</p></div>`,
    script: `const grid = document.getElementById('dg-edit');
grid.columns = [
  { id: 'item', header: 'Item', editable: true, required: true },
  { id: 'owner', header: 'Owner', type: 'enum', editable: true,
    options: [{ value: 'ops', label: 'Operations' }, { value: 'eng', label: 'Engineering' }] },
  { id: 'amount', header: 'Amount', type: 'number', editable: true, min: 0,
    validate: (value) => (value > 50000 ? 'Amounts over 50,000 need approval.' : null) },
  { id: 'approved', header: 'Approved', type: 'boolean', editable: true },
];
grid.rows = [
  { id: 1, item: 'Laptops', owner: 'eng', amount: 24000, approved: true },
  { id: 2, item: 'Office rent', owner: 'ops', amount: 18000, approved: true },
  { id: 3, item: 'Conference', owner: 'ops', amount: 6500, approved: false },
];
grid.addEventListener('focsd-cell-edit', (event) => {
  const { colId, oldValue, newValue } = event.detail;
  document.getElementById('dg-edit-log').textContent = \`\${colId}: \${oldValue} → \${newValue}\`;
  // event.preventDefault() would keep the old value.
});`,
  },
  {
    id: 'server',
    title: 'Server-side data',
    lead: 'With `external`, the grid sorts, filters, searches and pages nothing itself: it fires events, and you load the page and set `rows`, `row-count` and `loading`. This example fakes the server with a delay.',
    html: `<div class="full"><focsd-data-grid id="dg-server" label="Orders" external page-size="5" quick-search></focsd-data-grid></div>`,
    script: `const all = Array.from({ length: 47 }, (_, i) => ({
  id: i + 1,
  customer: ['Northwind', 'Contoso', 'Fabrikam', 'Tailspin'][i % 4],
  total: ((i * 7919) % 900) + 40,
}));
const grid = document.getElementById('dg-server');
grid.columns = [
  { id: 'id', header: 'Order', type: 'number' },
  { id: 'customer', header: 'Customer' },
  { id: 'total', header: 'Total', type: 'number', formatOptions: { style: 'currency', currency: 'USD' } },
];

// Stand-in for fetch('/api/orders?…'): sort, search and page on the "server".
async function load() {
  const { sortModel, quickSearch, page } = grid.getState();
  grid.loading = true;
  await new Promise((resolve) => setTimeout(resolve, 300));
  let rows = all.filter((r) => r.customer.toLowerCase().includes(quickSearch.toLowerCase()));
  const [sort] = sortModel;
  if (sort) rows = rows.toSorted((a, b) => (a[sort.colId] > b[sort.colId] ? 1 : -1) * (sort.direction === 'asc' ? 1 : -1));
  grid.rowCount = rows.length;
  grid.rows = rows.slice((page - 1) * 5, page * 5);
  grid.loading = false;
}
for (const type of ['focsd-sort-change', 'focsd-search-change', 'focsd-filter-change', 'focsd-page-change']) grid.addEventListener(type, load);
load();`,
  },
  {
    id: 'custom-type',
    title: 'Custom column types and cells',
    lead: 'Register a column type to reuse formatting, sorting, parsing and filter operators across grids. `render(value, row)` returns the text shown in a cell.',
    imports: [{ names: ['registerType', 'getType'], from: '@focsd/data-grid' }],
    html: `<div class="full"><focsd-data-grid id="dg-type" label="Services"></focsd-data-grid></div>`,
    script: `// Durations stored in seconds, shown as "1 h 05 min", sorted and filtered as numbers.
const number = getType('number');
registerType('duration', {
  ...number,
  format: (seconds) => (seconds == null ? '' : \`\${Math.floor(seconds / 3600)} h \${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')} min\`),
});

const grid = document.getElementById('dg-type');
grid.columns = [
  { id: 'service', header: 'Service' },
  { id: 'uptime', header: 'Uptime', type: 'duration' },
  { id: 'status', header: 'Status', render: (value) => (value === 'ok' ? 'Operational' : 'Degraded') },
];
grid.rows = [
  { id: 1, service: 'API', uptime: 86100, status: 'ok' },
  { id: 2, service: 'Search', uptime: 3900, status: 'degraded' },
  { id: 3, service: 'Billing', uptime: 43200, status: 'ok' },
];`,
  },
  {
    id: 'selection',
    title: 'Selection and export',
    lead: '`selection="multiple"` adds a checkbox column (Space selects, Shift+Space selects a range, Ctrl+A selects all). `exportCsv()` returns the visible view or only the selection, protected against spreadsheet formula injection.',
    html: `<div class="full"><focsd-data-grid id="dg-select" label="People" selection="multiple"></focsd-data-grid>
<p><focsd-button id="dg-select-export">Copy selected rows as CSV</focsd-button> <output id="dg-select-count">0 selected</output></p></div>`,
    script: `${PEOPLE}
const grid = document.getElementById('dg-select');
grid.columns = ${PEOPLE_COLUMNS};
grid.rows = people;
grid.addEventListener('focsd-selection-change', (event) => {
  document.getElementById('dg-select-count').value = \`\${event.detail.ids.length} selected\`;
});
document.getElementById('dg-select-export').addEventListener('click', async () => {
  await navigator.clipboard.writeText(grid.exportCsv({ selectedOnly: true }));
});`,
  },
  {
    id: 'languages',
    title: 'Other languages',
    lead: 'Numbers and dates follow the nearest `lang`. Register a translation for the toolbar, menus, filters and announcements; any key you leave out stays English.',
    imports: [{ names: ['registerTranslation'], from: '@focsd/components' }],
    html: `<div class="full" lang="de"><focsd-data-grid id="dg-lang" label="Mitarbeitende" toolbar quick-search></focsd-data-grid></div>`,
    script: `registerTranslation({
  $code: 'de',
  $name: 'Deutsch',
  searchGrid: (label) => \`\${label} durchsuchen\`,
  searchPlaceholder: 'Suchen…',
  exportCsv: 'CSV exportieren',
  compactRows: 'Kompakte Zeilen',
  groupBy: 'Gruppieren nach',
  noGrouping: 'Keine Gruppierung',
  groupByColumn: (header) => \`Nach \${header} gruppieren\`,
  yes: 'Ja',
  no: 'Nein',
  footerRange: (from, to, matched) => \`Zeilen \${from}–\${to} von \${matched}\`,
});

${PEOPLE}
const grid = document.getElementById('dg-lang');
grid.columns = [
  { id: 'name', header: 'Name' },
  { id: 'team', header: 'Team', groupable: true },
  { id: 'started', header: 'Beginn', type: 'date' },
  { id: 'salary', header: 'Gehalt', type: 'number', formatOptions: { style: 'currency', currency: 'EUR' } },
  { id: 'remote', header: 'Remote', type: 'boolean' },
];
grid.rows = people;`,
  },
];
