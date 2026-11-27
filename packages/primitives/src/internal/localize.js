/**
 * Localization. Every string a component shows or announces comes from a translation table.
 *
 * - `registerTranslation(...tables)`: `{ $code: 'de', $name: 'Deutsch', key: string | (...args) => string }`.
 *   Tables may be partial; missing keys fall back to the base language (`de` for `de-CH`), then English.
 * - The language is the nearest `lang` attribute (crossing shadow roots), else `<html lang>`, else `en`.
 * - Components re-render when their resolved `lang`/`dir` changes (an attribute on them, an ancestor or
 *   `<html>`) or a table is registered. Elements that format with the default locale also re-render on `setLocale()`.
 */

import { nearest, onLocaleChange, resolveLocale } from './locale.js';

/**
 * A translated string built from arguments. Declared as a method type so a table's functions may
 * take specific parameter types (`(n: number) => string`).
 * @typedef {{ term(...args: unknown[]): string }['term']} TermFunction
 */

/**
 * A translation table: `$code` plus any terms (strings or functions).
 * @typedef {{ [key: string]: string | TermFunction | undefined, $code: string, $name?: string, $dir?: string }} Translation
 */

/** @typedef {import('lit').ReactiveControllerHost & HTMLElement} LocalizeHost */

/** English, the built-in table and the template for translators. */
export const en = {
  $code: 'en',
  $name: 'English',
  $dir: 'ltr',

  // Shared
  close: 'Close',
  saturationBrightness: 'Saturation and brightness',
  /**
   * @param {number} s
   * @param {number} v
   */
  saturationBrightnessValue: (s, v) => `Saturation ${s}%, brightness ${v}%`,
  hue: 'Hue',
  opacity: 'Opacity',
  swatches: 'Swatches',
  pickFromScreen: 'Pick color from screen',
  enterColor: 'Enter a color such as #3366ff',
  /**
   * @param {number | string} ratio
   * @param {string} other
   */
  contrastWith: (ratio, other) => `Contrast ${ratio}:1 against ${other}`,
  /** @param {string} tag */
  alreadyAdded: (tag) => `${tag} is already added`,
  /** @param {string} tag */
  tagAdded: (tag) => `${tag} added`,
  /** @param {string} tag */
  tagRemoved: (tag) => `${tag} removed`,
  addTag: 'Add at least one item',
  country: 'Country',
  /** @param {string} country */
  countryChanged: (country) => `Country changed to ${country}`,
  /** @param {string} example */
  phoneExample: (example) => `For example ${example}`,
  enterPhone: 'Enter a phone number',
  /** @param {string} country */
  enterValidPhone: (country) => `Enter a valid ${country} phone number`,
  enterAmount: 'Enter an amount',
  /** @param {string} amount */
  amountMin: (amount) => `Enter ${amount} or more`,
  /** @param {string} amount */
  amountMax: (amount) => `Enter ${amount} or less`,
  resizeSheet: 'Resize sheet',
  /** @param {number} pct */
  sheetHeight: (pct) => `${pct}% of the screen`,
  /** @param {string} name */
  closeNamed: (name) => `Close ${name}`,
  /** @param {string} name */
  moveNamed: (name) => `Move ${name}`,
  moveHint: 'Use the arrow keys to move it. Hold Shift to move further.',
  /** @param {string} name */
  clearNamed: (name) => `Clear ${name}`,
  /** @param {string} name */
  filterNamed: (name) => `Filter ${name}`,
  selectAll: 'Select all',
  deselectAll: 'Deselect all',
  /** @param {number} n */
  maxSelected: (n) => `Maximum of ${n} selected.`,
  required: 'Required',
  invalidValue: 'Enter a valid value.',
  checkValue: 'Check this value.',
  // Read before a field message, naming its kind (the icon is hidden from assistive tech).
  messageError: 'Error',
  messageWarning: 'Warning',
  messageSuccess: 'Success',
  loading: 'Loading',
  remove: 'Remove',
  menu: 'Menu',
  opensInNewTab: '(opens in new tab)',

  // Validation
  selectOption: 'Select an option.',
  chooseOption: 'Choose an option.',
  checkToContinue: 'Check this box to continue.',
  chooseRating: 'Choose a rating.',
  chooseFile: 'Choose a file.',
  enterNumber: 'Enter a number.',
  enterValue: 'Enter a value.',
  /** @param {number | string} min */
  numberMin: (min) => `Enter ${min} or more.`,
  /** @param {number | string} max */
  numberMax: (max) => `Enter ${max} or less.`,
  enterCode: 'Enter the code.',
  /** @param {number} n */
  enterAllDigits: (n) => `Enter all ${n} digits.`,
  enterTime: 'Enter a time.',
  enterCompleteTime: 'Enter a complete time.',
  /** @param {number | string} min */
  timeMin: (min) => `Enter a time at or after ${min}.`,
  /** @param {number | string} max */
  timeMax: (max) => `Enter a time at or before ${max}.`,
  /**
   * @param {number | string} min
   * @param {number | string} max
   */
  timeBetween: (min, max) => `Enter a time from ${min} to ${max}.`,
  enterDate: 'Enter a date.',
  enterStartDate: 'Enter a start date.',
  enterEndDate: 'Enter an end date.',
  dateFormat: 'Enter a date as YYYY-MM-DD.',
  /** @param {string} date */
  dateMin: (date) => `Choose a date on or after ${date}.`,
  /** @param {string} date */
  dateMax: (date) => `Choose a date on or before ${date}.`,
  /**
   * @param {number} step
   * @param {string} [from]
   */
  dateStep: (step, from) => `Choose a date in steps of ${step} days${from ? ` from ${from}` : ''}.`,
  dateRangeOrder: 'The end date must be on or after the start date.',

  // Controls
  on: 'On',
  off: 'Off',
  clearSearch: 'Clear search',
  showPassword: 'Show password',
  /** @param {string} label */
  minimumOf: (label) => `Minimum ${label}`.trim(),
  /** @param {string} label */
  maximumOf: (label) => `Maximum ${label}`.trim(),
  /** @param {number} n */
  selectedCount: (n) => `${n} selected`,
  /**
   * @param {number} n
   * @param {number | string} max
   */
  characterCount: (n, max) => `${n} of ${max} characters`,
  /** @param {number} n */
  starCount: (n) => (n === 1 ? '1 star' : `${n} stars`),
  /**
   * The read-only rating's name: its label, then the value out of the maximum.
   * @param {string} label
   * @param {number} value
   * @param {number} max
   */
  ratingValue: (label, value, max) => `${label}: ${value} out of ${max}`,
  noResults: 'No results',
  /** @param {number} n */
  resultCount: (n) => (n === 1 ? '1 result' : `${n} results`),
  chooseFileButton: 'Choose file',
  chooseFilesButton: 'Choose files',
  dropFile: 'or drop a file here',
  dropFiles: 'or drop files here',
  noFilesSelected: 'No files selected',
  /** @param {number} n */
  filesSelected: (n) => (n === 1 ? '1 file selected' : `${n} files selected`),
  /** @param {string} name */
  removeItem: (name) => `Remove ${name}`,
  /** @param {string} label */
  decrease: (label) => `Decrease ${label}`.trim(),
  /** @param {string} label */
  increase: (label) => `Increase ${label}`.trim(),
  /**
   * @param {number} n
   * @param {number} total
   */
  digitOf: (n, total) => `Digit ${n} of ${total}`,
  /** @param {number} n */
  moreCount: (n) => `${n} more`,
  /**
   * @param {number} n
   * @param {number} total
   */
  slideOf: (n, total) => `${n} of ${total}`,
  allFiltersCleared: 'All filters cleared. ',
  /** @param {string} name */
  fileTypeRejected: (name) => `${name} is not an accepted file type.`,
  /**
   * @param {string} name
   * @param {string} size
   */
  fileTooLarge: (name, size) => `${name} is larger than ${size}.`,
  /** @param {string[]} names */
  fileOnlyOne: (names) => `Only one file can be chosen; ${names.join(', ')} ${names.length === 1 ? 'was' : 'were'} not added.`,
  hours: 'Hours',
  minutes: 'Minutes',
  dayPeriod: 'AM/PM',
  empty: 'Empty',
  chooseDate: 'Choose date',
  chooseDates: 'Choose dates',
  dateFormatHint: 'Format: YYYY-MM-DD',
  /** The date text field's placeholder: the pattern a typed date follows. */
  dateFormatPlaceholder: 'YYYY-MM-DD',
  startDate: 'Start date',
  endDate: 'End date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  calendarLegend: 'Event types',
  commandPalette: 'Command palette',
  typeCommand: 'Type a command…',
  noCommands: 'No commands found',

  // Display and navigation
  errorSummaryHeadline: 'There is a problem',
  dismissNotification: 'Dismiss notification',
  breadcrumb: 'Breadcrumb',
  pagination: 'Pagination',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  /** @param {number} n */
  pageNumber: (n) => `Page ${n}`,
  collapseSidebar: 'Collapse sidebar',
  stepComplete: 'Completed',
  stepCurrent: 'Current step',
  stepUpcoming: 'Not started',
  carousel: 'carousel',
  slide: 'slide',
  startRotation: 'Start slide rotation',
  stopRotation: 'Stop slide rotation',
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
  copyCode: 'Copy code',
  copied: 'Copied',
  copyFailed: 'Could not copy',

  // Rich text editor
  formatting: 'Formatting',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strikethrough',
  inlineCode: 'Code',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bulletList: 'Bulleted list',
  numberedList: 'Numbered list',
  quote: 'Quote',
  link: 'Link',
  linkAddress: 'Link address',
  applyLink: 'Apply',
  removeLink: 'Remove link',
  invalidLink: 'Enter a web address starting with https://, http://, mailto: or /.',
  undo: 'Undo',
  redo: 'Redo',

  // Charts
  chart: 'chart',
  barChart: 'Bar chart',
  lineChart: 'Line chart',
  donutChart: 'Donut chart',
  /**
   * @param {string} kind
   * @param {number} categories
   * @param {number} series
   * @param {string} highest
   */
  chartSummary: (kind, categories, series, highest) =>
    `${kind}, ${categories} ${categories === 1 ? 'category' : 'categories'}${series > 1 ? `, ${series} series` : ''}.${highest ? ` ${highest}` : ''}`,
  /**
   * @param {string} where
   * @param {number | string} value
   */
  chartHighest: (where, value) => `Highest: ${where}, ${value}.`,
  areaChart: 'Area chart',
  stackedBarChart: 'Stacked bar chart',
  stackedAreaChart: 'Stacked area chart',
  scatterChart: 'Scatter chart',
  chartSeries: 'Series',
  chartTotal: 'Total',
  /**
   * @param {string} value
   * @param {string} total
   */
  chartOfTotal: (value, total) => `${value} of ${total}`,
  /**
   * @param {string} where
   * @param {number | string} value
   */
  chartHighestTotal: (where, value) => `Highest total: ${where}, ${value}.`,
  /**
   * @param {string} x
   * @param {string} y
   */
  scatterPoint: (x, y) => `x: ${x}, y: ${y}`,
  /**
   * @param {string} kind
   * @param {number} series
   * @param {number} points
   * @param {string} ranges from `scatterRanges`
   */
  scatterSummary: (kind, series, points, ranges) =>
    `${kind}, ${series > 1 ? `${series} series, ` : ''}${points} ${points === 1 ? 'point' : 'points'}. ${ranges}.`,
  /**
   * @param {string} xRange "1 to 40"
   * @param {string} yRange "3 to 97"
   */
  scatterRanges: (xRange, yRange) => `x from ${xRange}, y from ${yRange}`,
  /**
   * @param {string} from
   * @param {string} to
   */
  chartRange: (from, to) => `${from} to ${to}`,
  showDataTable: 'Show data table',
  hideDataTable: 'Hide data table',
  noData: 'No data',

  // Data grid
  gridLoading: 'Loading rows',
  emptyGroup: '(empty)',
  /** @param {number} n */
  gridRowCount: (n) => `Rows ${n}`,
  gridNoMatches: 'No rows match.',
  gridClearSearchAndFilters: 'Clear search and filters',
  gridClearAllFilters: 'Clear all filters',
  gridShowAll: 'Show all',
  gridReset: 'Reset',
  groupBy: 'Group by',
  noGrouping: 'No grouping',
  /** @param {string} header */
  groupByColumn: (header) => `Group by ${header}`,
  groupByThisColumn: 'Group by this column',
  ungroup: 'Ungroup',
  /** @param {string[]} headers */
  groupedBy: (headers) => `Grouped by ${headers.join(', then ')}`,
  groupingRemoved: 'Grouping removed',
  allGroupsExpanded: 'All groups expanded',
  allGroupsCollapsed: 'All groups collapsed',
  compactRows: 'Compact rows',
  compactRowsOn: 'Compact rows on',
  compactRowsOff: 'Compact rows off',
  exportCsv: 'Export CSV',
  saved: 'Saved',
  /** @param {string} header */
  editCell: (header) => `Edit ${header}`,
  yes: 'Yes',
  no: 'No',
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  clearSort: 'Clear sort',
  sortCleared: 'Sort cleared',
  pinToStart: 'Pin to start',
  pinToEnd: 'Pin to end',
  unpin: 'Unpin',
  widenColumn: 'Widen column',
  narrowColumn: 'Narrow column',
  autosizeColumn: 'Autosize column',
  hideColumn: 'Hide column',
  /** @param {string} header */
  columnHidden: (header) => `Column ${header} hidden`,
  /** @param {string} header */
  columnShown: (header) => `Column ${header} shown`,
  /**
   * @param {string} header
   * @param {string} side
   */
  columnPinned: (header, side) => `Column ${header} pinned to ${side === 'start' ? 'start' : 'end'}`,
  /** @param {string} header */
  columnUnpinned: (header) => `Column ${header} unpinned`,
  /** @param {string} header */
  columnMoved: (header) => `Column ${header} moved`,
  allColumnsShown: 'All columns shown',
  columnsReset: 'Columns reset',
  /** @param {string} header */
  filterRemoved: (header) => `Filter removed: ${header}. `,
  searchValues: 'Search values',
  values: 'Values',
  noMatchingValues: 'No matching values',
  condition: 'Condition',
  value: 'Value',
  from: 'From',
  to: 'To',
  clear: 'Clear',
  apply: 'Apply',
  chooseOneOption: 'Choose one of the options.',
  /** @param {string} label */
  searchGrid: (label) => `Search ${label}`.trim(),
  searchPlaceholder: 'Search…',
  activeFilters: 'Active filters',
  /** @param {string} text */
  removeFilter: (text) => `Remove filter: ${text}`,
  filterMenuItem: 'Filter…',
  // Data grid filter operators (op.<id>), shown in the filter popover.
  'op.contains': 'contains',
  'op.notContains': 'does not contain',
  'op.equals': 'equals',
  'op.notEquals': 'does not equal',
  'op.startsWith': 'starts with',
  'op.endsWith': 'ends with',
  'op.empty': 'is empty',
  'op.notEmpty': 'is not empty',
  'op.eq': 'equals',
  'op.neq': 'does not equal',
  'op.lt': 'less than',
  'op.lte': 'less than or equal',
  'op.gt': 'greater than',
  'op.gte': 'greater than or equal',
  'op.between': 'between',
  'op.on': 'on',
  'op.notOn': 'not on',
  'op.before': 'before',
  'op.after': 'after',
  'op.isTrue': 'is true',
  'op.isFalse': 'is false',
  'op.in': 'is any of',
  /** @param {string} header */
  filterColumn: (header) => `Filter ${header}`,
  /** @param {string} text */
  filterApplied: (text) => `Filter applied: ${text}. `,
  searchAndFiltersCleared: 'Search and filters cleared. ',
  /**
   * @param {number} matched
   * @param {number} total
   */
  matchedOfTotal: (matched, total) => `${matched} of ${total} rows`,
  /**
   * @param {string} header
   * @param {string} from
   * @param {string} to
   */
  filterBetween: (header, from, to) => `${header} between ${from} and ${to}`,
  filterOr: 'or',
  columnsPanel: 'Columns',
  /** @param {string} header */
  moveColumnUp: (header) => `Move ${header} up`,
  /** @param {string} header */
  moveColumnDown: (header) => `Move ${header} down`,
  /**
   * @param {string} header
   * @param {boolean} up
   */
  columnMovedDirection: (header, up) => `Column ${header} moved ${up ? 'up' : 'down'}`,
  /**
   * @param {string} header
   * @param {number} px
   */
  columnWidth: (header, px) => `Column ${header} is ${px} pixels wide`,
  /** @param {string} header */
  columnOptions: (header) => `Column options for ${header}`,
  selectAllRows: 'Select all rows',
  /** @param {string} name */
  selectRow: (name) => `Select row ${name}`,
  /** @param {number} n */
  rowsSelected: (n) => `${n} ${n === 1 ? 'row' : 'rows'} selected`,
  /** @param {[string, boolean][]} keys */
  sortedBy: (keys) => `Sorted by ${keys.map(([header, asc]) => `${header}, ${asc ? 'ascending' : 'descending'}`).join(', then ')}`,
  /**
   * @param {boolean} asc
   * @param {number} priority
   */
  headerSortState: (asc, priority) => `, sorted ${asc ? 'ascending' : 'descending'}${priority ? `, priority ${priority}` : ''}`,
  headerFiltered: ', filtered',
  /**
   * @param {string} label
   * @param {boolean} open
   */
  groupToggled: (label, open) => `${label} ${open ? 'expanded' : 'collapsed'}`,
  /** @param {string} label */
  gridPages: (label) => `${label} pages`.trim(),
  /**
   * @param {number} from
   * @param {number} to
   * @param {number} matched
   * @param {number | null} filteredFrom
   */
  footerRange: (from, to, matched, filteredFrom) =>
    `Rows ${from}–${to} of ${matched}${filteredFrom === null ? '' : ` (filtered from ${filteredFrom})`}`,
  /**
   * @param {number} matched
   * @param {number} groups
   * @param {number | null} filteredFrom
   */
  footerGroups: (matched, groups, filteredFrom) =>
    `${matched} rows in ${groups} ${groups === 1 ? 'group' : 'groups'}${filteredFrom === null ? '' : ` (filtered from ${filteredFrom})`}`,
  // Wave 14a
  day: 'Day',
  month: 'Month',
  year: 'Year',
  enterCompleteDate: 'Enter a complete date.',
  enterRealDate: 'Enter a real date, such as 2026-02-28.',
  date: 'Date',
  time: 'Time',
  done: 'Done',
  cancel: 'Cancel',
  chooseDateAndTime: 'Choose date and time',
  enterDateTime: 'Enter a date and time.',
  /** @param {string} value */
  dateTimeMin: (value) => `Choose a time on or after ${value}.`,
  /** @param {string} value */
  dateTimeMax: (value) => `Choose a time on or before ${value}.`,
  customColor: 'Custom color',
  chooseColor: 'Choose a color.',
  /**
   * @param {string} label
   * @param {string} value
   */
  editNamed: (label, value) => `${label}: ${value}, edit`,
  // Wave 14b
  /** @param {string} label */
  moreActionsFor: (label) => `More actions for ${label}`,
  moreActions: 'More actions',
  /**
   * @param {number} n
   * @param {number} total
   */
  stepOf: (n, total) => `Step ${n} of ${total}`,
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
  skipTour: 'Skip tour',
  /** @param {number} n */
  stepSkipped: (n) => `Step ${n} skipped: it is not on this page.`,
  /** @param {string} title */
  stepSkippedTitled: (title) => `Skipped “${title}”: it is not on this page.`,
  moreInformation: 'More information',
  copy: 'Copy',
  loaded: 'Loaded',
  /** Joins a short text and its longer form, as in "3 minutes ago, October 15, 2026" (CJK tables use '，' or '、'). */
  listSeparator: ', ',
  // Wave 14c
  skipToContent: 'Skip to main content',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
  /** Name of the app shell's navigation drawer when it has no `nav-label`. */
  navigation: 'Navigation',
  onThisPage: 'On this page',
  /** @param {string} name */
  resizeNamed: (name) => `Resize ${name}`,
  /**
   * Names a splitter pane that has no `label` by its position, counting from 1.
   * @param {number} n
   */
  paneNumber: (n) => `pane ${n}`,
  /** @param {string} item */
  reorderNamed: (item) => `Reorder ${item}`,
  /**
   * @param {string} item
   * @param {number} position
   * @param {number} total
   */
  grabbed: (item, position, total) => `Grabbed ${item}, position ${position} of ${total}`,
  /**
   * @param {number} position
   * @param {number} total
   */
  movedTo: (position, total) => `Moved to position ${position} of ${total}`,
  /** @param {number} position */
  droppedAt: (position) => `Dropped at position ${position}`,
  /** @param {number} position */
  reorderCanceled: (position) => `Canceled, back to position ${position}`,
  // Wave 16
  /** Name of focsd-theme-toggle's radio group when it has no `label`. */
  colorTheme: 'Color theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  /** The toggle's option that follows the operating system's light or dark setting. */
  themeSystem: 'System',
  themeContrast: 'High contrast',
  /** Name of focsd-theme-picker's radio group when it has no `label`. */
  themePreset: 'Theme preset',
  /** The picker's option without a preset (Wayfinding is the name of Focsd's own look). */
  presetDefault: 'Wayfinding (default)',
  /**
   * The display name of a preset, from its id (`harbor` → "Harbor"). Preset names are proper names;
   * a table may still spell them for its script.
   * @param {string} name
   */
  presetName: (name) => name.charAt(0).toUpperCase() + name.slice(1),
  // Wave 18
  /**
   * A stat tile's change, as in "Up 12% from last period".
   * @param {string} amount The formatted size of the change.
   * @param {string} period
   */
  deltaUp: (amount, period) => `Up ${amount} from ${period}`,
  /**
   * @param {string} amount
   * @param {string} period
   */
  deltaDown: (amount, period) => `Down ${amount} from ${period}`,
  /** @param {string} period */
  deltaFlat: (period) => `No change from ${period}`,
  /** What a stat's change is measured against when it has no `period`. */
  lastPeriod: 'last period',
  /** Whether a stat's change is good or bad news, read after it: "Up 12% from last period, good". */
  deltaGood: 'good',
  deltaBad: 'bad',
  statusOnline: 'Online',
  statusOffline: 'Offline',
  statusBusy: 'Busy',
  statusWarning: 'Warning',
  statusError: 'Error',
  /** focsd-status-dot's label for the neutral status. */
  statusNeutral: 'Unknown',
  /** @param {string} value */
  sparkOne: (value) => `1 value: ${value}`,
  /**
   * focsd-sparkline's sentence.
   * @param {number} count
   * @param {string} range from `chartRange`, "4 to 19"
   * @param {string} last
   * @param {string} change from `sparkUp`, `sparkDown` or `sparkSame`
   */
  sparkSummary: (count, range, last, change) => `${count} values, from ${range}, last ${last}, ${change}`,
  /** @param {string} amount The share, or '' when the first value is 0. */
  sparkUp: (amount) => `up${amount ? ` ${amount}` : ''} from the first`,
  /** @param {string} amount */
  sparkDown: (amount) => `down${amount ? ` ${amount}` : ''} from the first`,
  sparkSame: 'unchanged from the first',
  /**
   * A gauge legend entry.
   * @param {string} label
   * @param {string} to The formatted upper edge.
   */
  gaugeBand: (label, to) => `${label}, up to ${to}`,
  /** focsd-segmented-control's name when it has no label. */
  segmentedControl: 'Options',
  dock: 'Views',
  /** focsd-lightbox's default name. */
  lightbox: 'Image viewer',
  /**
   * @param {number} n 1-based position
   * @param {number} total
   */
  lightboxCounter: (n, total) => `Image ${n} of ${total}`,
  previousImage: 'Previous image',
  nextImage: 'Next image',
  closeViewer: 'Close image viewer',
  /** focsd-image-compare's default name. */
  imageCompare: 'Compare images',
  /** @param {number} percent How much of the before image shows. */
  comparePosition: (percent) => `${percent}% before image`,
  /** @param {string} label */
  signatureSigned: (label) => `${label}, signed`,
  /** @param {string} label */
  signatureEmpty: (label) => `${label}, empty`,
  /** focsd-signature-pad's status after the person signs or clears (review item 140). */
  signatureAdded: 'Signature added',
  signatureCleared: 'Signature cleared',
  /** focsd-signature-pad's message when `required` and empty. */
  signatureRequired: 'Add your signature.',
  signatureTypeInstead: 'Type instead',
  signatureDrawInstead: 'Draw instead',
  /** @param {string} label */
  signatureTypedLabel: (label) => `Type your name for ${label}`,
  /** focsd-bottom-nav's default name. */
  bottomNav: 'Main',
  /**
   * An item's name with its badge.
   * @param {string} label
   * @param {string} count
   */
  bottomNavBadge: (label, count) => `${label}, ${count} new`,
  /** focsd-notification-center's default name. */
  notifications: 'Notifications',
  /**
   * The notification center trigger's name with unread items.
   * @param {number} count
   * @param {string} [label] The center's own `label`, when it has one.
   */
  notificationsUnread: (count, label = 'Notifications') => `${label}, ${count} unread`,
  /** Read before an unread notification's title. */
  notificationUnread: 'Unread',
  markAllRead: 'Mark all as read',
  /** @param {string} title */
  dismissNotificationNamed: (title) => `Dismiss ${title}`,
  notificationsEmpty: "You're all caught up",
  /** @param {number} count */
  notificationsNew: (count) => (count === 1 ? '1 new notification' : `${count} new notifications`),
};

