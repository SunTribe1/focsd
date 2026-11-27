// Grid event payloads are typed (docs/events.md), alongside the components' own event map: both
// declare `focsd-page-change` with the same detail type, so they merge.
import type { PageChangeDetail, SortChangeDetail } from '@focsd-dev/data-grid';
import type {} from '@focsd-dev/components';

const grid = document.createElement('focsd-data-grid');

grid.addEventListener('focsd-sort-change', (e) => {
  const sort: SortChangeDetail = e.detail;
  const first: 'asc' | 'desc' | undefined = sort.sortModel[0]?.direction;
  void first;
});

grid.addEventListener('focsd-cell-edit', (e) => {
  const colId: string = e.detail.colId;
  if (colId === 'locked') e.preventDefault();
});

grid.addEventListener('focsd-page-change', (e) => {
  const detail: PageChangeDetail = e.detail;
  void detail;
});

grid.addEventListener('focsd-state-change', (e) => void e.detail.state.sortModel);
