/**
 * Column options menu (APG menu): a popover of menuitems anchored to the column's menu button.
 * Arrow keys move, Enter/Space activate, Escape/Tab close and return focus to the header cell.
 */
import { html, nothing } from 'lit';
import { popupAt } from './position.js';

/**
 * @typedef {import('../mixins/host.js').Grid} Grid
 * @typedef {import('../mixins/host.js').MenuItem} MenuItem
 * @typedef {import('../mixins/host.js').MenuAction} MenuAction
 */

/**
 * Menu entries for a column, given the grid's current state.
 * @param {Grid} g
 * @param {import('../engine/model.js').Column} column
 * @returns {MenuItem[]}
 */
function menuItems(g, column) {
  const sort = g.sortFor(column.id);
  const pinned = g._colState.pinned[column.id];
  const visible = g.layout.keys.filter((k) => k !== 'select').length;
  /** @type {MenuItem[]} */
  const items = [];

  if (column.sortable) {
    items.push(
      { id: 'sort-asc', label: g.localize.term('sortAscending'), run: () => g.setSortDirection(column.id, 'asc') },
      { id: 'sort-desc', label: g.localize.term('sortDescending'), run: () => g.setSortDirection(column.id, 'desc') },
    );

    if (sort) items.push({ id: 'sort-clear', label: g.localize.term('clearSort'), run: () => g.setSortDirection(column.id, null) });
    items.push({ separator: true });
  }

  for (const extra of g.extraMenuItems?.(column) ?? []) items.push(extra);

  if (pinned !== 'start') items.push({ id: 'pin-start', label: g.localize.term('pinToStart'), run: () => g.pinColumn(column.id, 'start') });

  if (pinned !== 'end') items.push({ id: 'pin-end', label: g.localize.term('pinToEnd'), run: () => g.pinColumn(column.id, 'end') });

  if (pinned) items.push({ id: 'unpin', label: g.localize.term('unpin'), run: () => g.pinColumn(column.id, null) });

  if (column.resizable) {
    items.push(
      { separator: true },
      {
        id: 'widen',
        label: g.localize.term('widenColumn'),
        run: () => g.resizeColumn(column.id, (g._colState.widths[column.id] ?? column.width) + 16, { commit: true }),
      },
      {
        id: 'narrow',
        label: g.localize.term('narrowColumn'),
        run: () => g.resizeColumn(column.id, (g._colState.widths[column.id] ?? column.width) - 16, { commit: true }),
      },
      { id: 'autosize', label: g.localize.term('autosizeColumn'), run: () => g.autosizeColumn(column.id) },
    );
  }

  items.push(
    { separator: true },
    { id: 'hide', label: g.localize.term('hideColumn'), disabled: visible <= 1, run: () => g.hideColumn(column.id) },
  );

  return items;
}

/**
 * Render the open menu (or nothing).
 * @param {Grid} g
 */
export function renderColumnMenu(g) {
  if (!g._menu) return nothing;
  const column = g.columnById(g._menu.colId);

  if (!column) return nothing;
  const items = menuItems(g, column);
  const actionable = /** @type {MenuAction[]} */ (items.filter((i) => !i.separator));

  return html`<div
    part="column-menu"
    role="menu"
    aria-label=${g.localize.term('columnOptions', column.header)}
    popover="auto"
    style=${popupAt(g._menu)}
    @keydown=${(/** @type {KeyboardEvent} */ e) => onMenuKey(g, e, actionable)}
    @toggle=${(/** @type {ToggleEvent} */ e) => {
      if (e.newState === 'closed') g.closeMenu({ restoreFocus: true });
    }}
  >
    ${items.map((entry) => {
      if (entry.separator) return html`<div role="separator" part="menu-separator"></div>`;
      const item = /** @type {MenuAction} */ (entry);

      return html`<button
        part="menu-item"
        role="menuitem"
        type="button"
        tabindex="-1"
        data-item=${item.id}
        aria-disabled=${item.disabled ? 'true' : nothing}
        @click=${() => activate(g, item)}
      >
        ${item.label}
      </button>`;
    })}
  </div>`;
}

/**
 * @param {Grid} g
 * @param {MenuAction} item
 */
function activate(g, item) {
  if (item.disabled) return;
  g.closeMenu({ restoreFocus: true });
  item.run();
}

/**
 * @param {Grid} g
 * @param {KeyboardEvent} event
 * @param {MenuAction[]} items
 */
function onMenuKey(g, event, items) {
  const menu = /** @type {HTMLElement} */ (event.currentTarget);
  const buttons = /** @type {HTMLElement[]} */ ([...menu.querySelectorAll('[role="menuitem"]')]);

  const item = /** @type {HTMLElement} */ (
    event.composedPath().find((n) => /** @type {Element} */ (n).getAttribute?.('role') === 'menuitem')
  );

  const index = buttons.indexOf(item);
  /** @param {number} i */
  const focusAt = (i) => buttons[(i + buttons.length) % buttons.length]?.focus();

  switch (event.key) {
    case 'ArrowDown':
      focusAt(index + 1);
      break;
    case 'ArrowUp':
      focusAt(index - 1);
      break;
    case 'Home':
      focusAt(0);
      break;
    case 'End':
      focusAt(buttons.length - 1);
      break;
    case 'Enter':
    case ' ':
      if (items[index]) activate(g, items[index]);
      break;
    case 'Tab':
      g.closeMenu({ restoreFocus: true });
      break;
    default:
      return;
  }

  event.preventDefault();
  event.stopPropagation();
}
