import { css } from 'lit';
import { FocsdTreeItemBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { hoverMotion } from '@focsd-dev/primitives/styles/motion.js';
import { cycleHueStyles } from '@focsd-dev/primitives/styles/hue.js';

export class FocsdTreeItem extends FocsdTreeItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTreeItemBase.styles,
    cycleHueStyles,
    hostStyles,
    css`
    :host { display: block; outline: none; }
    :host(:focus-visible) { box-shadow: none; }
    [part~='row'] {
      display: flex;
      align-items: center;
      gap: var(--focsd-space-1);
      min-block-size: var(--focsd-control-height);
      padding-inline-end: var(--focsd-space-3);
      border-radius: var(--focsd-radius-control);
      cursor: pointer;
    }
    [part~='row']:hover { background: var(--focsd-surface-sunk); }
    :host(:focus-visible) > [part~='row'] { box-shadow: var(--focsd-focus-ring); }
    :host([aria-selected='true']) > [part~='row'] {
      background: var(--focsd-surface-sunk);
      font-weight: var(--focsd-text-label-weight);
      box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-action);
    }
    :host([aria-selected='true']:focus-visible) > [part~='row'] { box-shadow: var(--focsd-focus-ring); }
    [part~='toggle'] { display: inline-grid; place-items: center; inline-size: 1.5rem; flex: none; }
    :host([disabled]) [part~='row'] { color: var(--focsd-ink-muted); cursor: not-allowed; }
    @media (forced-colors: active) { :host([aria-selected='true']) > [part~='row'] { outline: 2px solid Highlight; } }
  `,
    hoverMotion("[part~='row']"),
  ];
}

defineElement('focsd-tree-item', FocsdTreeItem);
