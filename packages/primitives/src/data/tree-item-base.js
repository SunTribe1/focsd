import { css, html } from 'lit';
import { cssomStyle } from '../internal/style.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';
import { iconSlotStyles, leadingIcon } from '../internal/icon-slot.js';

/**
 * A tree item; nested FocsdTreeItemBase children form its group. The tree manages focus and selection.
 * The row is indented by its depth (`--_tree-level`) times `--focsd-tree-indent`.
 *
 * @slot - Default content.
 * @csspart group - The group element.
 * @csspart label - The label element.
 * @csspart row - The visible row of an item.
 * @csspart toggle - The expand or collapse arrow (decorative).
 * @cssprop --focsd-tree-indent - Indent per level of depth (default 1.25rem).
 * @slot icon - Any icon markup before the label (an SVG, an icon component, an icon-font element), instead of `icon`.
 * @csspart icon - The icon wrapper (decorative).
 */
export class FocsdTreeItemBase extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    iconSlotStyles,
    css`
      [part~='row'] {
        padding-inline-start: calc(var(--_tree-level, 0) * var(--focsd-tree-indent, 1.25rem));
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    icon: {},
    iconLibrary: { attribute: 'icon-library' },
    label: {},
    value: {},
    expanded: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  constructor() {
    super();
    /** An icon before the label: a name from the default icon library (or `icon-library`). For any other icon kit, put it in `slot="icon"`. */
    this.icon = '';
    /** The registered icon library `icon` comes from; empty for the default. */
    this.iconLibrary = '';
    /** The item's text. */
    this.label = '';
    /** The value the tree takes when this item is selected. */
    this.value = '';
    /** Whether the item's children show. */
    this.expanded = false;
    /** Disables the item. */
    this.disabled = false;
  }

  /**
   * The item's child items, in order.
   * @returns {FocsdTreeItemBase[]}
   */
  get childItems() {
    return [...(this.children ?? [])].filter((c) => c instanceof FocsdTreeItemBase);
  }

  /**
   * The parent item, or null at the top level.
   * @returns {FocsdTreeItemBase | null}
   */
  get parentItem() {
    return this.parentElement instanceof FocsdTreeItemBase ? this.parentElement : null;
  }

  /**
   * The item's depth, from 1.
   * @returns {number}
   */
  get level() {
    let level = 1;

    for (let p = this.parentItem; p; p = p.parentItem) level += 1;

    return level;
  }

  /** Tell the tree to re-sync when expansion or children change (including changes made from code). */
  #notify() {
    /** @internal A private item-to-tree signal, kept out of the manifest and the typings. */
    this.dispatchEvent(new Event('focsd-tree-item-change', { bubbles: true }));
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (changed.has('expanded')) this.#notify();
    this.setAttribute('role', 'treeitem');
    this.setAttribute('aria-label', this.label);
    this.setAttribute('aria-level', String(this.level));
    // ARIA reflection: null removes the attribute.
    this.ariaExpanded = this.childItems.length ? String(this.expanded) : null;
    this.ariaDisabled = this.disabled ? 'true' : null;

    if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', '-1');
  }

  /** @override */
  render() {
    const parent = this.childItems.length > 0;

    return html`<div part="row" style=${cssomStyle({ '--_tree-level': String(this.level - 1) })}>
        <span part="toggle" aria-hidden="true">${parent ? iconSvg(this.expanded ? 'chevron-down' : 'chevron-right') : ''}</span>
        ${leadingIcon(this)}<span part="label">${this.label}</span>
      </div>
      <div part="group" role="group" ?hidden=${!this.expanded}><slot @slotchange=${() => {
        this.requestUpdate();
        this.#notify();
      }}></slot></div>`;
  }
}
