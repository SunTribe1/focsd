import './base.js';
import '@focsd/components';

const table = document.getElementById('p-table');

table.columns = [{ key: 'name', label: 'Name' }];

table.rows = [{ name: 'Ada' }];
