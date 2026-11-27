/**
 * `@focsd-dev/primitives/internal`: helpers for Focsd's own packages and for authors of headless
 * components. Not app API: no semver promise, and anything here may change in a minor release.
 * App code uses `@focsd-dev/primitives/utils`.
 */

/** @typedef {import('../data/sorting.js').SortDirection} SortDirection */

export { cssomStyle } from './style.js';

export { warnOnce } from './warn.js';

export { defineElement } from './define.js';

export { fold } from './text.js';

export { deprecated } from './deprecate.js';

export { termFor, LocalizeController } from './localize.js';

export { nextIndex, edgeIndex } from './roving.js';

export { typeaheadIndex } from './typeahead.js';

export { uid } from './id.js';

export { floorCssText } from '../floor.styles.js';

export { iconPaths, registerPathIconLibrary } from './icons.js';

export { submitterOf } from './submitter.js';

export { FOCUSABLE, setTriggerState, firstFocusable, focusWithin, composedContains } from './popup.js';

export { trackVisualViewport, VisualViewportController } from './viewport.js';

export { ViewportWindow } from './viewport-window.js';

export { readOptions } from './options.js';

export { pageItems } from '../nav/pagination-base.js';

export { sortTableRows, nextDirection } from '../data/sorting.js';

export { addDays, addMonths, startOfWeek, monthWeeks, firstDayOfWeek } from './date.js';

export { intlOptions, parseFormatShorthand } from './count-up.js';

export { overflowRegions, syncOverflowRegion } from './overflow-region.js';
