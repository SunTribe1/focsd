import { css } from 'lit';
import { FocsdEmptyStateBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

export class FocsdEmptyState extends FocsdEmptyStateBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdEmptyStateBase.styles,
    hostStyles,
    css`
    :host { display: block; }
    [part~='empty'] {
      display: grid;
      justify-items: start;
      gap: var(--focsd-space-3);
      padding: var(--focsd-space-6);
      border: var(--focsd-border-width) dashed var(--focsd-edge);
      border-radius: var(--focsd-radius-surface);
    }
    /* The first category hue in a colorful preset (Prismatic); muted ink elsewhere. */
    [part~='icon'] { font-size: 2rem; color: var(--focsd-hue-1, var(--focsd-ink-muted)); }
    [part~='headline'] { font-size: var(--focsd-text-subheading-size); font-weight: var(--focsd-text-subheading-weight); }
    [part~='body'] { color: var(--focsd-ink-muted); }
    [part~='body'] ::slotted(*) { margin: 0; }
    [part~='actions'] { display: flex; gap: var(--focsd-space-2); }
  `,
  ];
}

defineElement('focsd-empty-state', FocsdEmptyState);
