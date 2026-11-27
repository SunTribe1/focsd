import { css } from 'lit';
import { FocsdRadioBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

export class FocsdRadio extends FocsdRadioBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdRadioBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--focsd-space-3);
        min-block-size: var(--focsd-control-height);
        border-radius: var(--focsd-radius-control);
        cursor: pointer;
        font-size: var(--focsd-text-body-size);
      }
      [part~='indicator'] {
        box-sizing: border-box;
        display: grid;
        place-items: center;
        inline-size: var(--focsd-control-indicator, 1rem);
        block-size: var(--focsd-control-indicator, 1rem);
        border: 2px solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: 50%;
        background: var(--focsd-surface);
        flex: none;
      }
      [part~='indicator']::after {
        content: '';
        inline-size: calc(var(--focsd-control-indicator, 1rem) * 0.4);
        block-size: calc(var(--focsd-control-indicator, 1rem) * 0.4);
        border-radius: 50%;
        background: transparent;
        transform: scale(0.4);
        transition:
          transform var(--focsd-duration-base) var(--focsd-ease-enter),
          background-color var(--focsd-duration-base) var(--focsd-ease-enter);
      }
      :host([aria-checked='true']) [part~='indicator'] {
        border-color: var(--focsd-field-border-color, var(--focsd-action));
      }
      :host([aria-checked='true']) [part~='indicator']::after {
        background: var(--focsd-action);
        transform: scale(1);
      }
      :host([disabled]) {
        color: var(--focsd-ink-muted);
        cursor: not-allowed;
      }
      @media (forced-colors: active) {
        :host([aria-checked='true']) [part~='indicator']::after {
          background: CanvasText;
        }
      }
    `,
  ];
}

defineElement('focsd-radio', FocsdRadio);
