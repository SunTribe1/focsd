import { nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { labelText } from '../internal/text.js';

/** A command (data only): text = label; `value`, `group`, `shortcut`. */
export class FocsdCommandItemBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    value: {},
    group: {},
    shortcut: {},
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    disabled: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    /** The value sent in `focsd-select`; defaults to the label. */
    this.value = '';
    /** The heading the item is grouped under. */
    this.group = '';
    /** A keyboard shortcut shown next to the item, such as `⌘S`. It is shown only; the app handles the keys. */
    this.shortcut = '';
    /** An icon before the label: a name from the default icon library (or `icon-library`). For any other icon kit, put it in a child with `slot="icon"`; the palette shows a copy. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** Disables the item. */
    this.disabled = false;
  }

  /** The item's text. */
  get label() {
    return labelText(this);
  }

  /** @override */
  render() {
    return nothing;
  }
}
