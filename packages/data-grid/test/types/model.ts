// Deeper consumer checks (types C1, M5, M6, M10): nullable counts, typed column callbacks and no
// internal `_x` state in the published surface.
import type { ColumnDef, ColumnType, Filter, GridState, FocsdDataGrid, Row, SortKey } from '@focsd-dev/data-grid';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const exact = <A, B>(ok: Equal<A, B>): void => void ok;

declare const grid: FocsdDataGrid;

exact<typeof grid.counts.filteredFrom, number | null>(true);

interface Person {
  id: number;
  first: string;
  last: string;
  age: number;
}

const fullName: ColumnDef<Person> = {
  id: 'name',
  valueGetter: (person) => `${person.first} ${person.last}`,
  validate: (value, person) => (person.age < 0 ? 'Age must be positive' : null),
  render: (value, person) => person.first,
};
// @ts-expect-error: the row is a Person, which has no `email`
const wrong: ColumnDef<Person> = { id: 'email', valueGetter: (person) => person.email };

// Typed columns still go straight into the grid.
grid.columns = [fullName, { id: 'age', type: 'number' }];

// @ts-expect-error: internal reactive state is not part of the public typings
void grid._colState;
// @ts-expect-error: internal reactive state is not part of the public typings
void grid._cols;
void wrong;

// The model typedefs come from the package entry (types I2).
declare const state: GridState;
const sortKey: SortKey | undefined = state.sortModel[0];
const filter: Filter | undefined = state.filterModel.name;
const kind: ColumnType = 'number';
const row: Row = { id: 1 };
void [sortKey, filter, kind, row];