/** @type {Translation} */
const enTable = en;

/** @type {Map<string, Translation>} */
const tables = new Map([['en', enTable]]);

/** @type {Set<LocalizeHost>} */
const hosts = new Set();

/** @type {MutationObserver | null} */
let observer = null;

/** The `lang|dir` each host resolved last, so a mutation re-renders only the hosts it changed. */
/** @type {WeakMap<LocalizeHost, string>} */
const resolved = new WeakMap();

function refreshAll() {
  for (const host of hosts) host.requestUpdate();
}

/** Hosts that formatted with the default locale (they called `locale()`), so `setLocale()` re-renders only them. */
/** @type {WeakSet<LocalizeHost>} */
const formatters = new WeakSet();

onLocaleChange(() => {
  for (const host of hosts) if (formatters.has(host)) host.requestUpdate();
});

/** @param {LocalizeHost} host */
const resolvedOf = (host) => `${languageOf(host)}|${nearest(host, 'dir')}`;

/** A `lang` or `dir` changed: re-render the hosts whose resolved language or direction moved. */
function refreshChanged() {
  for (const host of hosts) {
    const now = resolvedOf(host);

    if (resolved.get(host) === now) continue;
    resolved.set(host, now);
    host.requestUpdate();
  }
}

/**
 * Add or extend translation tables; components update immediately.
 * @param {...Translation} translations
 */
