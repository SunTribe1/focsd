import { css } from 'lit';
import { FocsdToasterBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion } from '@focsd/primitives/styles/motion.js';

export class FocsdToaster extends FocsdToasterBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdToasterBase.styles,
    hostStyles,
    css`
      :host {
        position: fixed;
        inset-block-end: var(--focsd-space-5);
        inset-inline-end: var(--focsd-space-5);
        z-index: var(--focsd-layer-toast);
        pointer-events: none;
      }
      [part~='list'] {
        display: grid;
        gap: var(--focsd-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      [part~='toast'] {
        display: flex;
        align-items: center;
        gap: var(--focsd-space-3);
        min-inline-size: 18rem;
        max-inline-size: min(26rem, 100vw - 2rem);
        padding-block: var(--focsd-space-2);
        padding-inline: var(--focsd-space-4) var(--focsd-space-2);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-inline-start: calc(var(--focsd-border-width) * 4) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-surface);
        background: var(--focsd-surface-raised);
        box-shadow: var(--focsd-shadow-overlay);
        font-size: var(--focsd-text-small-size);
        pointer-events: auto;
      }
      [part~='toast'][data-tone='positive'] { border-inline-start-color: var(--focsd-positive); }
      [part~='toast'][data-tone='caution'] { border-inline-start-color: var(--focsd-caution); }
      [part~='toast'][data-tone='critical'] { border-inline-start-color: var(--focsd-critical); }
      [part~='message'] {
        flex: 1;
      }
      [part~='action'],
      [part~='dismiss'] {
        min-block-size: var(--focsd-control-height);
        min-inline-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-2);
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-ink);
        font: inherit;
        cursor: pointer;
      }
      [part~='action'] {
        color: var(--focsd-route);
        font-weight: var(--focsd-text-label-weight);
        text-decoration: underline;
      }
      [part~='action']:hover,
      [part~='dismiss']:hover {
        background: var(--focsd-surface-sunk);
      }
      /* A viewport query on purpose: the toaster is fixed to the viewport, so the viewport is the
         container whose width matters (DESIGN.md prefers container queries for in-flow parts). */
      @media (max-width: 480px) {
        :host {
          inset-inline: var(--focsd-space-4);
        }
      }
    `,
    enterMotion("[part~='toast']", { from: 'translateY(8px)' }),
  ];
}

defineElement('focsd-toaster', FocsdToaster);
