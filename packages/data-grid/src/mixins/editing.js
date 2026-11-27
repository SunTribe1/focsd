import { html, nothing } from 'lit';
import { cellValue } from '../engine/columns.js';
import { toISODay } from '../engine/types.js';
import { applyEdit, validateEdit } from '../engine/edit.js';

/**
 * @typedef {import('../events.js').CellEditDetail} CellEditDetail
 */

/**
 * @typedef {import('../engine/model.js').Column} Column
 * @typedef {import('./host.js').DisplayRow} DisplayRow
 * @typedef {import('./host.js').EditDraft} EditDraft
 *
 * @typedef {object} GridEditingApi
 * @property {(rowKey: string, colId: string) => boolean} isEditing
 * @property {(rowId: unknown, colId: string) => boolean} startEditing
 * @property {(options?: { cancel?: boolean }) => void} stopEditing
 * @property {(move?: 'down' | 'next' | 'previous' | null) => boolean} commitEdit
 */

/**
 * The column shown at a layout position (none for the selection column or past the end).
 * @param {import('./host.js').GridHost} grid
 * @param {number} col
 * @returns {Column | undefined}
 */
const columnAt = (grid, col) => {
  const id = grid.layout.keys[col];

  return id === undefined ? undefined : grid.columnById(id);
};

/**
 * Inline editing for focsd-data-grid. Enter or F2 edits the focused cell; typing a character starts
 * editing with it. Enter saves and moves down, Tab saves and moves sideways, Escape cancels.
 * Invalid input keeps the editor open with an error that is announced and described.
 *
 * Fires a cancelable `focsd-cell-edit` event before the change is applied to `rows`.
 *
 * @template {new (...args: any[]) => import('lit').LitElement & import('./host.js').GridHost} T
 * @param {T} Base
 * @returns {T & (new (...args: any[]) => GridEditingApi & import('./host.js').GridHost)}
 */
