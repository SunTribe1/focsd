/**
 * Data grid model types: column definitions, view state and edit results. Shared by the engine,
 * the grid and its mixins, and published in the package's typings.
 *
 * @typedef {'text' | 'number' | 'date' | 'boolean' | 'enum' | (string & {})} ColumnType
 *
 * @typedef {import('@focsd/tokens').Density} GridDensity The row height, in the tokens' density
 *   vocabulary: `compact`, or `comfortable` (`default` is the same size).
 *
 * @typedef {object} ColumnOption
 * @property {unknown} value
 * @property {string} label
 * @property {import('@focsd/primitives').Tone} [tone] Shows the value as a status chip in this tone.
 * @property {string} [color] Shows the value as a chip in a category color (`blue`, `violet`, `pink`, `red`, `orange`, `amber`, `green`, `teal`); colorful presets such as Prismatic show it.
 * @property {string} [icon] An icon before the chip's text, from the default icon library.
 */

/**
 * @template [T=any] The row type: `ColumnDef<Person>` types the row in `valueGetter`, `valueSetter`,
 *   `validate` and `render`. Without it any row is accepted.
 * @typedef {object} ColumnDef A column as you pass it in `columns` (every field but `id` optional).
 * @property {string} id Unique column id.
 * @property {string} [field] Row property to show (defaults to `id`).
 * @property {string} [header] Header text (defaults to `id`).
 * @property {ColumnType} [type]
 * @property {number} [width]
 * @property {number} [minWidth]
 * @property {number} [maxWidth]
 * @property {'start' | 'end' | null} [pinned]
 * @property {boolean} [hidden]
 * @property {boolean} [sortable]
 * @property {boolean} [filterable]
 * @property {boolean} [resizable]
 * @property {boolean} [editable]
 * @property {boolean} [groupable]
 * @property {boolean} [searchable]
 * @property {boolean} [required]
 * @property {number} [min] Smallest allowed value (number columns).
 * @property {number} [max] Largest allowed value (number columns).
 * @property {ColumnOption[]} [options] Choices (enum columns).
 * @property {(row: T) => unknown} [valueGetter] Computed cell value (computed columns).
 * @property {(row: T, value: unknown) => T} [valueSetter] Returns the edited row (computed columns).
 * @property {Intl.NumberFormatOptions | Intl.DateTimeFormatOptions} [formatOptions] Passed to Intl (number and date columns).
 * @property {(value: unknown, row: T) => string | null | undefined} [validate] Returns an error message.
 * @property {(value: unknown, row: T) => unknown} [render] Cell content (text or a Lit template) instead of the formatted value.
 * @property {'avatar'} [display] `avatar` shows each value as a name with an avatar.
 * @property {[string, string]} [labels] Words for false and true (boolean columns), e.g. ['No', 'Yes'].
 * @property {'sum' | 'avg' | 'min' | 'max' | 'count' | ((values: unknown[], column: Column) => unknown)} [aggregate]
 *   Summary shown on group rows.
 */

/**
 * @typedef {Required<Pick<ColumnDef, 'id' | 'field' | 'header' | 'type' | 'width' | 'minWidth' | 'maxWidth' | 'hidden' | 'sortable' | 'filterable' | 'resizable' | 'editable' | 'groupable' | 'searchable' | 'required'>> & ColumnDef} Column
 *   A column after normalizeColumns: every default filled in.
 *
 * @typedef {object} ColumnState Column order, visibility, widths and pinning.
 * @property {string[]} order
 * @property {Record<string, boolean>} hidden
 * @property {Record<string, number>} widths
 * @property {Record<string, 'start' | 'end' | null>} pinned
 *
 * @typedef {object} SortKey
 * @property {string} colId
 * @property {'asc' | 'desc'} direction
 *
 * @typedef {object} Filter
 * @property {string} op
 * @property {unknown} [value]
 * @property {unknown} [value2]
 *
 * @typedef {object} GridState The view as JSON-safe state (getState / setState / focsd-state-change).
 * @property {ColumnState} columnState
 * @property {SortKey[]} sortModel
 * @property {Record<string, Filter>} filterModel
 * @property {string} quickSearch
 * @property {string[]} groupBy
 * @property {'all' | string[]} expanded
 * @property {number} page
 * @property {number | null} pageSize
 * @property {GridDensity} density
 *
 * @typedef {{ value: unknown } | { error: string, code?: string, args?: unknown[] }} EditResult
 *
 * @typedef {Record<string, unknown>} Row A data row.
 *
 * @typedef {object} FilterOperator
 * @property {string} label
 * @property {0 | 1 | 2 | 'list'} arity Number of operands ('list' takes an array).
 * @property {string} [symbol] Short form for filter chips.
 * @property {(value: unknown, operand?: unknown, operand2?: unknown, column?: Column) => boolean} test
 *
 * @typedef {object} ColumnTypeDef A column type (see registerType).
 * @property {string} editor
 * @property {(a: unknown, b: unknown, column?: Partial<Column>) => number} compare Never sees empty values.
 * @property {(value: unknown, column?: Partial<Column>, locale?: string) => string} format
 * @property {(input: unknown, column?: Partial<Column>, locale?: string) => EditResult} parse
 * @property {Record<string, FilterOperator>} operators
 *
 * @typedef {object} GroupNode A node of the group tree (groupRows).
 * @property {'group'} type
 * @property {string} key
 * @property {string} colId
 * @property {unknown} value
 * @property {number} level
 * @property {number} count
 * @property {Record<string, unknown>} aggregates
 * @property {GroupNode[]} children
 * @property {Row[]} rows
 *
 * @typedef {Omit<GroupNode, 'children' | 'rows'> & { expanded: boolean }} GroupDisplayRow
 * @typedef {{ type: 'row', row: Row, level: number }} DataDisplayRow
 * @typedef {GroupDisplayRow | DataDisplayRow} DisplayRow A row as displayed: a group header or a data row.
 * @typedef {DisplayRow & { index: number }} IndexedDisplayRow
 *
 * @typedef {object} PipelineInput
 * @property {Row[]} rows
 * @property {Column[]} columns
 * @property {ColumnState} columnState
 * @property {SortKey[]} [sortModel]
 * @property {Record<string, Filter>} [filterModel]
 * @property {string} [quickSearch]
 * @property {string[]} [groupBy]
 * @property {'all' | Set<string>} [expanded]
 * @property {number | null} [page]
 * @property {number | null} [pageSize]
 * @property {string} [locale]
 * @property {boolean} [external] Rows are already filtered and sorted (server mode).
 *
 * @typedef {object} PipelineResult
 * @property {number} total
 * @property {number} matched
 * @property {Row[]} sortedRows
 * @property {IndexedDisplayRow[]} displayRows
 * @property {IndexedDisplayRow[]} pageRows
 * @property {number} page
 * @property {number} pageCount
 * @property {number} pageSize
 */

export {};
