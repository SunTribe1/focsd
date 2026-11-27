import { css } from 'lit';
import { FocsdHeaderBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

export class FocsdHeader extends FocsdHeaderBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdHeaderBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        container-type: inline-size;
      }
      :host([sticky]) {
        position: sticky;
        inset-block-start: 0;
        z-index: var(--focsd-layer-sticky, 10);
      }
      [part~='header'] {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--focsd-space-2) var(--focsd-space-4);
        padding: var(--focsd-space-3) var(--focsd-space-5);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        background: var(--focsd-surface);
      }
      [part~='bar'] {
        display: contents;
      }
      [part~='brand'] {
        order: 0;
      }
      [part~='main'] {
        order: 1;
        flex: 1;
        min-inline-size: 0;
      }
      [part~='actions'] {
        order: 2;
        display: flex;
        gap: var(--focsd-space-2);
      }
      [part~='toggle'] {
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-2);
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        font: inherit;
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        cursor: pointer;
        transition: background-color var(--focsd-duration-quick) var(--focsd-ease-move);
      }
      [part~='toggle']:hover {
        background: var(--focsd-surface-sunk);
      }
      /* Compact: brand, then menu button and actions on one row; the panel drops below. */
      :host([compact]) [part~='bar'] {
        display: flex;
        flex: 1 1 100%;
        align-items: center;
        gap: var(--focsd-space-2);
      }
      :host([compact]) [part~='brand'] {
        margin-inline-end: auto;
      }
      :host([compact]) [part~='main'] {
        flex: 1 1 100%;
        padding-block: var(--focsd-space-2);
        border-block-start: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        transition:
          opacity var(--focsd-duration-base) var(--focsd-ease-enter),
          transform var(--focsd-duration-base) var(--focsd-ease-enter);
      }
      @starting-style {
        :host([compact]) [part~='main']:not([hidden]) {
          opacity: 0;
          transform: translateY(-4px);
        }
      }
      [part~='main'][hidden] {
        display: none;
      }
      @container (max-width: 480px) {
        [part~='header'] {
          padding-inline: var(--focsd-space-4);
        }
      }
    `,
  ];
}

defineElement('focsd-header', FocsdHeader);
