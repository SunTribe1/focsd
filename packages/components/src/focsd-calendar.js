import { css } from 'lit';
import { FocsdCalendarBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles, hatch } from '@focsd/primitives/styles/shared.js';
import { hoverMotion } from '@focsd/primitives/styles/motion.js';
import { squareButton } from '@focsd/primitives/styles/picker.js';

export class FocsdCalendar extends FocsdCalendarBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdCalendarBase.styles,
    hostStyles,
    css`
      :host { display: inline-grid; gap: var(--focsd-space-2); }
      [part~='header'] { display: flex; align-items: center; justify-content: space-between; gap: var(--focsd-space-2); }
      [part~='heading'] { margin: 0; font-size: var(--focsd-text-body-size); font-weight: var(--focsd-text-subheading-weight); }
      [part~='nav'] { ${squareButton} min-inline-size: 2rem; min-block-size: 2rem; border-color: transparent; }
      [part~='nav']:hover { background: var(--focsd-surface-sunk); }
      [part~='nav'][aria-disabled='true'] { color: var(--focsd-ink-muted); background: none; cursor: not-allowed; }
      @media (forced-colors: active) { [part~='nav'][aria-disabled='true'] { color: GrayText; } }
      :host(:dir(rtl)) [part~='nav'] [part~='icon'] { transform: scaleX(-1); }
      [part~='grid'] { border-collapse: separate; border-spacing: 0 var(--focsd-space-1); }
      [part~='weekday'] {
        padding-block: var(--focsd-space-1);
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-label-size);
        font-weight: var(--focsd-text-label-weight);
      }
      [part~='day'], [part~='pad'] {
        inline-size: max(var(--focsd-target-min), 2.25rem);
        block-size: max(var(--focsd-target-min), 2rem);
        padding: 0;
        text-align: center;
      }
      [part~='day'] { border-radius: var(--focsd-radius-control); cursor: pointer; font-variant-numeric: tabular-nums; }
      [part~='day']:hover { background: var(--focsd-surface-sunk); }
      [part~='today'] { font-weight: var(--focsd-text-label-weight); text-decoration: underline; text-underline-offset: 0.25em; }
      /* A range reads as one tinted band between its two solid ends, not a box per day. */
      [part~='selected'] { background: color-mix(in srgb, var(--focsd-action) 18%, transparent); border-radius: 0; }
      :host(:not([range])) [part~='selected'], [part~='range-edge'] {
        background: var(--focsd-action);
        color: var(--focsd-on-action);
        border-radius: var(--focsd-radius-control);
      }
      [part~='day'][aria-disabled='true'] { color: var(--focsd-ink-muted); background: ${hatch}; cursor: not-allowed; }
      /* Event markers: dots under the number, inside the cell so they never change the grid. */
      [part~='day'] { position: relative; }
      [part~='events'] {
        position: absolute;
        inset-inline: 0;
        inset-block-end: 3px;
        display: flex;
        justify-content: center;
        gap: 2px;
        pointer-events: none;
      }
      [part~='event'] {
        display: inline-block;
        flex: none;
        inline-size: 5px;
        block-size: 5px;
        border-radius: 50%;
        background: var(--_event, var(--focsd-route));
      }
      /* On a solid selected day, dots take the text color so they stay visible. */
      :host(:not([range])) [part~='selected'] [part~='event'], [part~='range-edge'] [part~='event'] { background: currentColor; }
      [part~='legend'] {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--focsd-space-1) var(--focsd-space-4);
        margin: 0;
        padding: 0;
        list-style: none;
        color: var(--focsd-ink-muted);
        font-size: var(--focsd-text-label-size);
      }
      [part~='legend-item'] { display: inline-flex; align-items: center; gap: var(--focsd-space-2); }
      [part~='legend-item'] [part~='event'] { inline-size: 8px; block-size: 8px; }
      @media (forced-colors: active) {
        [part~='selected'] { forced-color-adjust: none; background: Highlight; color: HighlightText; }
        [part~='day'][aria-disabled='true'] { color: GrayText; }
        [part~='event'] { forced-color-adjust: none; background: CanvasText; }
      }
    `,
    hoverMotion("[part~='day'], [part~='nav']"),
  ];
}

defineElement('focsd-calendar', FocsdCalendar);
