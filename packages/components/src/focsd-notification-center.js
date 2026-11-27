import { css } from 'lit';
import { FocsdNotificationCenterBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';
import { floatingSurface } from '@focsd-dev/primitives/styles/surface.js';
import { enterMotion } from '@focsd-dev/primitives/styles/motion.js';
import './focsd-icon-button.js';
import './focsd-relative-time.js';
import './focsd-notification.js';

/**
 * Notification center: a bell button with the unread count that opens a panel of the app's
 * notifications. The app owns the data: set `notifications` or write `focsd-notification` children,
 * and update them on `focsd-read` and `focsd-dismiss`.
 *
 * @cssprop --focsd-notification-center-inline-size - Width of the panel (default 24rem, never wider than the screen).
 */
export class FocsdNotificationCenter extends FocsdNotificationCenterBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdNotificationCenterBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
        /* 44 px targets (2.75rem) for "Mark all as read" and each Dismiss: they sit close together on touch screens.
           The bell is a button like any other, so it takes the control height and lines up with them. */
        --_target: 2.75rem;
      }
      [part~='trigger'] {
        position: relative;
        anchor-name: --_notifications-anchor;
      }
      [part~='icon'] {
        inline-size: 1em;
        block-size: 1em;
      }
      /* The count: ink on the critical tint with a critical edge, as the badge indicator (U3). */
      [part~='badge'] {
        position: absolute;
        inset-block-start: 0.125rem;
        inset-inline-end: 0.125rem;
        box-sizing: border-box;
        min-inline-size: 1rem;
        block-size: 1rem;
        padding-inline: 0.1875rem;
        border: var(--focsd-border-width) solid var(--focsd-critical);
        border-radius: 999px;
        background: var(--focsd-critical-tint);
        color: var(--focsd-ink);
        font-size: 0.6875rem;
        font-weight: var(--focsd-text-label-weight);
        font-variant-numeric: tabular-nums;
        line-height: calc(1rem - 2 * var(--focsd-border-width));
        text-align: center;
        pointer-events: none;
      }
      [part~='panel'] {
        ${floatingSurface}
        position-anchor: --_notifications-anchor;
        position-area: block-end span-inline-start;
        position-try-fallbacks: flip-block, flip-inline;
        inset: auto;
        margin-block: var(--focsd-space-2);
        inline-size: min(var(--focsd-notification-center-inline-size, 24rem), 100vw - 2 * var(--focsd-space-4));
        max-block-size: min(32rem, 100vh - 2 * var(--focsd-space-4));
        overflow: auto;
        overscroll-behavior: contain;
        padding: 0;
      }
      [part~='panel']:popover-open {
        display: block;
      }
      .head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--focsd-space-2);
        padding-block: var(--focsd-space-2);
        padding-inline: var(--focsd-space-4) var(--focsd-space-2);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
      }
      [part~='heading'] {
        margin: 0;
        font-size: var(--focsd-text-label-size);
        font-weight: var(--focsd-text-heading-weight);
        line-height: var(--focsd-text-label-line-height);
      }
      [part~='mark-all'],
      [part~='dismiss'] {
        min-block-size: var(--_target);
        min-inline-size: var(--_target);
        padding-inline: var(--focsd-space-2);
        border: 0;
        border-radius: var(--focsd-radius-control);
        background: transparent;
        color: var(--focsd-route);
        font: inherit;
        font-size: var(--focsd-text-small-size);
        cursor: pointer;
      }
      [part~='dismiss'] {
        grid-area: dismiss;
        align-self: start;
        color: var(--focsd-ink);
      }
      [part~='mark-all']:hover,
      [part~='dismiss']:hover {
        background: var(--focsd-surface-sunk);
      }
      [part~='list'] {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      [part~='item'] {
        display: grid;
        grid-template: 'dot title dismiss' auto 'dot body dismiss' auto 'dot time dismiss' auto / var(--focsd-space-3) 1fr auto;
        column-gap: var(--focsd-space-2);
        padding-block: var(--focsd-space-3);
        padding-inline: var(--focsd-space-3) var(--focsd-space-2);
        border-block-end: var(--focsd-border-width) solid var(--focsd-edge-quiet);
        font-size: var(--focsd-text-small-size);
        line-height: var(--focsd-text-small-line-height);
      }
      [part~='item']:last-child {
        border-block-end: 0;
      }
      [part~='item'][data-tone='critical'] {
        box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-critical);
      }
      [part~='item'][data-tone='caution'] {
        box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-caution);
      }
      [part~='item'][data-tone='positive'] {
        box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-positive);
      }
      [part~='item'][data-tone='info'] {
        box-shadow: inset var(--_inline-bar) 0 0 var(--focsd-info);
      }
      /* Unread: a filled dot (a shape, drawn as a border so forced colors keep it) and a bolder title. */
      [part~='dot'] {
        grid-area: dot;
        align-self: start;
        box-sizing: border-box;
        inline-size: 0.5rem;
        block-size: 0.5rem;
        margin-block-start: 0.4em;
        border: 0.25rem solid var(--focsd-route);
        border-radius: 50%;
      }
      [part~='title'],
      [part~='body'] {
        margin: 0;
        overflow-wrap: anywhere;
      }
      [part~='title'] {
        grid-area: title;
        font-size: var(--focsd-text-body-size);
      }
      [part~='item-unread'] [part~='title'] {
        font-weight: var(--focsd-text-heading-weight);
      }
      [part~='tone'] {
        display: inline-block;
        vertical-align: -0.125em;
        margin-inline-end: var(--focsd-space-1);
      }
      [part~='title'] a {
        color: var(--focsd-route);
      }
      [part~='body'] {
        grid-area: body;
      }
      [part~='time'] {
        grid-area: time;
        color: var(--focsd-ink-muted);
      }
      [part~='empty'] {
        margin: 0;
        padding: var(--focsd-space-6) var(--focsd-space-4);
        color: var(--focsd-ink-muted);
        text-align: center;
      }
      /* On a narrow screen the panel spans the screen's width at its block end, like a sheet. */
      @media (max-width: 480px) {
        [part~='panel'] {
          position: fixed;
          inset: auto var(--focsd-space-2) var(--focsd-space-2);
          inline-size: auto;
          max-block-size: 80vh;
          margin: 0;
        }
      }
      @media (forced-colors: active) {
        [part~='badge'],
        [part~='dot'] {
          border-color: CanvasText;
        }
      }
    `,
    enterMotion("[part~='panel']:popover-open"),
  ];
}

defineElement('focsd-notification-center', FocsdNotificationCenter);
