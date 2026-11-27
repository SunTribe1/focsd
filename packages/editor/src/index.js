import { FocsdRichText } from './rich-text.js';
import { defineElement } from '@focsd/primitives/internal';

export { FocsdRichText };

export { editorIcons, isSafeLink, toolbarItems } from './toolbar.js';

/** @typedef {import('./toolbar.js').ToolbarItem} ToolbarItem */

defineElement('focsd-rich-text', FocsdRichText);
