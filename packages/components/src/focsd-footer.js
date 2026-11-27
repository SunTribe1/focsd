import { css } from 'lit';
import { FocsdFooterBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './focsd-footer-section.js';

export class FocsdFooter extends FocsdFooterBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdFooterBase.styles,
    hostStyles,
    css`
      :host {
        display: block;
        container-type: inline-size;
      }
      [part~='footer'] {
        display: grid;
        gap: var(--focsd-space-6);
        padding: var(--focsd-space-6) var(--focsd-space-5) var(--focsd-space-5);
        border-block-start: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
      }
      [part~='top'] {
        display: grid;
        grid-template-columns: minmax(12rem, 1fr) 3fr;
        gap: var(--focsd-space-6);
      }
      [part~='brand'] {
        display: grid;
        align-content: start;
        gap: var(--focsd-space-2);
        color: var(--focsd-ink);
      }
      [part~='brand'] ::slotted(p) {
        margin: 0;
        color: var(--focsd-ink-muted);
      }
      [part~='sections'] {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
        gap: var(--focsd-space-5);
      }
      [part~='legal'] {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--focsd-space-2) var(--focsd-space-5);
        padding-block-start: var(--focsd-space-4);
        border-block-start: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-small-size);
      }
      ::slotted(a[slot='legal']) {
        color: var(--focsd-route);
      }
      @container (max-width: 768px) {
        [part~='top'] {
          grid-template-columns: 1fr;
        }
        [part~='footer'] {
          padding-inline: var(--focsd-space-4);
        }
      }
    `,
  ];
}

defineElement('focsd-footer', FocsdFooter);
