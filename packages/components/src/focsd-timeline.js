import { css } from 'lit';
import { FocsdTimelineBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { timelineRail } from '@focsd-dev/primitives/styles/timeline.js';
import './focsd-timeline-item.js';

/**
 * @cssprop --focsd-timeline-marker-size - Diameter of each item's marker (default 12px), set on the timeline or an item.
 */
export class FocsdTimeline extends FocsdTimelineBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdTimelineBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='list'] {
      display: grid;
      gap: var(--focsd-space-4);
      border-inline-start: ${timelineRail} solid var(--focsd-edge-quiet);
      padding-inline-start: var(--focsd-space-4);
    }
  `,
  ];
}

defineElement('focsd-timeline', FocsdTimeline);