export const EditingMixin = (Base) =>
  class extends Base {
    /** @type {import('lit').PropertyDeclarations} */
    static properties = { _editing: { state: true } };

    /** @param {any[]} args */
    constructor(...args) {
      super(...args);
      /** @type {EditDraft | null} */
      this._editing = null;
    }

    /**
     * Whether a cell is being edited.
     * @param {string} rowKey
     * @param {string} colId
     * @returns {boolean}
     */
    isEditing(rowKey, colId) {
      // Row keys are strings, so a match implies a draft.
      return this._editing?.key === rowKey && /** @type {EditDraft} */ (this._editing).colId === colId;
    }

    /**
     * Edit the cell at a rendered position (keyboard path).
     * @param {number} pos
     * @param {number} col
     * @param {string} [initial] First character typed.
     */
    beginEdit(pos, col, initial) {
      const displayRow = this.navRows[pos - 1];
      const column = columnAt(this, col);

      if (displayRow?.type !== 'row' || !column?.editable) return false;
      const value = cellValue(displayRow.row, column);
      // Editor seed: dates as YYYY-MM-DD (ISO datetimes and Date objects too), enums as the option value itself.
      /** @type {unknown} */
      let text = initial;

      if (text === undefined) {
        if (value === null || value === undefined) text = '';
        else if (column.type === 'date') text = toISODay(value);
        else if (column.type === 'enum') text = value;
        else text = String(value);
      }

      this._editing = { key: this.keyOf(displayRow), colId: column.id, text, error: '' };
      this.updateComplete.then(() => {
        const editor = /** @type {HTMLInputElement | null} */ (this.renderRoot.querySelector('[part~="editor"]'));
        /** @type {HTMLElement} */ (editor)?.focus();
        // Text inputs are seeded with a string.
        const seed = /** @type {string} */ (text);

        if (editor?.setSelectionRange && editor.type === 'text') editor.setSelectionRange(seed.length, seed.length);
      });

      return true;
    }

    /**
     * Edit a cell by row id and column id, scrolling or paging to it first.
     * @param {unknown} rowId
     * @param {string} colId
     * @returns {boolean}
     */
    startEditing(rowId, colId) {
      const col = this.layout.keys.indexOf(colId);

      if (col < 0) return false;
      this.activate(this._active.pos, col, { focus: false });

      if (!this.scrollToRow(rowId)) return false;
      this.updateComplete.then(() => this.beginEdit(this._active.pos, col));

      return true;
    }

    /**
     * Ends editing: commits the edit, or discards it with `cancel`.
     * @param {{ cancel?: boolean }} [options]
     */
    stopEditing({ cancel = false } = {}) {
      if (!this._editing) return;

      if (cancel) {
        this._editing = null;
        this.focusActive();

        return;
      }

      this.commitEdit(null);
    }

    /**
     * Save the draft. `move` is 'down', 'next', 'previous' or null. Returns true when saved.
     * @param {'down' | 'next' | 'previous' | null} [move]
     * @returns {boolean}
     */
    commitEdit(move) {
      const editing = this._editing;

      if (!editing) return false;

      // The draft's key is always a data row's key (`r:<id>`).
      const displayRow = /** @type {Extract<DisplayRow, { type: 'row' }> | undefined} */ (
        this.navRows.find((r) => this.keyOf(r) === editing.key)
      );

      const column = this.columnById(editing.colId);

      if (!displayRow || !column) {
        this._editing = null;

        return false;
      }

      // Enum and boolean drafts hold the option value itself; validateEdit handles those too.
      const result = validateEdit(editing.text, column, displayRow.row, this.resolvedLocale);

      if ('error' in result) {
        // Engine errors carry a translation code; custom validate() messages are shown as given.
        const error = result.code ? this.localize.term(result.code, ...(result.args ?? [])) : result.error;
        this._editing = { ...editing, error };
        this._announce = error;
        this.updateComplete.then(() => /** @type {HTMLElement} */ (this.renderRoot.querySelector('[part~="editor"]'))?.focus());

        return false;
      }

      const id = this.getRowId(displayRow.row);
      const oldValue = cellValue(displayRow.row, column);

      /** @type {CellEditDetail} */
      const detail = { rowId: id, colId: column.id, oldValue, newValue: result.value, row: displayRow.row };
      const event = new CustomEvent('focsd-cell-edit', { bubbles: true, cancelable: true, detail });

      this._editing = null;

      if (this.dispatchEvent(event) && !Object.is(oldValue, result.value)) {
        this.rows = applyEdit(/** @type {import('./host.js').GridHost} */ (this).rows, id, this.getRowId, column, result.value);
        this._announce = this.localize.term('saved');
      }

      const { pos, col } = this._active;

      if (move === 'down') this.activate(Math.min(pos + 1, this.navRows.length), col);
      else if (move === 'next') {
        // Past the last column, continue on the next row (like a spreadsheet); stay on the last cell.
        const last = this.layout.keys.length - 1;

        if (col < last) this.activate(pos, col + 1);
        else if (pos < this.navRows.length) this.activate(pos + 1, 0);
        else this.focusActive();
      } else if (move === 'previous') {
        if (col > 0) this.activate(pos, col - 1);
        else if (pos > 1) this.activate(pos - 1, this.layout.keys.length - 1);
        else this.focusActive();
      } else this.focusActive();

      return true;
    }

    /**
     * For the grid's templates: handles keys in a cell editor (Enter commits, Escape cancels).
     * @param {KeyboardEvent} event
     */
    onEditorKey(event) {
      event.stopPropagation();

      if (event.key === 'Escape') {
        event.preventDefault();
        this.stopEditing({ cancel: true });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.commitEdit('down');
      } else if (event.key === 'Tab') {
        event.preventDefault();
        this.commitEdit(event.shiftKey ? 'previous' : 'next');
      }
    }

    /**
     * @param {KeyboardEvent} event
     * @param {DisplayRow | undefined} displayRow
     * @param {number} pos
     * @param {number} col
     * @returns {boolean}
     * @override
     */
    handleGridKey(event, displayRow, pos, col) {
      if (super.handleGridKey?.(event, displayRow, pos, col)) return true;

      if (displayRow?.type !== 'row') return false;
      const column = columnAt(this, col);

      if (!column?.editable) return false;

      if (event.key === 'Enter' || event.key === 'F2') return this.beginEdit(pos, col);
      const printable = event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey;

      if (printable && ['text', 'number', 'date'].includes(column.type)) return this.beginEdit(pos, col, event.key);

      return false;
    }

    /**
     * @param {Column} column
     * @param {import('./host.js').GridRow} row
     * @param {number} [pos]
     * @param {number} [col]
     * @returns {import('lit').TemplateResult}
     * @override
     */
    renderCell(column, row, pos, col) {
      // The grid always passes the position; undefined compares false and renders the plain cell.
      const at = /** @type {number} */ (pos);
      const displayRow = at > 0 ? this.navRows[at - 1] : undefined;
      const key = displayRow ? this.keyOf(displayRow) : null;

      if (!key || !this.isEditing(key, column.id)) return super.renderCell(column, row, pos, col);

      return this.renderEditor(column);
    }

    /**
     * For the grid's templates: renders the editor of a column.
     * @param {Column} column
     */
    renderEditor(column) {
      // Only called for the cell being edited.
      const editing = /** @type {EditDraft} */ (this._editing);
      const { text, error } = editing;
      const errorId = `${this.idPrefix}-edit-error`;

      const common = {
        label: this.localize.term('editCell', column.header),
        invalid: error ? 'true' : nothing,
        describedBy: error ? errorId : nothing,
      };

      /** @param {Event & { target: HTMLInputElement }} e */
      const onInput = (e) => {
        this._editing = { .../** @type {EditDraft} */ (this._editing), text: e.target.value, error: '' };
      };

      // Option values may be numbers or other non-strings: map the chosen index back to the real value.
      /** @param {{ value: unknown, label: string }[]} options */
      const select = (options) => html`<select
        part="editor"
        aria-label=${common.label}
        aria-invalid=${common.invalid}
        aria-describedby=${common.describedBy}
        @change=${(/** @type {Event & { target: HTMLSelectElement }} */ e) => {
          this._editing = { .../** @type {EditDraft} */ (this._editing), text: options[e.target.selectedIndex]?.value ?? '', error: '' };
        }}
        @keydown=${(/** @type {KeyboardEvent} */ e) => this.onEditorKey(e)}
      >
        ${options.map((o, i) => html`<option value=${i} ?selected=${Object.is(o.value, text)}>${o.label}</option>`)}
      </select>`;

      let editor;

      if (column.type === 'enum')
        editor = select([
          { value: '', label: '' },
          .../** @type {import('../engine/model.js').ColumnOption[]} */ (column.options).map((o) => ({ value: o.value, label: o.label })),
        ]);
      else if (column.type === 'boolean') {
        const [no, yes] = column.labels ?? [this.localize.term('no'), this.localize.term('yes')];
        editor = select([
          { value: '', label: '' },
          { value: 'true', label: yes },
          { value: 'false', label: no },
        ]);
      } else {
        editor = html`<input
          part="editor"
          type=${column.type === 'date' ? 'date' : 'text'}
          inputmode=${column.type === 'number' ? 'decimal' : nothing}
          aria-label=${common.label}
          aria-invalid=${common.invalid}
          aria-describedby=${common.describedBy}
          .value=${text}
          @input=${onInput}
          @keydown=${(/** @type {KeyboardEvent} */ e) => this.onEditorKey(e)}
        />`;
      }

      return html`${editor}${error ? html`<span part="edit-error" id=${errorId}>${error}</span>` : nothing}`;
    }
  };
