import './base.js';
import '@focsd-dev/components';

const table = document.getElementById('p-table');

table.columns = [{ key: 'name', label: 'Name' }];

table.rows = [{ name: 'Ada' }];
