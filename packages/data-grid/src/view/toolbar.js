/**
 * Toolbar (quick search, Columns button), active-filter chips, and the column panel.
 */
import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { iconSvg } from '@focsd/primitives';
import { popupAt } from './position.js';

/** @typedef {import('../mixins/host.js').Grid} Grid */

/** @param {Grid} g */
export function renderToolbar(g) {
  if (!g.toolbar && !g.quickSearch) return nothing;
  const searchId = `${g.idPrefix}-search`;

  return html`<div part="toolbar">
    ${
      g.quickSearch
        ? html`<div part="search">
          <label class="focsd-visually-hidden" for=${searchId}>${g.localize.term('searchGrid', g.label)}</label>
          <span part="search-icon" aria-hidden="true">${iconSvg('search')}</span>
          <input
            part="search-input"
            id=${searchId}
            type="search"
            placeholder=${g.localize.term('searchPlaceholder')}
            autocomplete="off"
            .value=${g._search}
            @input=${(/** @type {Event & { target: HTMLInputElement }} */ e) => g.setSearch(e.target.value)}
          />
        </div>`
        : nothing
    }
    ${g.toolbar ? html`<div part="toolbar-actions">${g.renderToolbarActions()}</div>` : nothing}
  </div>`;
}

/** @param {Grid} g */
export function renderChips(g) {
  const entries = Object.entries(g._filters);

  if (!entries.length) return nothing;

  return html`<div part="chips">
    <ul part="chip-list" aria-label=${g.localize.term('activeFilters')}>
      ${entries.map(([colId, filter]) => {
        const column = g.columnById(colId);

        if (!column) return nothing;
        const text = g.describeFilter(filter, column);

        return html`<li part="chip">
          <button part="chip-button" type="button" aria-label=${g.localize.term('removeFilter', text)} @click=${() => g.clearFilter(colId)}>
            <span>${text}</span>${iconSvg('x')}
          </button>
        </li>`;
      })}
    </ul>
    <button part="toolbar-button quiet" type="button" @click=${() => g.clearAllFilters()}>${g.localize.term('gridClearAllFilters')}</button>
  </div>`;
}

/** @param {Grid} g */
export function renderColumnPanel(g) {
  if (!g._panel) return nothing;
  const { order, hidden } = g._colState;
  const visibleCount = order.filter((id) => !hidden[id]).length;

  return html`<div
    part="column-panel"
    role="dialog"
    aria-label=${g.localize.term('columnsPanel')}
    popover="auto"
    style=${popupAt(g._panel)}
    @toggle=${(/** @type {ToggleEvent} */ e) => {
      if (e.newState === 'closed') g.closePanel({ restoreFocus: true });
    }}
  >
    <ul part="panel-list">
      ${repeat(
        order,
        (id) => id,
        (id, index) => {
          const column = /** @type {import('../engine/model.js').Column} */ (g.columnById(id));
          const checkId = `${g.idPrefix}-show-${id}`;

          return html`<li part="panel-item">
            <input
              type="checkbox"
              id=${checkId}
              .checked=${!hidden[id]}
              ?disabled=${!hidden[id] && visibleCount <= 1}
              @change=${(/** @type {Event & { target: HTMLInputElement }} */ e) => (e.target.checked ? g.showColumn(id) : g.hideColumn(id))}
            />
            <label for=${checkId}>${column.header}</label>
            <button
              part="panel-move"
              type="button"
              data-move="${id}:up"
              aria-label=${g.localize.term('moveColumnUp', column.header)}
              ?disabled=${index === 0}
              @click=${() => g.moveInPanel(id, -1)}
            >
              ${iconSvg('arrow-up')}
            </button>
            <button
              part="panel-move"
              type="button"
              data-move="${id}:down"
              aria-label=${g.localize.term('moveColumnDown', column.header)}
              ?disabled=${index === order.length - 1}
              @click=${() => g.moveInPanel(id, 1)}
            >
              ${iconSvg('arrow-down')}
            </button>
          </li>`;
        },
      )}
    </ul>
    <div part="panel-actions">
      <button part="toolbar-button" type="button" @click=${() => g.showAllColumns()}>${g.localize.term('gridShowAll')}</button>
      <button part="toolbar-button" type="button" @click=${() => g.resetColumns()}>${g.localize.term('gridReset')}</button>
    </div>
  </div>`;
}
