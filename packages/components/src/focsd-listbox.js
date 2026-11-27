import { css } from 'lit';
import { FocsdListboxBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hatch, hostStyles } from '@focsd/primitives/styles/shared.js';
import { fieldLayoutStyles } from '@focsd/primitives/styles/field-layout.js';
import { activeOption, listboxGroupStyles, listboxOptionStyles } from '@focsd/primitives/styles/listbox.js';
import './focsd-option.js';
import './focsd-option-group.js';

/**
 * Listbox: an always-visible list of options for a form value, one or several (`multiple`), with
 * a label, hint and messages. Options are `focsd-option` children, optionally in
 * `focsd-option-group`s; the form gets one entry per selected value. Set each option's `value` as
 * an attribute: one set only as a property is not seen until the options are next re-read.
 *
 * @cssprop --focsd-listbox-height - The most the box grows before it scrolls (default 16rem).
 */
export class FocsdListbox extends FocsdListboxBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdListboxBase.styles,
    hostStyles,
    fieldLayoutStyles,
    listboxGroupStyles,
    listboxOptionStyles,
    activeOption('[part~="option"][part~="active"]'),
    css`
      :host {
        display: block;
      }
      [part~='label'] {
        justify-self: start;
        font-size: var(--focsd-text-small-size);
        font-weight: var(--focsd-text-label-weight);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='listbox'] {
        box-sizing: border-box;
        max-block-size: var(--focsd-listbox-height, 16rem);
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: var(--focsd-space-1);
        border: var(--focsd-border-width) solid var(--focsd-field-border-color, var(--focsd-edge));
        border-radius: var(--focsd-field-radius, var(--focsd-radius-control));
        background: var(--focsd-field-background, var(--focsd-surface));
        color: var(--focsd-ink);
        font-size: var(--focsd-text-body-size);
        outline: 2px solid transparent;
      }
      [part~='listbox']:focus-visible {
        box-shadow: var(--focsd-focus-ring);
      }
      :host([orientation='horizontal']) [part~='listbox'] {
        display: flex;
        flex-wrap: wrap;
        gap: var(--focsd-space-1);
      }
      :host([orientation='horizontal']) [part~='group'] {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--focsd-space-1);
      }
      [part~='check'] {
        display: inline-grid;
        place-items: center;
        flex: none;
        inline-size: 1em;
        block-size: 1em;
        margin-inline-end: var(--focsd-space-2);
      }
      [part~='check'] svg {
        inline-size: 1em;
        block-size: 1em;
      }
      [part~='listbox'][aria-disabled='true'] {
        color: var(--focsd-ink-muted);
        background: ${hatch};
      }
      [part~='listbox'][aria-disabled='true'] [part~='option'] {
        cursor: not-allowed;
      }
    `,
  ];
}

defineElement('focsd-listbox', FocsdListbox);
