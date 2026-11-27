# Event names

Every Focsd element follows one rule for the events it fires. New components follow it too: the
guard test `packages/components/test/events.test.mjs` checks the manifests of `@focsd/components`,
`@focsd/data-grid`, `@focsd/charts` and `@focsd/editor` on every test run.

## The rule

1. **A native name means the native meaning.** An element fires a native event name only when the
   event means what it means on a native element. Such an event is a plain `Event` with no
   `detail`; read the state from the element (`event.target.value`, `.open`, `.returnValue`).
2. **Everything else is `focsd-<name>`.** Lowercase words joined by hyphens: `focsd-select`,
   `focsd-sort-change`. A custom event that carries data is a `CustomEvent` whose `detail` has a
   named type.
3. **No aliases.** An event has one name. Nothing fires both an old and a new name.

The native names in use:

| Name     | Meaning, as on the native element                                                   | Fired by                                                                        |
| -------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `input`  | The value changed while the person edits (like `<input>`).                          | Form controls, rich text.                                                       |
| `change` | The person committed a new value (like `<input>`, `<select>`).                      | Form controls, tabs, tree, list, splitter, virtual list, rich text.             |
| `toggle` | The element opened or closed, however it happened (like `<details>`).               | Disclosure, accordion item, nav menu item.                                      |
| `close`  | The element closed (like `<dialog>`).                                               | Dialog, alert dialog, drawer, bottom sheet, floating panel, hover card.         |
| `cancel` | A close request is about to close a dialog; cancel it to keep it open (`<dialog>`). | Dialog, alert dialog, drawer.                                                   |

A native name never carries a `detail`: when an event needs a payload, it gets a `focsd-*` name
(pagination fires `focsd-page-change`, not a `change` with `detail.page`).

## Bubbling

4. **`focsd-*` events bubble and are not composed** (`{ bubbles: true }`), so a listener on an
   ancestor in the same tree hears them, including the first event from markup before the element
   upgrades. They do not cross a shadow root. This is the convention most Focsd events already
   followed (survey at wave 14b: 28 of 33 `focsd-*` dispatches in primitives, data grid and
   charts bubbled).
5. **Native names follow the native element.** `input` and `change` bubble. `close`, `cancel` and
   `toggle` do not, as on `<dialog>` and `<details>`. To hear them on an ancestor, listen in the
   capture phase (`addEventListener('toggle', fn, { capture: true })`), as the accordion and the nav
   menu do for their items.

Exceptions, kept on purpose (the guard in `packages/components/test/events.test.mjs` scans the
sources of every package and allows only these, each named by event, and fails if one is no longer
used):

| Event                                                         | Why                                                                                    |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `focsd-command`                                               | A `CommandEvent` fired on the `commandfor` target, as the native `command` event is.   |
| `focsd-snap-change`, `focsd-range-change`, `focsd-country-change` | Also composed (they predate the rule); they bubble out of the shadow root they sit in. |

## When an event fires

