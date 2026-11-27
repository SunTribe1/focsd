/**
 * `@focsd-dev/primitives/utils`: the curated helpers for app code (owner decision S4; the list is
 * types-api.md, "Recommended public utility surface"). Every export here is public API under
 * semver. The modules behind it stay private, so they can change freely.
 */

/**
 * @typedef {import('./internal/localize.js').Translation} Translation
 * @typedef {import('./internal/icons.js').IconLibrary} IconLibrary
 * @typedef {import('./internal/announce.js').AnnounceOptions} AnnounceOptions
 * @typedef {import('./internal/links.js').LinkHandler} LinkHandler
 */

export { registerTranslation, en } from './internal/localize.js';

export {
  registerIconLibrary,
  unregisterIconLibrary,
  setDefaultIconLibrary,
  setSystemIcons,
  resetSystemIcons,
  systemIconNames,
} from './internal/icons.js';

export { fromLucide, fromFontAwesome, fromSvgStrings } from './internal/icon-adapters.js';

export { announce } from './internal/announce.js';

export { registerShortcut, listShortcuts } from './internal/shortcuts.js';

export { setLinkHandler } from './internal/links.js';

export { setLocale, getLocale } from './internal/locale.js';

export { deepActiveElement } from './internal/focus.js';

export { parseISODate, toISODate } from './internal/date.js';

export { parseAmount, minorUnits } from './internal/currency.js';

export { parsePhone, isValidPhone, formatNational } from './internal/phone.js';

export { parseColor, formatColor, contrastRatio } from './internal/color.js';

export { formatBytes, acceptsFile } from './internal/files.js';
