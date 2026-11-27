/** Live examples for the charts guide (src/content/docs/guides/charts.mdx). */

const MONTHS = `const channels = [
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
const dollars = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };`;

const fill = (id) => `${MONTHS}

const chart = document.getElementById('${id}');

chart.series = channels;
chart.format = dollars;
chart.data = months;`;

export const examples = [
  {
    id: 'area',
    title: 'Area chart',
    lead: 'Set `type="area"`. The fill is drawn with a pattern as well as a color, and the line on top keeps its marker shape.',
    html: `<div class="full"><focsd-chart id="guide-area" type="area" label="Sales by channel" x="month"></focsd-chart></div>`,
    script: fill('guide-area'),
  },
  {
    id: 'stacked',
    title: 'Stacked bars and areas',
    lead: 'Add `stacked` to bars or areas. Each point also says its share ("1,400 of 4,100"), the summary names the highest total, and the table gains a Total column.',
    html: `<div class="full"><focsd-chart id="guide-stacked" stacked label="Sales by channel, stacked" x="month"></focsd-chart></div>`,
    script: fill('guide-stacked'),
  },
  {
    id: 'scatter',
    title: 'Scatter chart',
    lead: 'A scatter has a number on both axes. Point `x` at the numeric column; each series is a column of y values. The arrow keys follow the x order, and the table lists every point.',
    html: `<div class="full"><focsd-chart id="guide-scatter" type="scatter" label="Price and units sold" x="price"></focsd-chart></div>`,
    script: `const chart = document.getElementById('guide-scatter');

chart.series = [
  { key: 'units', label: 'Units sold' },
  { key: 'returns', label: 'Returns' },
];
chart.data = [
  { price: 5, units: 410, returns: 12 },
  { price: 10, units: 360, returns: 20 },
  { price: 15, units: 280, returns: 18 },
  { price: 20, units: 190, returns: 25 },
  { price: 25, units: 120, returns: 22 },
  { price: 30, units: 80, returns: 30 },
];`,
  },
  {
    id: 'mirror',
    title: 'Mirrored direction',
    lead: 'Charts are drawn left to right in every direction, because time runs that way in most right-to-left charts. Add `mirror` to flip the categories and move the value axis to the right; Left and Right then follow what you see.',
    html: `<div class="full"><focsd-chart id="guide-mirror" mirror dir="rtl" label="Sales by channel" x="month"></focsd-chart></div>`,
    script: fill('guide-mirror'),
  },
  {
    id: 'sparkline',
    title: 'Sparklines',
    lead: 'A sparkline is a word-sized image of a series, named by a sentence. It is not interactive: put the detail in a chart.',
    html: `<div class="stack">
  <p>Signups <focsd-sparkline id="guide-spark" label="Signups per day" show-last></focsd-sparkline> up 325% this week.</p>
  <focsd-stat label="Revenue" value="48200" period="last month" delta="0.124" id="guide-spark-stat"></focsd-stat>
</div>`,
    script: `document.getElementById('guide-spark').values = [4, 8, 6, 12, 19, 17];
document.getElementById('guide-spark-stat').format = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };`,
  },
  {
    id: 'gauge',
    title: 'Gauge',
    lead: 'A gauge shows one value against a range. Bands name the ranges, so the state is in words and a list, not only in color.',
    html: `<div class="stack"><focsd-gauge id="guide-gauge" label="Disk used" show-value></focsd-gauge></div>`,
    script: `const gauge = document.getElementById('guide-gauge');

gauge.value = 72;
gauge.format = { style: 'unit', unit: 'percent' };
gauge.bands = [
  { to: 60, label: 'Normal', tone: 'positive' },
  { to: 85, label: 'Warning', tone: 'caution' },
  { to: 100, label: 'Critical', tone: 'critical' },
];`,
  },
];
