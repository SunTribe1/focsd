import './base.js';
import '@focsd-dev/components';
import '@focsd-dev/data-grid';

const table = document.getElementById('tbl');

table.columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'role', label: 'Role' },
  { key: 'projects', label: 'Projects', sortable: true, numeric: true },
];

table.rows = [
  { name: 'Lukas Brandt', role: 'Editor', projects: 8 },
  { name: 'Amara Okafor', role: 'Owner', projects: 12 },
  { name: 'Priya Raman', role: 'Editor', projects: 5 },
];

const grid = document.getElementById('grid');

grid.columns = [
  { id: 'id', header: 'Invoice' },
  { id: 'customer', header: 'Customer' },
  { id: 'amount', header: 'Amount', type: 'number' },
  { id: 'status', header: 'Status' },
];

const customers = ['Northwind', 'Contoso', 'Fabrikam', 'Tailspin', 'Wingtip', 'Adatum'];

grid.rows = Array.from({ length: 23 }, (_, i) => ({
  id: `INV-${String(i + 1).padStart(3, '0')}`,
  customer: customers[i % customers.length],
  amount: ((i * 137) % 900) + 100,
  status: i % 4 === 0 ? 'Overdue' : 'Paid',
}));

grid.addEventListener('focsd-selection-change', (event) => {
  document.getElementById('grid-selected').value = String(event.detail.ids.length);
});

document.getElementById('tree').addEventListener('change', (event) => {
  document.getElementById('tree-result').value = event.target.value;
});
