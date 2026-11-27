import './base.js';
import '@focsd-dev/components';
import '@focsd-dev/charts';

const bar = document.getElementById('bar');

bar.series = [
  { key: 'online', label: 'Online' },
  { key: 'stores', label: 'Stores' },
];

bar.format = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };

bar.data = [
  { quarter: 'Q1', online: 1200, stores: 900 },
  { quarter: 'Q2', online: 1500, stores: 950 },
  { quarter: 'Q3', online: 1700, stores: 1100 },
  { quarter: 'Q4', online: 2100, stores: 1300 },
];

const line = document.getElementById('line');

line.series = [{ key: 'users', label: 'Users' }];

line.data = [
  { week: 'W1', users: 320 },
  { week: 'W2', users: 410 },
  { week: 'W3', users: 380 },
  { week: 'W4', users: 520 },
];

const donut = document.getElementById('donut');

donut.series = [{ key: 'visits', label: 'Visits' }];

donut.data = [
  { source: 'Search', visits: 540 },
  { source: 'Direct', visits: 300 },
  { source: 'Social', visits: 160 },
];

// Wave 18b: the new types, with the same data shape (one row per category, a number per series).

const area = document.getElementById('area');
const stackedArea = document.getElementById('stacked-area');

const channels = [
  { key: 'online', label: 'Online' },
  { key: 'stores', label: 'Stores' },
  { key: 'partners', label: 'Partners' },
];

const months = [
  { month: 'Jan', online: 2100, stores: 1400, partners: 600 },
  { month: 'Feb', online: 2400, stores: 1300, partners: 700 },
  { month: 'Mar', online: 3000, stores: 1500, partners: 650 },
  { month: 'Apr', online: 3600, stores: 1700, partners: 800 },
  { month: 'May', online: 3900, stores: 1600, partners: 900 },
  { month: 'Jun', online: 4100, stores: 1800, partners: 950 },
];

const dollars = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };

for (const el of [area, stackedArea]) {
  el.series = channels;
  el.format = dollars;
  el.data = months;
}

const stacked = document.getElementById('stacked');

stacked.series = bar.series;

stacked.format = dollars;

stacked.data = [
  { quarter: 'Q1', online: 1200, stores: 900 },
  { quarter: 'Q2', online: 1500, stores: 950 },
  { quarter: 'Q3', online: 1700, stores: -300 },
  { quarter: 'Q4', online: 2100, stores: 1300 },
];

const scatter = document.getElementById('scatter');

scatter.series = [
  { key: 'api', label: 'API' },
  { key: 'web', label: 'Web' },
];

scatter.format = { style: 'unit', unit: 'millisecond', maximumFractionDigits: 0 };

scatter.xFormat = { maximumFractionDigits: 0 };

scatter.data = [
  { load: 10, api: 42, web: 88 },
  { load: 25, api: 47, web: 95 },
  { load: 40, api: 55, web: null },
  { load: 55, api: 61, web: 120 },
  { load: 70, api: 80, web: 141 },
  { load: 85, api: 97, web: 170 },
];

const mirrored = document.getElementById('mirrored');

mirrored.series = bar.series;

mirrored.data = bar.data;
