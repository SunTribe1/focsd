import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { routeLinks } from '../internal/links.js';
import { iconSvg } from '../internal/icons.js';

/**
 * A link: native <a> in the shadow root. `external` opens a new tab and says so.
 *
 * @slot - Default content.
 * @csspart link - The link element.
 */
export class FocsdLinkBase extends FocsdElement {
  /** @override */
  static shadowRootOptions = { ...FocsdElement.shadowRootOptions, delegatesFocus: true };

  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    href: {},
    external: { type: Boolean, reflect: true },
    target: {},
    rel: {},
    download: {},
    hreflang: {},
    type: {},
    referrerPolicy: { attribute: 'referrerpolicy' },
    ping: {},
  };

  constructor() {
    super();
    // Plain same-origin link clicks go to the app's link handler (setLinkHandler), if any.
    routeLinks(this);
    /** The link's URL. */
    this.href = '';
    /** Opens the link in a new tab, says so to assistive technology, and adds `noopener noreferrer`. */
    this.external = false;
    /** Where to open the link, as on `<a target>`. */
    this.target = '';
    /** The link relations, as on `<a rel>`; `noopener` is added for new tabs. */
    this.rel = '';
    /** @type {string | null} Downloads the URL instead of opening it; the value is the file name, as on `<a download>`. */
    this.download = null;
    /** The language of the linked page, as on `<a hreflang>`. */
    this.hreflang = '';
    /** The MIME type of the linked resource, as on `<a type>`. */
    this.type = '';
    /** The referrer policy, as on `<a referrerpolicy>`. */
    this.referrerPolicy = '';
    /** Space-separated URLs pinged when the link is followed, as on `<a ping>`. */
    this.ping = '';
  }

  get #target() {
    return this.target || (this.external ? '_blank' : '');
  }

  /** `rel` with `noopener` added for new-tab links (and `noreferrer` for `external`). */
  get #rel() {
    const tokens = new Set((this.rel ?? '').split(/\s+/).filter(Boolean));

    if (this.#target === '_blank') tokens.add('noopener');

    if (this.external) tokens.add('noreferrer');

    return [...tokens].join(' ');
  }

  /** @override */
  render() {
    const newTab = this.#target === '_blank';

    return html`<a
      part="link"
      href=${this.href || nothing}
      target=${this.#target || nothing}
      rel=${this.#rel || nothing}
      download=${this.download ?? nothing}
      hreflang=${this.hreflang || nothing}
      type=${this.type || nothing}
      referrerpolicy=${this.referrerPolicy || nothing}
      ping=${this.ping || nothing}
      ><slot></slot>${newTab ? html`<span class="focsd-visually-hidden"> ${this.localize.term('opensInNewTab')}</span>` : nothing}${
        this.external ? iconSvg('external', 'icon') : nothing
      }</a
    >`;
  }
}
