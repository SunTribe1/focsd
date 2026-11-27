// Custom event payloads are typed (docs/events.md): the HTMLElementEventMap augmentation and the
// exported `*Detail` types.
import type { MenuSelectDetail, PageChangeDetail, TableSortDetail, TourStep } from '@focsd-dev/components';
import type { TourStep as PrimitivesTourStep } from '@focsd-dev/primitives';

const menu = document.createElement('focsd-menu');

menu.addEventListener('focsd-select', (e) => {
  const value: string = e.detail.value;
  void value;
});

const pagination = document.createElement('focsd-pagination');

pagination.addEventListener('focsd-page-change', (e) => {
  const page: number = e.detail.page;
  pagination.page = page;
});

document.createElement('focsd-table').addEventListener('focsd-sort', (e) => {
  const detail: TableSortDetail = e.detail;
  // @ts-expect-error: a table sort is never 'none'
  const none: typeof detail.direction = 'none';
  void none;
});

document.createElement('focsd-floating-panel').addEventListener('focsd-move', (e) => {
  const x: number = e.detail.x;
  void x;
});

menu.addEventListener('focsd-select', (e) => {
  // @ts-expect-error: `item` is only on a menu's detail; the command palette sends `value` alone
  void e.detail.item;
});

const asMenu = (detail: MenuSelectDetail): string => detail.item.value;
const page: PageChangeDetail = { page: 2 };

// The private tree signal is not part of the event map: its event is a plain Event.
document.createElement('focsd-tree-item').addEventListener('focsd-tree-item-change', (e) => {
  // @ts-expect-error: no detail on an untyped event
  void e.detail;
});

void asMenu;
void page;

// The type of `focsd-tour` `steps` is exported, so callers can name it.
const steps: TourStep[] = [{ target: '#search', title: 'Search', body: 'Find a project.', placement: 'bottom' }];
const tour = document.createElement('focsd-tour');

tour.steps = steps;
const fromPrimitives: PrimitivesTourStep = steps[0]!;
void fromPrimitives;
