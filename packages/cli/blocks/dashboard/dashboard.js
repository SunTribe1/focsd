// Sample behavior for the dashboard block. Replace the data with your own.
import '@focsd/components/focsd-app-shell.js';
import '@focsd/components/focsd-avatar.js';
import '@focsd/components/focsd-footer.js';
import '@focsd/components/focsd-header.js';
import '@focsd/components/focsd-icon-button.js';
import '@focsd/components/focsd-menu.js';
import '@focsd/components/focsd-menu-item.js';
import '@focsd/components/focsd-sidebar.js';
import '@focsd/components/focsd-sidebar-item.js';
import '@focsd/components/focsd-stat.js';
import '@focsd/components/focsd-theme-toggle.js';
import '@focsd/charts';
import '@focsd/data-grid';

const spark = (id, values) => {
  document.getElementById(id).values = values;
};

spark('spark-revenue', [1210, 1340, 1190, 1480, 1620, 1390, 1710, 1580, 1650, 1820, 1760, 1690, 1930, 2010]);

spark('spark-orders', [31, 36, 29, 38, 41, 35, 44, 40, 42, 47, 43, 41, 49, 52]);

const chart = document.getElementById('revenue-chart');

chart.series = [{ key: 'revenue', label: 'Revenue' }];

chart.format = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };

chart.data = [8200, 8900, 8400, 9600, 10100, 9800, 10900, 11400, 10800, 12100, 12700, 13300].map((revenue, i) => ({
  week: `Wk ${i + 1}`,
  revenue,
}));

const customers = ['Harbor Bakery', 'Fernwood Cafe', 'Mina Okafor', 'Clay & Co', 'Tomás Herrera', 'Signal Hill Deli', 'Priya Raman'];
const statuses = ['paid', 'shipped', 'pending', 'refunded'];

const grid = document.getElementById('orders-grid');

grid.columns = [
  { id: 'order', header: 'Order', type: 'number', width: 110, formatOptions: { useGrouping: false } },
  { id: 'customer', header: 'Customer', width: 200 },
  { id: 'items', header: 'Items', type: 'number', width: 90 },
  { id: 'total', header: 'Total', type: 'number', width: 120, formatOptions: { style: 'currency', currency: 'USD' } },
  { id: 'placed', header: 'Placed', type: 'date', width: 130 },
  {
    id: 'status',
    header: 'Status',
    type: 'enum',
    width: 120,
    options: statuses.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) })),
  },
];

grid.rows = Array.from({ length: 20 }, (_, i) => ({
  order: 4120 - i,
  customer: customers[(i * 3) % customers.length],
  items: ((i * 5) % 9) + 1,
  total: (((i * 7919) % 18000) + 1800) / 100,
  placed: `2026-11-${String(24 - Math.floor(i / 2)).padStart(2, '0')}`,
  status: statuses[i % 7 === 6 ? 3 : i % 3],
}));
