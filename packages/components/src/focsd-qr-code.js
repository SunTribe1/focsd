import { css } from 'lit';
import { FocsdQrCodeBase } from '@focsd-dev/primitives';
import { defineElement } from '@focsd-dev/primitives/internal';
import { hostStyles } from '@focsd-dev/primitives/styles/shared.js';

/**
 * QR code: draws a value as a scannable QR code, an image named by `label`. Dark themes draw a
 * light-on-dark (reversed) code, which some scanners refuse; set both colors for print or scanning.
 *
 * @cssprop --focsd-qr-code-ink - The color of the dark modules (default the theme's ink).
 * @cssprop --focsd-qr-code-surface - The color behind the code, quiet zone included (default the theme's surface).
 */
export class FocsdQrCode extends FocsdQrCodeBase {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdQrCodeBase.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }
      [part~='svg'] {
        display: block;
      }
      [part~='surface'] {
        fill: var(--focsd-qr-code-surface, var(--focsd-surface));
      }
      [part~='modules'] {
        fill: var(--focsd-qr-code-ink, var(--focsd-ink));
      }
      /* A QR code is functional imagery: keep it black on white so scanners read it
         (absolute colors on purpose; no theme token applies under forced colors). */
      @media (forced-colors: active) {
        [part~='svg'] {
          forced-color-adjust: none;
        }
        [part~='surface'] {
          fill: white;
        }
        [part~='modules'] {
          fill: black;
        }
      }
    `,
  ];
}

defineElement('focsd-qr-code', FocsdQrCode);
