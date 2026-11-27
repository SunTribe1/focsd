import './base.js';
import * as focsd from '@focsd-dev/components';
import '@focsd-dev/data-grid';

const grid = document.getElementById('l-grid');

grid.columns = [
  { id: 'name', header: 'Name' },
  { id: 'active', header: 'Active', type: 'boolean', groupable: true },
  { id: 'amount', header: 'Amount', type: 'number', filterable: true },
];

grid.rows = [
  { id: 1, name: 'Ada', active: true, amount: 1234.5 },
  { id: 2, name: 'Bo', active: false, amount: 2 },
  { id: 3, name: '', active: null, amount: null },
];

grid.quickSearch = true;

const de = document.getElementById('l-grid-de');

de.columns = [{ id: 'amount', header: 'Betrag', type: 'number' }];

de.rows = [{ id: 1, amount: 1234.5 }];

window.focsd = focsd;
