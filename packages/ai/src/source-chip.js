import { css, html, nothing } from 'lit';
import { FocsdElement } from '@focsd/primitives';
import { defineElement } from '@focsd/primitives/internal';
import { hostStyles } from '@focsd/primitives/styles/shared.js';
import { safeHref } from './markdown/index.js';

const REL = 'noopener noreferrer nofollow';

/**
 * The host name of an absolute http(s) URL, or '' for relative, mailto and fragment URLs.
 * @param {string} href
 */
function hostOf(href) {
  if (!/^https?:/i.test(href)) return '';

  try {
    return new URL(href).hostname;
  } catch {
    return '';
  }
}

/**
 * Source chip: a numbered link to a source the answer used, "[n] title", with the host name in
 * muted text. Only `https:`, `http:`, `mailto:`, `/…` and `#…` URLs become links (the markdown
 * link rule); anything else renders as plain text.
 *
 * @csspart link - The link (a plain span when the URL is not allowed).
 * @csspart index - The "[n]" number.
 * @csspart host - The host name.
 */
export class FocsdSourceChip extends FocsdElement {
  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    hostStyles,
    css`
      :host {
        display: inline-block;
        max-inline-size: 100%;
        font-size: var(--focsd-text-small-size);
      }
      [part~='link'] {
        display: inline-flex;
        gap: var(--focsd-space-1);
        align-items: baseline;
        max-inline-size: 100%;
        min-block-size: 24px;
        color: var(--focsd-link-color, var(--focsd-route));
        text-decoration: underline;
        text-underline-offset: 0.15em;
        overflow-wrap: anywhere;
      }
      span[part~='link'] {
        color: var(--focsd-ink);
        text-decoration: none;
      }
      [part~='index'] {
        font-variant-numeric: tabular-nums;
      }
      [part~='host'] {
        color: var(--focsd-ink-muted);
      }
    `,
  ];

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { href: {}, label: {}, index: { type: Number } };

  constructor() {
    super();
    /** The source URL. */
    this.href = '';
    /** The source title; defaults to the host name, then the URL. */
    this.label = '';
    /** The source number shown as "[n]"; 0 shows none. */
    this.index = 0;
  }

  /** @override */
  render() {
    const href = safeHref(this.href ?? '');
    const host = hostOf(href ?? '');
    const title = this.label || host || this.href;

    const content = html`${this.index > 0 ? html`<span part="index">[${this.index}]</span> ` : nothing}<span>${title}</span>${
      host && host !== title ? html` <span part="host">${host}</span>` : nothing
    }`;

    return href === null ? html`<span part="link">${content}</span>` : html`<a part="link" href=${href} rel=${REL}>${content}</a>`;
  }
}

defineElement('focsd-source-chip', FocsdSourceChip);
