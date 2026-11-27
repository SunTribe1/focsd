import './base.js';
import '@focsd-dev/components';
import '@focsd-dev/data-grid';

const customers = ['Northwind', 'Contoso', 'Fabrikam', 'Tailspin', 'Wingtip', 'Adatum', 'Café Nord'];
const owners = ['Amara Okafor', 'Lukas Brandt', 'Priya Raman', 'Tomás Herrera'];

export const invoiceColumns = [
  { id: 'id', header: 'Invoice', type: 'number', pinned: 'start', width: 112, formatOptions: { useGrouping: false } },
  { id: 'customer', header: 'Customer', editable: true, required: true },
  {
    id: 'region',
    header: 'Region',
    type: 'enum',
    editable: true,
    options: [
      { value: 'eu', label: 'Europe' },
      { value: 'us', label: 'Americas' },
      { value: 'ap', label: 'Asia Pacific' },
    ],
  },
  {
    id: 'amount',
    header: 'Amount',
    type: 'number',
    aggregate: 'sum',
    editable: true,
    min: 0,
    formatOptions: { style: 'currency', currency: 'EUR' },
  },
  { id: 'due', header: 'Due', type: 'date', aggregate: 'max', editable: true },
  { id: 'paid', header: 'Paid', type: 'boolean', editable: true },
  { id: 'owner', header: 'Owner', width: 200 },
  { id: 'notes', header: 'Notes', width: 280, sortable: false },
  {
    id: 'status',
    header: 'Status',
    type: 'enum',
    pinned: 'end',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'overdue', label: 'Overdue' },
    ],
  },
];

export const invoiceRows = Array.from({ length: 64 }, (_, i) => ({
  id: 1001 + i,
  customer: customers[i % customers.length],
  region: ['eu', 'us', 'ap'][i % 3],
  amount: i % 9 === 0 ? null : ((i * 7919) % 9000) + 120,
  due: i % 11 === 0 ? null : `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
  paid: i % 4 === 0 ? null : i % 3 === 0,
  owner: owners[i % owners.length],
  notes: i % 5 === 0 ? 'Follow up after the quarterly review meeting' : '',
  status: ['draft', 'sent', 'overdue'][i % 3],
}));

const invoices = document.getElementById('invoices');

invoices.columns = invoiceColumns;

invoices.rows = invoiceRows;

invoices.rowId = 'id';

invoices.addEventListener('focsd-selection-change', (event) => {
  document.getElementById('invoices-selected').value = String(event.detail.ids.length);
});

for (const type of [
  'focsd-sort-change',
  'focsd-filter-change',
  'focsd-search-change',
  'focsd-column-change',
  'focsd-group-change',
  'focsd-page-change',
  'focsd-cell-edit',
  'focsd-row-activate',
]) {
  invoices.addEventListener(type, () => {
    document.getElementById('invoices-event').value = type;
  });
}

const big = document.getElementById('big');

big.columns = [
  { id: 'n', header: 'Row', type: 'number', pinned: 'start', width: 96 },
  { id: 'name', header: 'Name' },
  { id: 'value', header: 'Value', type: 'number' },
];

big.rows = Array.from({ length: 5000 }, (_, i) => ({ n: i + 1, name: `Item ${i + 1}`, value: (i * 37) % 1000 }));

big.rowId = 'n';
