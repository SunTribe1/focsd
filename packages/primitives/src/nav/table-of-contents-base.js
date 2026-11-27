import { html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { slugify } from '../internal/slug.js';

/** @typedef {{ id: string, text: string, level: number, children: TocNode[] }} TocNode */
/** @typedef {TocNode[]} TocTree */
/** @typedef {HTMLAnchorElement[]} TocLinks */

const IN_VIEW = { rootMargin: '0px 0px -50% 0px' };

/** How long a followed link stays current without a `scrollend` event. */
const LOCK_MS = 'onscrollend' in globalThis ? 3000 : 1000;

/** @param {Element} heading */
const textOf = (heading) => heading.textContent?.replaceAll(/\s+/g, ' ').trim() ?? '';

/** The page's own scroller. */
const page = () => document.scrollingElement ?? document.documentElement;

/**
 * Whether a scroller is scrolled to its end (and has scrolled at all).
 * @param {Element} el
 */
const atBottom = (el) => el.scrollTop > 0 && el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

/**
 * The element that scrolls a heading: its nearest flat-tree ancestor with `overflow` auto or
 * scroll (such as focsd-app-shell's main), else the page.
 * @param {Element | undefined} node
 */
function scrollerOf(node) {
  for (let el = node; el && el !== document.body;) {
    el = /** @type {Element | undefined} */ (el.assignedSlot || el.parentElement || /** @type {ShadowRoot} */ (el.getRootNode()).host);

    if (el && /auto|scroll/.test(getComputedStyle(el).overflowY)) return el;
  }

  return page();
}

/** @param {Element} link */
const targetId = (link) => {
  try {
    return decodeURIComponent(link.getAttribute('href')?.slice(1) ?? '');
  } catch {
    return '';
  }
};

/**
 * Nest each heading under the nearest heading before it with a lower level.
 *
 * @param {HTMLElement[]} headings
 * @returns {TocNode[]}
 */
function nest(headings) {
  /** @type {TocNode[]} */
  const top = [];
  /** @type {TocNode[]} */
  const open = [];

  for (const heading of headings) {
    const node = {
      id: heading.id,
      text: textOf(heading),
      level: Number(heading.localName[1]),
      children: [],
    };

    while (open.length && /** @type {TocNode} */ (open.at(-1)).level >= node.level) open.pop();
    (open.at(-1)?.children ?? top).push(node);
    open.push(node);
  }

  return top;
}

/**
 * Table of contents: a navigation list of links to the headings of a region, marking the section
 * in view as the current location.
 *
 * It lists the `h2`…`h6` headings (the levels in `levels`) of the first element matching `for`,
 * nesting each under the heading before it with a lower level, and gives a heading without an `id`
 * one made from its text. Only headings in the light DOM are listed, never those inside another
 * element's shadow root. The list is rebuilt when headings are added, removed, renamed or the region
 * is replaced; other changes on the page leave it alone.
 *
 * The current link has `aria-current="location"`: the first heading in the top half of the
 * viewport, else the last heading above it, and the last heading once the page, or the element
 * that scrolls the headings (such as focsd-app-shell's main), is scrolled to the end. Following a link scrolls to the heading, moves focus to it, adds its `#id` to the address
 * and keeps that link current until the scroll ends. With a sticky header, give the headings a
 * `scroll-margin-top` so they do not land under it. When a page has two tables of contents, give
 * each a different `label`.
 *
 * @slot - Optional links (`a[href^="#"]`) that replace the generated list; their targets are tracked.
 * @csspart nav - The navigation landmark.
 * @csspart list - Each list of links; a nested list is inside the item of its parent heading.
 * @csspart link - Each generated link.
 */
export class FocsdTableOfContentsBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = { for: {}, levels: {}, label: {}, _tree: { state: true }, _current: { state: true }, _links: { state: true } };

  /** @type {HTMLElement[]} */
  #headings = [];
  #signature = '';
  /** @type {Set<Element>} */
  #visible = new Set();
  /** Rebuilds on changes anywhere in the body, so a replaced region is found again. */
  #mutations = /** @type {MutationObserver | undefined} */ (undefined);
  /** Re-reads the slotted links when they change. */
  #slotted = /** @type {MutationObserver | undefined} */ (undefined);
  #intersections = /** @type {IntersectionObserver | undefined} */ (undefined);
  #slot = /** @type {HTMLSlotElement | null} */ (null);
  #frame = 0;
  /** The followed link's heading, current until the scroll ends. */
  #lock = /** @type {HTMLElement | null} */ (null);
  #timer = 0;
  #bottom = false;
  /** The element that scrolls the headings: the page, or a region such as focsd-app-shell's main. */
  #scroller = /** @type {Element | null} */ (null);
  #unlock = () => {
    clearTimeout(this.#timer);
    this.#lock = null;
    this.#pick();
  };

  #onScroll = () => {
    if (atBottom(this.#scroller ?? page()) !== this.#bottom) this.#pick();
  };

  #onScrollEnd = () => {
    if (this.#lock) this.#unlock();
  };

  /**
   * Listen to the scroller's `scroll` and `scrollend` (the page's fire on the document), or stop.
   * Scroll events do not leave a shadow root, so a scroller such as an app shell's main is listened
   * to directly.
   * @param {Element | null} scroller
   */
  #listen(scroller) {
    const old = this.#scroller === page() ? document : this.#scroller;

    old?.removeEventListener('scroll', this.#onScroll);
    old?.removeEventListener('scrollend', this.#onScrollEnd);
    this.#scroller = scroller;
    const target = scroller === page() ? document : scroller;

    target?.addEventListener('scroll', this.#onScroll, { passive: true });
    target?.addEventListener('scrollend', this.#onScrollEnd);
  }

  constructor() {
    super();
    /** Selector of the region whose headings are listed; the first match is used, else the body. */
    this.for = 'main, focsd-app-shell';
    /** Comma-separated heading levels to list, from 2 to 6, such as `2,3`. */
    this.levels = '2,3';
    /** Accessible name of the navigation; defaults to "On this page". Set it when a page has two. */
    this.label = '';
    /** @internal */
    this._tree = /** @type {TocTree} */ ([]);
    /** @internal */
    this._current = '';
    /** @internal */
    this._links = /** @type {TocLinks} */ ([]);
    this.addEventListener('click', (event) => this.#onClick(event));
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#mutations ??= new MutationObserver(() => {
      cancelAnimationFrame(this.#frame);
      this.#frame = requestAnimationFrame(() => this.#scan());
    });
    this.#mutations.observe(document.body ?? document.documentElement, { childList: true, subtree: true, characterData: true });

    if (this.#slot) this.#observeSlot();
    else this.#scan(true);
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#mutations?.disconnect();
    this.#slotted?.disconnect();
    this.#intersections?.disconnect();
    this.#intersections = undefined;
    this.#headings = [];
    this.#listen(null);
    cancelAnimationFrame(this.#frame);
    this.#unlock();
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    if (this.hasUpdated && (changed.has('for') || changed.has('levels'))) this.#scan(true);
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    if (!changed.has('_current') && !changed.has('_links')) return;

    for (const link of this._links) {
      if (targetId(link) === this._current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  /** The region to list, resolved again on every scan. */
  #root() {
    try {
      return document.querySelector(this.for) ?? document.body;
    } catch {
      return document.body;
    }
  }

  /** The headings to track (or the slotted links' targets), each with an id. */
  #collect() {
    const levels = String(this.levels).match(/[2-6]/g) ?? ['2', '3'];

    const root = this.#root();
    // In an app shell only the main content counts, not the header, sidebar and footer slots.
    const slotted = root.localName === 'focsd-app-shell' ? [...root.children].filter((el) => el.slot) : [];

    const found = this._links.length
      ? this._links.map((link) => document.getElementById(targetId(link)))
      : [...root.querySelectorAll(levels.map((n) => `h${n}`).join())].filter(
          (h) => !this.contains(h) && !slotted.some((el) => el.contains(h)),
        );

    const headings = /** @type {HTMLElement[]} */ (found.filter((h) => h instanceof HTMLElement));

    if (headings.some((h) => !h.id)) {
      const taken = new Set([...document.querySelectorAll('[id]')].map((el) => el.id));

      for (const heading of headings) if (!heading.id) heading.id = slugify(textOf(heading), taken);
    }

    return headings;
  }

  /**
   * Rebuild the list when the headings' ids, levels or text changed, and the observer only when the
   * heading elements themselves changed.
   */
  #scan(force = false) {
    const headings = this.#collect();
    const moved = force || headings.length !== this.#headings.length || headings.some((h, i) => h !== this.#headings[i]);
    const signature = headings.map((h) => `${h.id}\u0000${h.localName}\u0000${textOf(h)}`).join('\n');

    if (!moved && signature === this.#signature) return;
    this.#signature = signature;
    this._tree = this._links.length ? [] : nest(headings);

    if (moved) this.#track(headings);
    else this.#pick();
  }

  /** @param {HTMLElement[]} headings */
  #track(headings) {
    this.#headings = headings;
    this.#intersections?.disconnect();
    this.#visible = new Set();
    this.#intersections = new IntersectionObserver((entries) => this.#onIntersect(entries), IN_VIEW);

    for (const heading of headings) this.#intersections.observe(heading);
    this.#pick();
  }

  /** @param {IntersectionObserverEntry[]} entries */
  #onIntersect(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) this.#visible.add(entry.target);
      else this.#visible.delete(entry.target);
    }

    this.#pick();
  }

  /** The last heading at the end of the page, else the first in the top half, else the last above it. */
  #pick() {
    // Found again each time: a shell around the headings may render after they are tracked.
    const scroller = this.isConnected ? scrollerOf(this.#headings[0]) : null;

    if (scroller !== this.#scroller) this.#listen(scroller);

    if (!scroller) return;

    this.#bottom = atBottom(scroller);

    if (this.#lock) return;
    const headings = this.#headings;
    const top = scroller === page() ? 0 : scroller.getBoundingClientRect().top;

    const current =
      (this.#bottom ? headings.at(-1) : undefined) ??
      headings.find((h) => this.#visible.has(h)) ??
      headings.findLast((h) => h.getBoundingClientRect().top < top) ??
      headings[0];

    this._current = current?.id ?? '';
  }

  /** @param {Event} event */
  #onSlotChange(event) {
    this.#slot = /** @type {HTMLSlotElement} */ (event.target);
    this.#observeSlot();
  }

  /** Watch the slotted links (again after a reconnect, which fires no `slotchange`) and read them. */
  #observeSlot() {
    this.#slotted?.disconnect();
    this.#slotted ??= new MutationObserver(() => this.#readLinks());

    for (const el of this.#slot?.assignedElements({ flatten: true }) ?? []) {
      this.#slotted.observe(el, { childList: true, subtree: true, attributeFilter: ['href'] });
    }

    this.#readLinks();
  }

  #readLinks() {
    const assigned = this.#slot?.assignedElements({ flatten: true }) ?? [];

    const links = /** @type {HTMLAnchorElement[]} */ (
      assigned
        .flatMap((el) => [el, ...el.querySelectorAll('a')])
        .filter((el) => el instanceof HTMLAnchorElement && el.getAttribute('href')?.startsWith('#'))
    );

    for (const link of this._links) if (!links.includes(link)) link.removeAttribute('aria-current');
    this._links = links;
    this.#scan(true);
  }

  /** @param {MouseEvent} event */
  #onClick(event) {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.composedPath().find((node) => node instanceof HTMLAnchorElement);
    const id = link ? targetId(link) : '';
    const heading = id ? document.getElementById(id) : null;

    if (!heading) return;
    event.preventDefault();
    this.#unlock();
    this.#lock = heading;
    this._current = id;
    this.#timer = setTimeout(this.#unlock, LOCK_MS);
    const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    heading.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });

    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    history.pushState(null, '', `#${encodeURIComponent(id)}`);
  }

  /**
   * @param {TocNode[]} nodes
   * @returns {import('lit').TemplateResult}
   */
  #list(nodes) {
    return html`<ul part="list">
      ${nodes.map(
        /** @returns {import('lit').TemplateResult} */
        (node) =>
          html`<li>
            <a part="link" href="#${encodeURIComponent(node.id)}" aria-current=${node.id === this._current ? 'location' : nothing}
              >${node.text}</a
            >${node.children.length ? this.#list(node.children) : nothing}
          </li>`,
      )}
    </ul>`;
  }

  /** @override */
  render() {
    return html`<nav part="nav" aria-label=${this.label || this.localize.term('onThisPage')}>
      <slot @slotchange=${this.#onSlotChange}></slot>${this._tree.length ? this.#list(this._tree) : nothing}
    </nav>`;
  }
}
