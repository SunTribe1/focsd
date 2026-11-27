import type { ChartRow, ChartSeries, GaugeBand, FocsdChart, FocsdGauge, FocsdSparkline } from '@focsd/charts';

const chart: FocsdChart = document.createElement('focsd-chart');
chart.type = 'line';
chart.data = [{ label: 'Jan', sales: 3 }];
chart.series = [{ key: 'sales', label: 'Sales' }];
const summary: string = chart.summary;
void summary;

// The model typedefs come from the package entry (types I2).

const rows: ChartRow[] = [{ label: 'Feb', sales: 5 }];
const series: ChartSeries[] = [{ key: 'sales', label: 'Sales' }];
chart.data = rows;
chart.series = series;

// The small elements.
const spark: FocsdSparkline = document.createElement('focsd-sparkline');
spark.values = [1, 2, 3];
spark.type = 'area';
const sparkText: string = spark.summary;
void sparkText;

const gauge: FocsdGauge = document.createElement('focsd-gauge');
const bands: GaugeBand[] = [{ to: 60, label: 'Normal', tone: 'positive' }];
gauge.bands = bands;
gauge.value = 72;
