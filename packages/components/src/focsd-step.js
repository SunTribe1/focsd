import { css } from 'lit';
import { FocsdStepBase } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';

export class FocsdStep extends FocsdStepBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdStepBase.styles,
    hostStyles,
    css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--focsd-space-2);
      padding-inline-end: var(--focsd-space-4);
      font-size: var(--focsd-text-small-size);
      color: var(--focsd-ink-muted);
      counter-increment: focsd-step;
    }
    [part~='marker'] {
      display: inline-grid;
      place-items: center;
      inline-size: 1.75rem;
      block-size: 1.75rem;
      border: 2px solid var(--focsd-edge);
      border-radius: 50%;
      font-weight: var(--focsd-text-label-weight);
    }
    [part~='marker']::before { content: counter(focsd-step); }
    :host([status='complete']) { color: var(--focsd-ink); }
    :host([status='complete']) [part~='marker'] { border-color: var(--focsd-positive); color: var(--focsd-positive); }
    :host([status='complete']) [part~='marker']::before { content: '✓' / ''; }
    :host([status='current']) { color: var(--focsd-ink); font-weight: var(--focsd-text-label-weight); }
    :host([status='current']) [part~='marker'] {
      border-color: var(--focsd-action);
      background: var(--focsd-action);
      color: var(--focsd-on-action);
    }
    @media (forced-colors: active) { :host([status='current']) [part~='marker'] { border: 3px solid Highlight; } }
  `,
  ];
}

defineElement('focsd-step', FocsdStep);
