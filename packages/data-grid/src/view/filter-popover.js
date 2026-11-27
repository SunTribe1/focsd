/**
 * Filter dialog for one column: a non-modal popover with a condition select and value input(s)
 * that suit the column type, or a searchable checklist for enum columns.
 */
import { html, nothing } from 'lit';
import { operatorsFor } from '../engine/filter.js';
import { fold, getType } from '../engine/types.js';
import { popupAt } from './position.js';

/**
 * @typedef {import('../engine/model.js').Column} Column
 * @typedef {import('../engine/model.js').Filter} Filter
 * @typedef {import('../mixins/host.js').Grid} Grid
 * @typedef {import('../mixins/host.js').FilterDraft} FilterDraft
 * @typedef {import('../mixins/host.js').EnumFilterDraft} EnumFilterDraft
 * @typedef {import('../mixins/host.js').ValueFilterDraft} ValueFilterDraft
 *
 * @typedef {object} DraftResult A filter model entry (null clears the filter), or a parse error for one of the inputs.
 * @property {Filter | null} [filter]
 * @property {string} [error]
 * @property {string} [code]
 * @property {unknown[]} [args]
 * @property {'value' | 'value2'} [field]
 *
 * @typedef {{ value: unknown, error?: undefined, code?: undefined, args?: undefined }
 *   | { value?: undefined, error: string, code?: string, args?: unknown[] }} ParsedValue
 */

/**
 * Initial draft for a column, from its current filter or the first operator.
 * @param {Column} column
 * @param {Filter | undefined} current
 * @param {string | undefined} locale undefined: the browser's locale.
 * @returns {FilterDraft}
 */
export function filterDraft(column, current, locale) {
  const ops = operatorsFor(column);

  if (column.type === 'enum') {
    const values = /** @type {unknown[] | undefined} */ (current?.value);

    return { colId: column.id, op: 'in', list: new Set(values), search: '', error: '' };
  }

  const op = current?.op ?? ops[0]?.id ?? '';

  // Show saved numbers in the locale's own format (without grouping), so they parse back unchanged.
  /** @param {unknown} v */
  const asText = (v) => {
    if (v == null) return '';

    if (column.type === 'number' && typeof v === 'number')
      return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(v);

    return String(v);
  };

  return { colId: column.id, op, value: asText(current?.value), value2: asText(current?.value2), error: '' };
}

/**
 * Validate a draft into a filter model entry, or return `{ error }`.
 * @param {Column} column
 * @param {FilterDraft} draft
 * @param {string | undefined} locale undefined: the browser's locale.
 * @returns {DraftResult}
 */
export function draftToFilter(column, draft, locale) {
  if (column.type === 'enum') {
    const { list } = /** @type {EnumFilterDraft} */ (draft);

    return { filter: list.size ? { op: 'in', value: [...list] } : null };
  }

  const { value, value2 } = /** @type {ValueFilterDraft} */ (draft);
  // The draft's operator always comes from this column's operators.
  const op = /** @type {ReturnType<typeof operatorsFor>[number]} */ (operatorsFor(column).find((o) => o.id === draft.op));

  if (op.arity === 0) return { filter: { op: op.id } };

  /**
   * @param {string} text
   * @returns {ParsedValue}
   */
  const parse = (text) => {
    if (String(text).trim() === '') return { error: 'Enter a value.', code: 'enterValue' };

    if (column.type === 'text') return { value: text };
    const parsed = getType(column.type).parse(text, column, locale);

    return 'error' in parsed ? parsed : parsed.value === null ? { error: 'Enter a value.', code: 'enterValue' } : parsed;
  };

  const first = parse(value);

  if (first.error) return { error: first.error, code: first.code, args: first.args, field: 'value' };

  if (op.arity !== 2) return { filter: { op: op.id, value: first.value } };
  const second = parse(value2);

  if (second.error) return { error: second.error, code: second.code, args: second.args, field: 'value2' };

  return { filter: { op: op.id, value: first.value, value2: second.value } };
}

/**
 * @param {Grid} g
 * @param {Column} column
 * @param {ValueFilterDraft} draft
 * @param {'value' | 'value2'} key
 * @param {string} label
 */
