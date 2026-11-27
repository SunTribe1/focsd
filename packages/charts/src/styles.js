import { css } from 'lit';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';

/** Styles of `focsd-chart` (the element adds the shared base styles in front). */
export const chartStyles = css`
  :host {
    display: block;
    --_chart-1: var(--focsd-chart-1, var(--focsd-route));
    --_chart-2: var(--focsd-chart-2, var(--focsd-ink));
    --_chart-3: var(--focsd-chart-3, var(--focsd-caution));
    --_chart-4: var(--focsd-chart-4, var(--focsd-critical));
    --_chart-5: var(--focsd-chart-5, var(--focsd-positive));
    --_chart-6: var(--focsd-chart-6, var(--focsd-ink-muted));
    color: var(--focsd-ink);
    font-size: var(--focsd-text-small-size);
  }
  figure {
    margin: 0;
    display: grid;
    gap: var(--focsd-space-2);
  }
  [part~='caption'] {
    font-size: var(--focsd-text-body-size);
    font-weight: var(--focsd-text-label-weight);
  }
  [part~='chart'] {
    position: relative;
    outline: none;
  }
  /* The plot is laid out left to right in every writing direction (mirror flips it by geometry), so
     text-anchor start/end keep meaning left/right under dir=rtl. */
  svg {
    display: block;
    inline-size: 100%;
    overflow: visible;
    direction: ltr;
  }
  .axis text,
  .empty {
    fill: var(--focsd-ink-muted);
    font-size: var(--focsd-text-label-size);
    font-family: var(--focsd-font-sans);
  }
  .grid line {
    stroke: var(--focsd-edge-quiet);
  }
  .baseline {
    stroke: var(--focsd-edge);
  }
  [part~='point'] {
    outline: none;
    cursor: default;
  }
  [part~='point-active'] {
    stroke: var(--focsd-ink);
    stroke-width: 2.5;
  }
  [part~='point']:focus-visible {
    outline: none;
  }
  /* The two-tone ring (Q13), drawn by focusRing() and shown only for keyboard focus. */
  [part~='focus-ring'] {
    display: none;
    pointer-events: none;
  }
  [part~='chart']:has([part~='point']:focus-visible) [part~='focus-ring'] {
    display: inline;
  }
  .line {
    fill: none;
    stroke-width: 2;
  }
  [part~='tooltip'] {
    ${floatingSurface}
    position: absolute;
    transform: translate(-50%, calc(-100% - 10px));
    padding: var(--focsd-space-1) var(--focsd-space-2);
    border-radius: var(--focsd-radius-control);
    white-space: nowrap;
    pointer-events: none;
  }
  [part~='legend'] {
    display: flex;
    flex-wrap: wrap;
    gap: var(--focsd-space-1) var(--focsd-space-4);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  [part~='legend'] li {
    display: inline-flex;
    align-items: center;
    gap: var(--focsd-space-2);
  }
  [part~='table-toggle'] {
    justify-self: start;
    min-block-size: max(var(--focsd-target-min), var(--focsd-control-height-inner));
    padding-inline: var(--focsd-space-3);
    border: var(--focsd-border-width) solid var(--focsd-edge);
    border-radius: var(--focsd-radius-control);
    background: var(--focsd-surface);
    color: var(--focsd-ink);
    font: inherit;
    font-weight: var(--focsd-text-label-weight);
    cursor: pointer;
  }
  table {
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    padding: var(--focsd-space-1) var(--focsd-space-3);
    border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
    text-align: end;
  }
  th[scope='row'],
  thead th:first-child {
    text-align: start;
  }
  @media (forced-colors: active) {
    [part~='point'] {
      forced-color-adjust: none;
    }
    /* Lines, areas and markers drop the series colors (they may not hold contrast on the system
       canvas) for text color; markers keep their shapes, hollow ones stay hollow. */
    .line {
      stroke: CanvasText;
    }
    .area {
      fill: CanvasText;
      fill-opacity: 0.16;
    }
    .marker {
      fill: CanvasText;
      stroke: CanvasText;
    }
    .marker[fill*='surface'] {
      fill: Canvas;
    }
    .ring-outer {
      stroke: Highlight;
    }
    .ring-inner {
      stroke: Canvas;
    }
  }
`;
