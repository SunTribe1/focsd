/* cspell:ignore vmax */
import { css } from 'lit';
import { FocsdTourBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';
import { enterMotion, hoverTransition } from '@focsd-dev/primitives/styles/motion.js';

/**
 * Tour, styled: the step's panel is a raised surface next to its target, and the spotlight dims the
 * rest of the page around the target.
 *
 * @cssprop --focsd-tour-width - The panel's widest inline size (default 22rem, never wider than the viewport less 2rem).
 */
export class FocsdTour extends FocsdTourBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTourBase.styles,
    hostStyles,
    css`
      :host {
        display: contents;
      }
      [part~='spotlight'] {
        border-radius: var(--focsd-radius-control);
        box-shadow: 0 0 0 100vmax color-mix(in oklab, var(--focsd-ink) 45%, transparent);
      }
      [part~='panel'] {
        ${floatingSurface}
        position: fixed;
        inset: auto;
        margin: 0;
        inline-size: max-content;
        max-inline-size: min(var(--focsd-tour-width, 22rem), 100vw - 2rem);
        padding: var(--focsd-space-4);
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='panel']:popover-open {
        display: grid;
        gap: var(--focsd-space-2);
      }
      [part~='progress'] {
        margin: 0;
        color: var(--focsd-ink-muted);
      }
      [part~='title'] {
        margin: 0;
        font-size: var(--focsd-text-body-size);
        line-height: var(--focsd-text-body-line-height);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='actions'] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-2);
        margin-block-start: var(--focsd-space-2);
      }
      [part~='actions'] button {
        box-sizing: border-box;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-inline-control);
        font: inherit;
        font-weight: var(--focsd-text-label-weight);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        cursor: pointer;
        ${hoverTransition({ press: true })}
      }
      [part~='actions'] button:hover {
        background: var(--focsd-surface-sunk);
      }
      [part~='actions'] [part~='next'] {
        background: var(--focsd-action);
        border-color: var(--focsd-action);
        color: var(--focsd-on-action);
      }
      [part~='actions'] [part~='next']:hover {
        background: var(--focsd-action-hover);
      }
      [part~='skip'] {
        margin-inline-start: auto;
      }
      [part~='back'][hidden] {
        display: none;
      }
      @media (forced-colors: active) {
        [part~='spotlight'] {
          outline: 3px solid Highlight;
          outline-offset: 2px;
        }
      }
    `,
    enterMotion("[part~='panel']:popover-open"),
  ];
}

defineElement('focsd-tour', FocsdTour);
