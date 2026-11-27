import { FocsdChart } from './chart.js';
import { FocsdGauge } from './gauge.js';
import { FocsdSparkline } from './sparkline.js';
import { defineElement } from '@focsd/primitives/internal';

export { FocsdChart, FocsdGauge, FocsdSparkline };

/**
 * @typedef {import('./chart.js').PointFocusDetail} PointFocusDetail
 * @typedef {import('./chart.js').ChartRow} ChartRow
 * @typedef {import('./chart.js').ChartSeries} ChartSeries
 * @typedef {import('./gauge.js').GaugeBand} GaugeBand
 */

export { niceTicks, niceStep, linear, arcPath } from './scale.js';

defineElement('focsd-chart', FocsdChart);

defineElement('focsd-sparkline', FocsdSparkline);

defineElement('focsd-gauge', FocsdGauge);
