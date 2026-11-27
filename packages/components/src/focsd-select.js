import { css } from 'lit';
import { FocsdSelectBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hatch, hostStyles } from '@focsd/primitives/styles/shared.js';
import { enterMotion, hoverMotion } from '@focsd/primitives/styles/motion.js';
import { listboxClearStyles, listboxPopup } from '@focsd/primitives/styles/listbox.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import './focsd-option.js';
import './focsd-option-group.js';

export class FocsdSelect extends FocsdSelectBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSelectBase.styles,
    hostStyles,
    fieldLayoutStyles,
    listboxClearStyles,
    css`
      :host {
        display: block;
        position: relative;
      }
      [part~='field'] {
        position: relative;
      }
      [part~='label'] {
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='trigger'] {
        anchor-name: --_select-anchor;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--focsd-space-3);
        inline-size: 100%;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        font: inherit;
        font-size: var(--focsd-text-body-size);
        text-align: start;
        color: var(--focsd-ink);
        background: var(--focsd-field-background, var(--focsd-surface));
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
        cursor: pointer;
      }
      [part~='value'][data-placeholder] {
        color: var(--focsd-ink-muted);
      }
      [part~='indicator'] {
        inline-size: 0.5em;
        block-size: 0.5em;
        /* Logical sides, rotated so the chevron points down; in right-to-left text the mirrored
           sides are rotated the other way, so it still points down. */
        border-inline-end: 2px solid currentColor;
        border-block-end: 2px solid currentColor;
        transform: translateY(-25%) rotate(45deg);
        flex: none;
      }
      :host(:dir(rtl)) [part~='indicator'] {
        transform: translateY(-25%) rotate(-45deg);
      }
      :host([disabled]) [part~='trigger'],
      :host(:disabled) [part~='trigger'] {
        color: var(--focsd-ink-muted);
        background: ${hatch};
        cursor: not-allowed;
      }
      /* Clearable: value, then the clear button, then the chevron, which stays at the field's usual
         inset. The value leaves room for the clear button so long text never runs under it. */
      :host([clearable]) [part~='value'] {
        margin-inline-end: calc(var(--focsd-target-min) + var(--focsd-space-1));
      }
      [part~='clear'] {
        position: absolute;
        inset-block: 0;
        inset-inline-end: calc(var(--focsd-space-3) + 0.5em + var(--focsd-space-3));
        display: inline-grid;
        place-items: center;
        /* At least the 24 px target (WCAG 2.5.8), however small its icon. */
        min-inline-size: var(--focsd-target-min);
        min-block-size: var(--focsd-target-min);
        block-size: fit-content;
        margin-block: auto;
      }
      [part~='popup'] {
        ${listboxPopup('--_select-anchor')}
        flex-direction: column;
        gap: var(--focsd-space-1);
      }
      [part~='popup']:popover-open {
        display: flex;
      }
      [part~='listbox'] {
        overscroll-behavior: contain;
      }
      [part~='search'] {
        position: sticky;
        inset-block-start: 0;
        z-index: 1;
        box-sizing: border-box;
        inline-size: 100%;
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        border: var(--focsd-border-width) solid var(--focsd-edge);
        border-radius: var(--focsd-radius-control);
        background: var(--focsd-surface);
        color: var(--focsd-ink);
        font: inherit;
        font-size: var(--focsd-text-body-size);
      }
      [part~='select-all'] {
        min-block-size: var(--focsd-control-height);
        padding-inline: var(--focsd-space-3);
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-route);
        font: inherit;
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        text-align: start;
        cursor: pointer;
      }
      [part~='select-all']:hover {
        background: var(--focsd-surface-sunk);
      }
    `,
    hoverMotion("[part~='clear'], [part~='select-all']"),
    enterMotion("[part~='popup']:popover-open"),
  ];
}

defineElement('focsd-select', FocsdSelect);
