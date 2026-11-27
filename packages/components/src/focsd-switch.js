import { css } from 'lit';
import { FocsdSwitchBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';

export class FocsdSwitch extends FocsdSwitchBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSwitchBase.styles,
    hostStyles,
    fieldLayoutStyles,
    css`
      :host {
        display: inline-flex;
      }
      [part~='layout'] {
        min-inline-size: 0;
      }
      .row {
        display: grid;
        grid-template-areas: 'control label state';
        grid-template-columns: repeat(3, max-content);
        justify-content: start;
        align-items: center;
        column-gap: var(--focsd-space-3);
        min-block-size: var(--focsd-control-height);
        justify-self: start;
      }
      .row > [part~='control'] {
        grid-area: control;
      }
      .row > [part~='label'] {
        grid-area: label;
      }
      .row > [part~='state'] {
        grid-area: state;
      }
      .row[data-position='start'] {
        grid-template-areas: 'label control state';
      }
      .row[data-position='top'] {
        grid-template-areas:
          'label label'
          'control state';
        grid-template-columns: repeat(2, max-content);
        row-gap: var(--focsd-space-1);
      }
      [part~='control'] {
        position: relative;
        box-sizing: border-box;
        /* Track and thumb follow the density's indicator size (16px default, 20px comfortable). */
        inline-size: calc(var(--focsd-control-indicator, 1rem) * 2 + 8px);
        block-size: calc(var(--focsd-control-indicator, 1rem) + 8px);
        min-block-size: calc(var(--focsd-control-indicator, 1rem) + 8px);
        padding: 0;
        border: 2px solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface-sunk);
        cursor: pointer;
        flex: none;
      }
      [part~='thumb'] {
        position: absolute;
        inset-block-start: 2px;
        inset-inline-start: 2px;
        inline-size: var(--focsd-control-indicator, 1rem);
        block-size: var(--focsd-control-indicator, 1rem);
        border-radius: 3px;
        background: var(--focsd-ink-muted);
        transition:
          transform var(--focsd-duration-base) var(--focsd-ease-move),
          background-color var(--focsd-duration-base) var(--focsd-ease-move);
      }
      :host([checked]) [part~='control'] {
        background: var(--focsd-action);
        border-color: var(--focsd-field-border-color, var(--focsd-action));
      }
      :host([checked]) [part~='thumb'] {
        background: var(--focsd-on-action);
        transform: translateX(var(--focsd-control-indicator, 1rem));
      }
      :host(:dir(rtl)[checked]) [part~='thumb'] {
        transform: translateX(calc(var(--focsd-control-indicator, 1rem) * -1));
      }
      /* Windows High Contrast drops backgrounds: draw the thumb in system colors so it stays visible. */
      @media (forced-colors: active) {
        [part~='thumb'] {
          forced-color-adjust: none;
          background: CanvasText;
        }
        :host([checked]) [part~='thumb'] {
          background: Highlight;
        }
      }
      [part~='label'] {
        cursor: pointer;
      }
      [part~='state'] {
        font-family: var(--focsd-font-mono);
        font-size: var(--focsd-text-label-size);
        font-weight: var(--focsd-text-label-weight);
        color: var(--focsd-ink-muted);
      }
      :host([disabled]) [part~='control'],
      :host(:disabled) [part~='control'] {
        cursor: not-allowed;
        opacity: 0.6;
      }
    `,
  ];
}

defineElement('focsd-switch', FocsdSwitch);
