import './base.js';
import '@focsd/components';
import '@focsd/charts';

const byId = (id) => document.getElementById(id);

byId('line').values = [4, 8, 6, 12, 19, 17];

byId('area').values = [120, 180, 150, 260, 310, 290];

byId('area').format = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };

byId('bar').values = [3, 5, 2, 8, 6, 9];

byId('fall').values = [10, 5];

const cpu = byId('cpu');

cpu.value = 72;

cpu.format = { style: 'unit', unit: 'percent' };

cpu.bands = [
  { to: 60, label: 'Normal', tone: 'positive' },
  { to: 85, label: 'Warning', tone: 'caution' },
  { to: 100, label: 'Critical', tone: 'critical' },
];