export function registerTranslation(...translations) {
  for (const t of translations) {
    if (!t?.$code) throw new TypeError('registerTranslation: each table needs a $code, such as "de".');
    const code = t.$code.toLowerCase();
    tables.set(code, { ...tables.get(code), ...t });
  }

  refreshAll();
}

/**
 * The language for `el`: the nearest `lang` attribute, crossing shadow roots, else `<html lang>`.
 * @param {Element} el
 * @returns {string}
 */
function languageOf(el) {
  return nearest(el, 'lang') ?? (globalThis.document?.documentElement?.lang || 'en');
}

/**
 * Look up a term for a language, falling back to its base language and then English.
 * @param {string | null | undefined} lang
 * @param {string} key
 * @param {...unknown} args
 * @returns {string}
 */
export function termFor(lang, key, ...args) {
  const code = (lang || 'en').toLowerCase();
  const base = /** @type {string} */ (code.split('-')[0]);
  const value = tables.get(code)?.[key] ?? tables.get(base)?.[key] ?? enTable[key];

  if (value === undefined) return key;

  return typeof value === 'function' ? value(...args) : value;
}

/** @typedef {import('lit').ReactiveController} ReactiveController */

/**
 * Reactive controller: `this.localize.term(key, ...args)` and `this.localize.lang()`.
 * @implements {ReactiveController}
 */