6. **Events report what the person did, or what changed on its own.** An element fires an event
   for a user action (a click, a key, a drag) or for a change that happened without the owner
   asking (a layout change, a failed load, data arriving). It does not fire one just because the
   owner set a property: the owner already knows. This is Lit's rule
   (https://lit.dev/docs/components/events/) and open-wc's.
7. **Native-parity events are the exception, on purpose.** `toggle` fires on every open or close,
   including `el.open = true`, because native `<details>` does the same: the disclosure, accordion
   item, nav menu item, reasoning and tool call follow it. Events that fire after a render because
   the layout or data changed (`focsd-range-change` from the virtual list, `focsd-snap-change` from
   the bottom sheet, `focsd-error` from the QR code) fall under rule 6.
8. **Composed is never used for `focsd-*` events.** `packages/components/test/events.test.mjs`
   scans every dispatch in the sources and fails on `composed: true` (open-wc: composed events
   pollute the whole page).

## Typed payloads

- Each `detail` has a named type, exported from the package entry: `MenuSelectDetail`,
  `TableSortDetail`, `SortChangeDetail` and so on.
- Write the type in the `@fires` tag: `@fires {CustomEvent<MenuSelectDetail>} focsd-select - ...`.
  A `@typedef` for the detail sits next to the element, and the package entry re-exports it.
- In a mixin, put `/** @type {CustomEvent<Detail>} */` above the `dispatchEvent` call: the manifest
  reads the type from there.
- The typings map each `focsd-*` event in `HTMLElementEventMap`, so
  `menu.addEventListener('focsd-select', (e) => e.detail.value)` type-checks. The JSX, Vue and
  Svelte typings and the React wrappers (`onFocsdSelect`) use the same detail types.
- A private signal between elements (the tree item's `focsd-tree-item-change`) is marked
  `/** @internal */` at its `dispatchEvent` call, so it stays out of the manifest, the typings and
  the React wrappers.

## Events added in wave 14

New elements and upgrades follow the rule from the start, so none of these was renamed.

| Element                                    | Event               | `detail`                                                       |
| ------------------------------------------ | ------------------- | -------------------------------------------------------------- |
| `focsd-editable`                           | `focsd-cancel`      | none (plain `Event`); the previous value stays                 |
| `focsd-split-button`                       | `focsd-select`      | `MenuSelectDetail` `{ value, item }`                           |
| `focsd-tour`                               | `focsd-step-change` | `TourStepChangeDetail` `{ step }`                              |
| `focsd-toggletip`                          | `focsd-open`        | none (plain `Event`)                                           |
| `focsd-qr-code`                            | `focsd-error`       | `QrCodeErrorDetail` `{ reason: 'too-long' }`                   |
| `focsd-copy-button`                        | `focsd-copy`        | `CopyDetail` `{ text }`                                        |
| `focsd-copy-button`                        | `focsd-error`       | none (plain `Event`)                                           |
| `focsd-splitter` (with `focsd-splitter-pane`) | `focsd-resize`   | `SplitterResizeDetail` `{ sizes }`, one percentage per pane    |
| `focsd-list[sortable]`                     | `focsd-reorder`     | `ListReorderDetail` `{ from, to, item }` (cancelable)          |
| `focsd-tag-input[sortable]`                | `focsd-reorder`     | `TagInputReorderDetail` `{ from, to, value }` (cancelable)     |

- `focsd-resize` fires on every change while the person resizes, collapses or restores a pane, as
  `input` does. The two-slot splitter without panes keeps firing `change` and no `focsd-resize`.
- `focsd-reorder` fires before the move is kept. Cancel it to put the item or tag back. When it is
  not canceled, the list moves the item's node itself, and the tag input sets `values` and fires
  `input` and `change`.

## Events added in wave 21

| Element                     | Event                  | `detail`                                                                |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `focsd-lightbox`            | `focsd-index-change`   | `LightboxIndexChangeDetail` `{ index }`, each time the viewer shows another image |
| `focsd-image-compare`       | `focsd-position-change` | `ImageComparePositionChangeDetail` `{ position }`, 0 to 100, once at the end of a drag and on each key press |
| `focsd-notification-center` | `focsd-read`           | `NotificationReadDetail` `{ ids }`, the notifications the person has read |
| `focsd-notification-center` | `focsd-dismiss`        | `NotificationDismissDetail` `{ id }`, the notification the person removed |

- The segmented control, signature pad and bottom navigation add no events of their own. The
  segmented control and signature pad are form controls and fire `input` and `change` like the
  other fields. A bottom navigation item is a link.
- `focsd-lightbox` also re-dispatches the dialog's `close` event on the host.
- The notification center never keeps the data: the app listens for `focsd-read` and
  `focsd-dismiss`, updates its list and sets `notifications` again.

## Renamed events (quality batch B9)

Nothing was published under the old names, so there are no aliases.

| Element                                           | Old name           | New name                 | `detail`                                      |
| ------------------------------------------------- | ------------------ | ------------------------ | --------------------------------------------- |
| `focsd-table`                                     | `sort`             | `focsd-sort`             | `TableSortDetail` `{ key, direction }`        |
| `focsd-menu`, `focsd-context-menu`, menubar items | `select`           | `focsd-select`           | `MenuSelectDetail` `{ value, item }`          |
| `focsd-command`                                   | `select`           | `focsd-select`           | `CommandSelectDetail` `{ value }`             |
| `focsd-tag`                                       | `remove`           | `focsd-remove`           | none (plain `Event`)                          |
| `focsd-floating-panel`                            | `open`             | `focsd-open`             | none (plain `Event`)                          |
| `focsd-floating-panel`                            | `move`             | `focsd-move`             | `FloatingPanelMoveDetail` `{ x, y }`          |
| `focsd-hover-card`                                | `open`             | `focsd-open`             | none (plain `Event`)                          |
| `focsd-button` (`commandfor` target)              | `command`          | `focsd-command`          | none (`CommandEvent` shape: `command`, `source`) |
| `focsd-pagination`                                | `change` + detail  | `focsd-page-change`      | `PageChangeDetail` `{ page }`                 |
| `focsd-data-grid`                                 | `sort-change`      | `focsd-sort-change`      | `SortChangeDetail` `{ sortModel }`            |
| `focsd-data-grid`                                 | `filter-change`    | `focsd-filter-change`    | `FilterChangeDetail` `{ filterModel }`        |
| `focsd-data-grid`                                 | `search-change`    | `focsd-search-change`    | `SearchChangeDetail` `{ quickSearch }`        |
| `focsd-data-grid`                                 | `column-change`    | `focsd-column-change`    | `ColumnChangeDetail` `{ columnState }`        |
| `focsd-data-grid`                                 | `group-change`     | `focsd-group-change`     | `GroupChangeDetail` `{ groupBy }`             |
| `focsd-data-grid`                                 | `selection-change` | `focsd-selection-change` | `SelectionChangeDetail` `{ ids }`             |
| `focsd-data-grid`                                 | `page-change`      | `focsd-page-change`      | `PageChangeDetail` `{ page }`                 |
| `focsd-data-grid`                                 | `cell-edit`        | `focsd-cell-edit`        | `CellEditDetail` (cancelable)                 |
| `focsd-data-grid`                                 | `state-change`     | `focsd-state-change`     | `StateChangeDetail` `{ state }`               |
| `focsd-data-grid`                                 | `row-activate`     | `focsd-row-activate`     | `RowActivateDetail` `{ id, row }`             |
| `focsd-chart`                                     | `point-focus`      | `focsd-point-focus`      | `PointFocusDetail` `{ series, category, value }` |

The events that already had a `focsd-` name now have typed details too: `focsd-snap-change`
(`SnapChangeDetail`), `focsd-range-change` (`RangeChangeDetail`) and `focsd-country-change`
(`CountryChangeDetail`).

In React, a renamed event's prop follows the name: `onSelect` is now `onFocsdSelect`, `onSort` is
`onFocsdSort`, and so on.
