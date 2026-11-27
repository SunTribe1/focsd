/** Examples and accessibility notes: the small charts (sparkline, gauge). The chart itself is in data.js. */
export default {
  sparkline: {
    summary: 'A word-sized graphic of a series of numbers, named by a sentence that gives its range, last value and change.',
    html: `<div class="stack">
  <p>Signups <focsd-sparkline id="spark-line" label="Signups per day" show-last></focsd-sparkline> up this week.</p>
  <p>Visits <focsd-sparkline id="spark-area" label="Visits per hour" type="area"></focsd-sparkline></p>
  <p>Orders <focsd-sparkline id="spark-bar" label="Orders per day" type="bar"></focsd-sparkline></p>
</div>`,
    script: `document.getElementById('spark-line').values = [4, 8, 6, 12, 19, 17];
document.getElementById('spark-area').values = [30, 42, 38, 55, 61, 49, 70];
document.getElementById('spark-bar').values = [5, 9, 3, 12, 8, 14];`,
    a11y: [
      'An image named by its `label` and a generated sentence: "Signups per day: 6 values, from 4 to 19, last 17, up 325% from the first". The words are localized like every other component.',
      'It has no focusable points and is not a tab stop. When the detail matters, use a [chart](/components/chart/) with its data table.',
      'It is drawn at the size of the text (`--focsd-sparkline-height`, `--focsd-sparkline-width`), in one color. Forced colors use the system text color.',
      'Empty data is named "No data"; non-numbers are skipped.',
    ],
  },
  gauge: {
    summary: 'One value on a dial, with optional named bands such as Normal, Warning and Critical.',
    html: `<div class="stack">
  <focsd-gauge id="gauge-demo" label="CPU load" value="72" format="unit percent" show-value></focsd-gauge>
</div>`,
    script: `// The bands are data, so they are set from script.
document.getElementById('gauge-demo').bands = [
  { to: 60, label: 'Normal', tone: 'positive' },
  { to: 85, label: 'Warning', tone: 'caution' },
  { to: 100, label: 'Critical', tone: 'critical' },
];`,
    a11y: [
      'A `meter` named by its `label`, with `aria-valuemin`, `aria-valuemax` and `aria-valuenow`. The value text includes the current band, such as "72%, Warning", so no meaning is carried by color.',
      'The bands are also a visible list ("Normal, up to 60%"), with the current band marked, so the dial is not the only way to read them.',
      'The value is kept inside `min` and `max`; a `max` that is not above `min` falls back to `min + 1`. A missing `label` warns once in the console.',
      'There is no animation. Forced colors draw every shape in the system text color.',
    ],
  },
};