export class LocalizeController {
  /** @param {LocalizeHost} host */
  constructor(host) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    hosts.add(this.host);
    resolved.set(this.host, resolvedOf(this.host));

    if (!observer && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(refreshChanged);
      // Subtree: a `lang` on any light-DOM ancestor (not only <html>) re-translates. Lang inside shadow roots is not watched.
      observer.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['lang', 'dir'] });
    }
  }

  hostDisconnected() {
    hosts.delete(this.host);
    this.#lang = null;
  }

  /** The language, looked up once per update (a render calls term() many times). */
  /** @type {string | null} */
  #lang = null;

  hostUpdate() {
    this.#lang = null;
  }

  /** @returns {string} */
  lang() {
    if (typeof document === 'undefined') return 'en';
    this.#lang ??= languageOf(this.host);

    return this.#lang;
  }

  /**
   * Locale for Intl: `setLocale()`, else the nearest `lang`, else undefined (the browser's locale).
   * Elements call it when they have no `locale` of their own, so it also marks the host for `setLocale()` re-renders.
   * @returns {string | undefined}
   */
  locale() {
    formatters.add(this.host);

    return resolveLocale(this.host);
  }

  /**
   * @param {string} key
   * @param {...unknown} args
   * @returns {string}
   */
  term(key, ...args) {
    return termFor(this.lang(), key, ...args);
  }

  /**
   * Like term(), but `fallback` when no table has the key (labels from custom column types).
   * @param {string} key
   * @param {string} fallback
   * @param {...unknown} args
   * @returns {string}
   */
  termOr(key, fallback, ...args) {
    const code = this.lang().toLowerCase();
    const known = [code, /** @type {string} */ (code.split('-')[0]), 'en'].some((c) => tables.get(c)?.[key] !== undefined);

    return known ? this.term(key, ...args) : fallback;
  }
}
