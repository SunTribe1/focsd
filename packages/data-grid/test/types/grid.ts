import type { FocsdDataGrid } from '@focsd-dev/data-grid';
import type { Density } from '@focsd-dev/tokens';

const grid: FocsdDataGrid = document.createElement('focsd-data-grid');
grid.columns = [{ id: 'name', header: 'Name' }];
grid.rows = [{ id: 1, name: 'Ada' }];
grid.setGroupBy([]);
const csv: string = grid.exportCsv();
void csv;

// m58: the grid's density takes the tokens' vocabulary; `default` is the comfortable size.
const density: Density = 'default';
grid.density = density;
grid.density = 'compact';
// @ts-expect-error not a density
grid.density = 'cozy';
