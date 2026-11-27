import { css } from 'lit';
import { FocsdSplitterBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import './focsd-splitter-pane.js';

export class FocsdSplitter extends FocsdSplitterBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdSplitterBase.styles,
    hostStyles,
    css`
    :host {
      display: flex;
      min-block-size: 8rem;
      border: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      border-radius: var(--focsd-radius-surface);
      overflow: hidden;
      background: var(--focsd-surface);
    }
    [part~='start'] { flex-grow: 0; flex-shrink: 0; overflow: auto; padding: var(--focsd-space-3); }
    [part~='end'] { flex: 1; overflow: auto; padding: var(--focsd-space-3); }
    /* The handle: a 2px line with a three-dot grip on each side of its middle. It takes 8px of the
       layout but its grab area is the full 24px target (negative margins). The two-pane separator and
       the multi-pane bars look the same; vertical splits turn it 90 degrees. */
    :is([part~='separator'], .bar) {
      --_line: var(--focsd-edge);
      --_grip: var(--focsd-ink-muted);

      position: relative;
      z-index: 1;
      flex: none;
      box-sizing: border-box;
      inline-size: var(--focsd-target-min);
      margin-inline: calc((0.5rem - var(--focsd-target-min)) / 2);
      padding: 0;
      border: 0;
      background: linear-gradient(var(--_line), var(--_line)) center / 2px 100% no-repeat;
      cursor: col-resize;
      touch-action: none;
    }
    :is([part~='separator'], .bar)::before,
    :is([part~='separator'], .bar)::after {
      content: '';
      position: absolute;
      inset-block-start: 50%;
      inline-size: 4px;
      block-size: 16px;
      translate: 0 -50%;
      background: radial-gradient(circle, var(--_grip) 1.25px, transparent 1.75px) center top / 4px 6px repeat-y;
      opacity: 0.7;
    }
    :is([part~='separator'], .bar)::before { inset-inline-end: calc(50% + 3px); }
    :is([part~='separator'], .bar)::after { inset-inline-start: calc(50% + 3px); }
    :is([part~='separator'], .bar):is(:hover, :focus-visible) {
      --_line: var(--focsd-ink-muted);
      --_grip: var(--focsd-ink);
    }
    :is([part~='separator'], .bar):hover::before,
    :is([part~='separator'], .bar):hover::after { opacity: 1; }
    :is([part~='separator'], .bar):focus-visible { outline: 2px solid transparent; box-shadow: var(--focsd-focus-ring); }
    [part~='panes'] { flex: 1; display: flex; min-inline-size: 0; }
    [part~='pane'] { display: contents; }
    .vertical { flex-direction: column; }
    .vertical .bar {
      inline-size: auto;
      block-size: var(--focsd-target-min);
      margin-inline: 0;
      margin-block: calc((0.5rem - var(--focsd-target-min)) / 2);
      background-size: 100% 2px;
      cursor: row-resize;
    }
    .vertical .bar::before,
    .vertical .bar::after {
      inset-block-start: auto;
      inset-inline: 50% auto;
      inline-size: 16px;
      block-size: 4px;
      translate: -50% 0;
      background: radial-gradient(circle, var(--_grip) 1.25px, transparent 1.75px) left center / 6px 4px repeat-x;
    }
    .vertical .bar::before { inset-block-end: calc(50% + 3px); }
    .vertical .bar::after { inset-block-start: calc(50% + 3px); }
    @media (forced-colors: active) {
      :is([part~='separator'], .bar) { forced-color-adjust: none; --_line: CanvasText; --_grip: CanvasText; }
      :is([part~='separator'], .bar):is(:hover, :focus-visible) { --_line: Highlight; --_grip: Highlight; }
    }
  `,
  ];
}

defineElement('focsd-splitter', FocsdSplitter);
