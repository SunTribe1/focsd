import { css } from 'lit';
import { FocsdVirtualListBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { activeOption, selectedOption, selectedOptionForced } from '@focsd-dev/primitives/styles/listbox.js';

/**
 * @template [T=any] The item type (see FocsdVirtualListBase).
 * @extends {FocsdVirtualListBase<T>}
 * @cssprop --focsd-virtual-list-height - Height of the list (default 20rem).
 * @cssprop --focsd-virtual-list-row-height - Smallest row height (default 2.25rem); also the row height while rows are measured.
 */
export class FocsdVirtualList extends FocsdVirtualListBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdVirtualListBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        block-size: var(--focsd-virtual-list-height, 20rem);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface);
        overflow: hidden;
      }
      [part~='viewport'] {
        block-size: 100%;
        overflow: auto;
        overscroll-behavior: contain;
        /* The list anchors rows itself (the same in every browser; Safari has no native anchoring). */
        overflow-anchor: none;
        contain: strict;
      }
      [part~='spacer'] {
        position: relative;
      }
      [part~='window'] {
        position: absolute;
        inset-inline: 0;
        inset-block-start: 0;
        will-change: transform;
      }
      [part~='row'] {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        min-block-size: var(--focsd-virtual-list-row-height, 2.25rem);
        padding: var(--focsd-space-2) var(--focsd-space-3);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      :host([item-height]) [part~='row'] {
        block-size: var(--focsd-virtual-list-row-height, 2.25rem);
        overflow: hidden;
      }
      [role='option'] {
        --_selection-bar: 0 0 transparent;
        cursor: pointer;
        padding-inline-start: calc(var(--focsd-space-3) + var(--focsd-selection-bar-width));
        box-shadow: var(--_selection-bar);
      }
      [role='option'][aria-selected='true'] {
        ${selectedOption}
        background: var(--focsd-surface-sunk);
      }
      @media (forced-colors: active) {
        [role='option'][aria-selected='true'] {
          ${selectedOptionForced}
        }
      }
    `,
    activeOption("[part~='viewport']:focus-visible [part~='active']"),
  ];
}

defineElement('focsd-virtual-list', FocsdVirtualList);
