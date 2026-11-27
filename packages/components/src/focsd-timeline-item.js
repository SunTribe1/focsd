import { css } from 'lit';
import { FocsdTimelineItemBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { toneStyles } from '@focsd/primitives/styles/tone.js';
import { timelineRail } from '@focsd/primitives/styles/timeline.js';
import { cycleHueStyles } from '@focsd/primitives/styles/hue.js';

export class FocsdTimelineItem extends FocsdTimelineItemBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTimelineItemBase.styles,
    cycleHueStyles,
    hostStyles,
    toneStyles,
    css`
    :host { position: relative; display: block; }
    :host { --_marker: var(--focsd-timeline-marker-size, 12px); }
    /* The marker (its size plus a rail-wide border) centers on the rail: back past the list's padding, half the rail, half the marker. */
    [part~='marker'] {
      position: absolute;
      inset-inline-start: calc(-1 * var(--focsd-space-4) - ${timelineRail} / 2 - (var(--_marker) / 2 + ${timelineRail}));
      inset-block-start: 0.35em;
      inline-size: var(--_marker);
      block-size: var(--_marker);
      border-radius: 50%;
      border: ${timelineRail} solid var(--_tone-edge);
      background: var(--focsd-surface);
    }
    /* With an icon, the marker grows to hold it. */
    :host([data-icon]) { --_marker: var(--focsd-timeline-marker-size, 1.75rem); }
    :host([data-icon]) [part~='marker'] {
      display: grid;
      place-items: center;
      inset-block-start: 0;
      color: var(--_hue, var(--_tone-ink, var(--focsd-ink)));
    }
    :host([data-icon]) [part~='marker'] span[part~='icon'] { font-size: calc(var(--_marker) * 0.5); }
    /* Untoned markers cycle through the hues in a colorful preset (Prismatic). */
    :host(:is(:not([tone]), [tone='neutral'])) [part~='marker'] { border-color: var(--_hue, var(--_tone-edge)); }
    [part~='content'] { display: grid; gap: var(--focsd-space-1); }
    [part~='time'] { color: var(--focsd-ink-muted); font-size: var(--focsd-text-label-size); font-family: var(--focsd-font-mono); }
    [part~='heading'] { font-weight: var(--focsd-text-label-weight); }
    [part~='body'] ::slotted(*) { margin: 0; }
  `,
  ];
}

defineElement('focsd-timeline-item', FocsdTimelineItem);
