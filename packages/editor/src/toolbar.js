/**
 * Toolbar commands for focsd-rich-text. Each entry knows its label key (translated), its icon, its
 * keyboard shortcut, how to run it and whether it is active at the selection.
 */
import { registerPathIconLibrary } from '@focsd/primitives/internal';

/**
 * Editor icon paths (24×24 strokes), by toolbar icon name. From Lucide icons, ISC License, Copyright (c) 2026 Lucide Icons and Contributors (some derived from Feather, MIT, Copyright (c) 2013-present Cole Bemis); full text in LICENSE-lucide.txt in this package.
 */
const editorIconPaths = {
  bold: 'M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z',
  italic: 'M19 4h-9M14 20H5M15 4 9 20',
  underline: 'M6 4v6a6 6 0 0 0 12 0V4M4 20h16',
  strike: 'M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6M4 12h16',
  code: 'm16 18 6-6-6-6M8 6l-6 6 6 6',
  'heading-2': 'M4 12h8M4 18V6M12 18V6M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1',
  'heading-3': 'M4 12h8M4 18V6M12 18V6M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2',
  'bullet-list': 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  'numbered-list': 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1',
  quote: 'M17 6H3M21 12H8M21 18H8M3 12v6',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  undo: 'M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13',
  redo: 'M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7',
};

/** @param {string} d */
const svg = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

/**
 * Editor icons as SVG markup, for apps that build on them. The editor itself registers the path data
 * as the `editor` icon library, drawn without the icon sanitizer (quality B11); apps can replace
 * it with `registerIconLibrary('editor', …)`.
 * @type {Record<keyof typeof editorIconPaths, string>}
 */
export const editorIcons = /** @type {Record<keyof typeof editorIconPaths, string>} */ (
  Object.fromEntries(Object.entries(editorIconPaths).map(([name, d]) => [name, svg(d)]))
);

registerPathIconLibrary('editor', editorIconPaths);

/** @typedef {{ id: string, label: string, icon: string, keys?: string, toggle?: boolean,
 *   run: (editor: Editor, host: { openLinkForm(): void }) => void, active?: (editor: Editor) => boolean,
 *   enabled?: (editor: Editor) => boolean, separatorBefore?: boolean }} ToolbarItem */
/** @typedef {import('@tiptap/core').Editor} Editor */

/** @type {ToolbarItem[]} */
export const toolbarItems = [
  {
    id: 'bold',
    label: 'bold',
    icon: 'bold',
    keys: 'Control+B',
    toggle: true,
    run: (e) => e.chain().focus().toggleBold().run(),
    active: (e) => e.isActive('bold'),
  },
  {
    id: 'italic',
    label: 'italic',
    icon: 'italic',
    keys: 'Control+I',
    toggle: true,
    run: (e) => e.chain().focus().toggleItalic().run(),
    active: (e) => e.isActive('italic'),
  },
  {
    id: 'underline',
    label: 'underline',
    icon: 'underline',
    keys: 'Control+U',
    toggle: true,
    run: (e) => e.chain().focus().toggleUnderline().run(),
    active: (e) => e.isActive('underline'),
  },
  {
    id: 'strike',
    label: 'strikethrough',
    icon: 'strike',
    keys: 'Control+Shift+S',
    toggle: true,
    run: (e) => e.chain().focus().toggleStrike().run(),
    active: (e) => e.isActive('strike'),
  },
  {
    id: 'code',
    label: 'inlineCode',
    icon: 'code',
    keys: 'Control+E',
    toggle: true,
    run: (e) => e.chain().focus().toggleCode().run(),
    active: (e) => e.isActive('code'),
  },
  {
    id: 'h2',
    label: 'heading2',
    icon: 'heading-2',
    keys: 'Control+Alt+2',
    toggle: true,
    separatorBefore: true,
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    active: (e) => e.isActive('heading', { level: 2 }),
  },
  {
    id: 'h3',
    label: 'heading3',
    icon: 'heading-3',
    keys: 'Control+Alt+3',
    toggle: true,
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    active: (e) => e.isActive('heading', { level: 3 }),
  },
  {
    id: 'ul',
    label: 'bulletList',
    icon: 'bullet-list',
    keys: 'Control+Shift+8',
    toggle: true,
    run: (e) => e.chain().focus().toggleBulletList().run(),
    active: (e) => e.isActive('bulletList'),
  },
  {
    id: 'ol',
    label: 'numberedList',
    icon: 'numbered-list',
    keys: 'Control+Shift+7',
    toggle: true,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    active: (e) => e.isActive('orderedList'),
  },
  {
    id: 'quote',
    label: 'quote',
    icon: 'quote',
    keys: 'Control+Shift+B',
    toggle: true,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    active: (e) => e.isActive('blockquote'),
  },
  {
    id: 'link',
    label: 'link',
    icon: 'link',
    keys: 'Control+K',
    toggle: true,
    separatorBefore: true,
    run: (e, host) => host.openLinkForm(),
    active: (e) => e.isActive('link'),
  },
  {
    id: 'undo',
    label: 'undo',
    icon: 'undo',
    keys: 'Control+Z',
    separatorBefore: true,
    run: (e) => e.chain().focus().undo().run(),
    enabled: (e) => e.can().undo(),
  },
  {
    id: 'redo',
    label: 'redo',
    icon: 'redo',
    keys: 'Control+Shift+Z',
    run: (e) => e.chain().focus().redo().run(),
    enabled: (e) => e.can().redo(),
  },
];

/**
 * Links may only go to the web, mail, phone, or a path on this site.
 * @param {unknown} url
 * @returns {boolean}
 */
export const isSafeLink = (url) => /^(https?:\/\/|mailto:|tel:|\/(?![/\\])|#|\?)/i.test(String(url ?? '').trim());