function valueInput(g, column, draft, key, label) {
  const id = `${g.idPrefix}-filter-${key}`;
  const invalid = draft.error && (draft.errorField ?? 'value') === key;
  const date = column.type === 'date';

  return html`<label part="filter-label" for=${id}>${label}</label>
    <input
      part="filter-input"
      id=${id}
      type=${date ? 'date' : 'text'}
      inputmode=${column.type === 'number' ? 'decimal' : nothing}
      autocomplete="off"
      .value=${draft[key]}
      aria-invalid=${invalid ? 'true' : nothing}
      aria-describedby=${invalid ? `${g.idPrefix}-filter-error` : nothing}
      @input=${(/** @type {Event & { target: HTMLInputElement }} */ e) => g.updateFilterDraft({ [key]: e.target.value, error: '' })}
    />`;
}

/**
 * @param {Grid} g
 * @param {Column} column
 * @param {EnumFilterDraft} draft
 */
function enumChecklist(g, column, draft) {
  const q = fold(draft.search);
  const options = (column.options ?? []).filter((o) => !q || fold(o.label).includes(q));
  const searchId = `${g.idPrefix}-filter-search`;

  return html`<label part="filter-label" for=${searchId}>${g.localize.term('searchValues')}</label>
    <input
      part="filter-input"
      id=${searchId}
      type="search"
      autocomplete="off"
      .value=${draft.search}
      @input=${(/** @type {Event & { target: HTMLInputElement }} */ e) => g.updateFilterDraft({ search: e.target.value })}
    />
    <fieldset part="filter-options">
      <legend class="focsd-visually-hidden">${g.localize.term('values')}</legend>
      ${options.map(
        (o) => html`<label part="filter-option">
          <input
            type="checkbox"
            .checked=${draft.list.has(o.value)}
            @change=${(/** @type {Event & { target: HTMLInputElement }} */ e) => {
              const list = new Set(draft.list);

              if (e.target.checked) list.add(o.value);
              else list.delete(o.value);
              g.updateFilterDraft({ list });
            }}
          />
          ${o.label}
        </label>`,
      )}
      ${options.length ? nothing : html`<p part="filter-empty">${g.localize.term('noMatchingValues')}</p>`}
    </fieldset>`;
}

/** @param {Grid} g */
export function renderFilterPopover(g) {
  const draft = g._filterDraft;

  if (!draft) return nothing;
  const column = /** @type {Column} */ (g.columnById(draft.colId));
  const ops = operatorsFor(column);
  // Enum drafts use the checklist and never read `op`.
  const op = /** @type {(typeof ops)[number]} */ (ops.find((o) => o.id === draft.op));
  const conditionId = `${g.idPrefix}-filter-condition`;

  return html`<div
    part="filter-popover"
    role="dialog"
    aria-label=${g.localize.term('filterColumn', column.header)}
    popover="auto"
    style=${popupAt(draft)}
    @toggle=${(/** @type {ToggleEvent} */ e) => {
      if (e.newState === 'closed') g.closeFilter({ restoreFocus: true });
    }}
  >
    <form
      part="filter-form"
      novalidate
      @submit=${(/** @type {SubmitEvent} */ e) => {
        e.preventDefault();
        g.applyFilterDraft();
      }}
      @keydown=${(/** @type {KeyboardEvent & { target: Element }} */ e) => {
        if (e.key === 'Enter' && !e.target.matches('button, select')) {
          e.preventDefault();
          g.applyFilterDraft();
        }
      }}
    >
      ${
        column.type === 'enum'
          ? enumChecklist(g, column, /** @type {EnumFilterDraft} */ (draft))
          : html`<label part="filter-label" for=${conditionId}>${g.localize.term('condition')}</label>
            <select part="filter-input" id=${conditionId} @change=${(/** @type {Event & { target: HTMLSelectElement }} */ e) => g.updateFilterDraft({ op: e.target.value, error: '' })}>
              ${ops.map((o) => html`<option value=${o.id} ?selected=${o.id === draft.op}>${g.localize.termOr(`op.${o.id}`, o.label)}</option>`)}
            </select>
            ${op.arity === 1 ? valueInput(g, column, /** @type {ValueFilterDraft} */ (draft), 'value', g.localize.term('value')) : nothing}
            ${op.arity === 2 ? html`${valueInput(g, column, /** @type {ValueFilterDraft} */ (draft), 'value', g.localize.term('from'))}${valueInput(g, column, /** @type {ValueFilterDraft} */ (draft), 'value2', g.localize.term('to'))}` : nothing}`
      }
      <p part="filter-error" id="${g.idPrefix}-filter-error" role="alert">${draft.error}</p>
      <div part="filter-actions">
        <button part="filter-button" type="button" @click=${() => g.clearFilter(column.id)}>${g.localize.term('clear')}</button>
        <button part="filter-button primary" type="submit">${g.localize.term('apply')}</button>
      </div>
    </form>
  </div>`;
}
