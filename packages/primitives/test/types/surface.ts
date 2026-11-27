/**
 * Internal members (`_x` reactive state) and `any` callbacks stay out of the published surface
 * (types M5, M6).
 */
import { FocsdVirtualListBase } from '@focsd-dev/primitives';
import { exact } from './expect.js';

interface Person {
  name: string;
}

declare const list: FocsdVirtualListBase<Person>;

list.items = [{ name: 'Ada' }];
list.renderItem = (person, index) => `${index}: ${person.name}`;
exact<typeof list.items, Person[]>(true);
// @ts-expect-error: items are typed by the template parameter
list.items = [{ title: 'Ada' }];

declare const untyped: FocsdVirtualListBase;
// Without a type argument any item is accepted, as before.
untyped.renderItem = (item: Person) => item.name;

// @ts-expect-error: internal reactive state is not part of the public typings
void list._scrollTop;
