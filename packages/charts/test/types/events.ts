// The chart's focsd-point-focus payload is typed (docs/events.md).
import type { PointFocusDetail } from '@focsd/charts';

document.createElement('focsd-chart').addEventListener('focsd-point-focus', (e) => {
  const detail: PointFocusDetail = e.detail;
  const value: number | null = detail.value;
  void value;
});
