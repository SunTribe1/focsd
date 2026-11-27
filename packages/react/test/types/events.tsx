// Custom events are typed React props: `focsd-select` → onFocsdSelect with its detail.
import { Menu, Pagination, Table, TreeItem } from '@focsd-dev/react';
import { DataGrid } from '@focsd-dev/react/data-grid';
import { Chart } from '@focsd-dev/react/chart';

export const menu = (
  <Menu
    onFocsdSelect={(event) => {
      const value: string = event.detail.value;
      void value;
    }}
  />
);

export const pages = <Pagination onFocsdPageChange={(event) => void (event.detail.page satisfies number)} />;

export const table = <Table onFocsdSort={(event) => void (event.detail.direction satisfies 'ascending' | 'descending')} />;

export const grid = <DataGrid onFocsdSortChange={(event) => void event.detail.sortModel.map((key) => key.colId)} />;

export const chart = <Chart onFocsdPointFocus={(event) => void (event.detail.value satisfies number | null)} />;

// @ts-expect-error: the private tree item signal is not a prop
export const internal = <TreeItem onFocsdTreeItemChange={() => {}} />;
