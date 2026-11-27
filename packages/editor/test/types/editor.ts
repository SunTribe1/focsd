import { toolbarItems, type FocsdRichText, type ToolbarItem } from '@focsd/editor';

const editor: FocsdRichText = document.createElement('focsd-rich-text');
editor.label = 'Notes';
editor.value = '<p>Hello</p>';
const html: string = editor.value;
editor.openLinkForm();
void html;

// The toolbar item shape comes from the package entry (types I2).

const items: ToolbarItem[] = toolbarItems;
void items;
