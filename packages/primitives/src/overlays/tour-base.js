import { css, html, nothing } from 'lit';
import { FocsdElement } from '../internal/focsd-element.js';
import { deepActiveElement } from '../internal/focus.js';
import { uid } from '../internal/id.js';
import { place } from '../internal/place.js';
import { FOCUSABLE } from '../internal/popup.js';

/** @typedef {import('../internal/types.js').Placement} Placement */

/**
 * `detail` of `focsd-step-change` on a tour: the step now shown.
 * @typedef {{ step: number }} TourStepChangeDetail
 */

/**
 * One step of a tour.
 * @typedef {object} TourStep
 * @property {string | Element} target The element the step points at, or a CSS selector for it.
 * @property {string} title The step's heading.
 * @property {string} body The step's text.
 * @property {Placement} [placement] The side of the target the panel goes on (default `bottom`).
 */

/**
 * The first element in the page matching `selector`, or null (also for an invalid selector).
 * @param {string} selector
 */
function query(selector) {
  try {
    return selector ? document.querySelector(selector) : null;
  } catch {
    return null;
  }
}

/**
 * Whether a target is on the page and rendered.
 * @param {Element | null} el
 * @returns {el is HTMLElement}
 */
function isShown(el) {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;

  if (el.checkVisibility) return el.checkVisibility();
  const rect = el.getBoundingClientRect();

  return rect.width > 0 || rect.height > 0;
}

/**
 * The element a step points at, or null when it is not on the page or not rendered.
 * @param {TourStep | undefined} step
 * @returns {HTMLElement | null}
 */
function presentTarget(step) {
  const target = step?.target;
  const el = target instanceof Element ? target : query(String(target ?? ''));

  return isShown(el) ? el : null;
}

/**
 * Where focus returns when the tour ends: the given opener, else the focused element, else (WebKit
 * does not focus a clicked button) the focusable element the event being handled now came from.
 * @param {HTMLElement | undefined} given
 * @returns {HTMLElement | null}
 */
function openerFor(given) {
  if (given) return given;
  const active = deepActiveElement();

  if (active && active !== document.body) return active;
  const path = /** @type {Event | undefined} */ (globalThis.event)?.composedPath() ?? [];

  return /** @type {HTMLElement | undefined} */ (path.find((n) => n instanceof HTMLElement && n.matches(FOCUSABLE))) ?? null;
}

/** Attributes that can hide a target without removing it. */
const HIDING = ['hidden', 'style', 'class'];

/**
 * Tour: a guided walk through the page, one step at a time, each pointing at an element. Each step
 * shows a non-modal dialog (`aria-modal="false"`) next to its target, named by the step's title and
 * described by its body, with a spotlight around the target that never takes pointer events, so
 * the page stays usable. `start()` remembers the opener (the element passed, else the focused one);
 * each step moves focus to its heading, and the end of the tour returns focus to the opener. The
 * progress ("Step 1 of 3") counts the steps whose targets are on the page when the tour starts, and
 * its total stays fixed for the run; a step whose target appears later is shown without progress.
 * A step whose target is missing when reached is skipped, and the skip is announced by the step's
 * title ("Skipped “Filters”"), or by its position in `steps` when it has none. A target removed or
 * hidden while its step shows moves the tour on. Escape ends the tour unless `persistent` is set
 * or something in the page already handled it (a popup that closed cancels the key); an Escape the
 * page stops with `stopPropagation()` never reaches the tour, so it does not end it either. Skip
 * tour always ends it. Removing the tour from the page ends it (moving it keeps it going).
 * Opening with the `open` attribute or property has no opener in Safari, which does not focus a
 * clicked button: call `start(index, opener)` from the click instead.
 *
 * @fires {CustomEvent<TourStepChangeDetail>} focsd-step-change - Fired when the shown step changes. `detail.step` is its index.
 * @fires {Event} close - Fired when the tour ends. Read `completed` to tell finishing from dismissing.
 * @csspart panel - The step's dialog.
 * @csspart progress - The "Step n of m" line.
 * @csspart title - The step's heading.
 * @csspart body - The step's text.
 * @csspart actions - The row of buttons.
 * @csspart back - The Back button.
 * @csspart next - The Next (or Finish, on the last step) button.
 * @csspart skip - The Skip tour button.
 * @csspart spotlight - The box drawn around the target, dimming the rest of the page.
 */
export class FocsdTourBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    steps: { attribute: false },
    open: { type: Boolean, reflect: true },
    step: { type: Number },
    persistent: { type: Boolean },
  };

  /** @override @type {import('lit').CSSResultGroup} */
  static styles = [
    FocsdElement.styles,
    css`
      [part~='spotlight'] {
        position: fixed;
        /* physical: the spotlight is placed with viewport x/y coordinates, which do not flip */
        inset: 0 auto auto 0;
        margin: 0;
        padding: 0;
        border: 0;
        background: none;
        overflow: visible;
        pointer-events: none;
      }
      [part~='panel'] {
        position: fixed;
        inset: auto;
        margin: 0;
      }
    `,
  ];

  #ids = { title: uid('focsd-tour-title'), body: uid('focsd-tour-body') };
  #completed = false;
  /** Whether a run is going on (`open` follows it; setting `open` starts or ends one). */
  #active = false;
  /** The index of the step on screen, or -1. */
  #shown = -1;
  /** Indices of the steps counted in the progress, fixed at `start()`. @type {number[]} */
  #counted = [];
  /** @type {HTMLElement | null} */
  #opener = null;
  /** @type {HTMLElement | null} */
  #target = null;
  #frame = 0;
  /** The pending frame that writes a skip message. */
  #announceFrame = 0;
  /** Created on the first step shown (there is no MutationObserver on the server). @type {MutationObserver | null} */
  #observer = null;

  constructor() {
    super();
    /** @type {TourStep[]} The steps, in order. */
    this.steps = [];
    /** Whether the tour is showing. Setting it starts the tour at `step` or ends it (not completed). */
    this.open = false;
    /** The index in `steps` of the shown step. Setting it while open shows that step (or the next one on the page). */
    this.step = 0;
    /** Stops Escape from ending the tour; Skip tour still ends it. */
    this.persistent = false;
  }

  /** Read-only: true once the last run ended with Finish, false after it was skipped or dismissed. */
  get completed() {
    return this.#completed;
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();

    // Moved within the page: removal hid the popovers, so show the step again.
    if (this.#active) this.#go(this.#shown, 1, () => this.end(false));
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    // A move reconnects within the same task; only a real removal ends the tour.
    queueMicrotask(() => {
      if (!this.isConnected) this.end(false);
    });
  }

  /**
   * `open` and `step` set from outside start, end or move the tour. Before the render, so the
   * properties this changes go into the same update.
   * @param {import('lit').PropertyValues<this>} changed
   * @override
   */
  willUpdate(changed) {
    if (changed.has('open') && this.open !== this.#active) {
      if (this.open) this.start(this.step);
      else this.end(false);
    }

    if (changed.has('step') && this.#active && this.step !== this.#shown) this.#go(this.step, 1, () => (this.step = this.#shown));
  }

  /**
   * Start the tour at step `index`, or the first step after it whose target is on the page
   * (announcing the ones skipped). Does nothing when no such step exists.
   * @param {number} [index]
   * @param {HTMLElement} [opener] where focus returns at the end (default: the focused element)
   */
  start(index = 0, opener = undefined) {
    const counted = this.steps.flatMap((s, i) => (presentTarget(s) ? [i] : []));

    if (!counted.some((i) => i >= index)) {
      this.open = this.#active;

      return;
    }

    if (!this.#active) this.#opener = openerFor(opener);
    this.#counted = counted;
    this.#completed = false;
    this.#active = true;
    this.open = true;
    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('scroll', this.#onViewport, { capture: true, passive: true });
    globalThis.addEventListener('resize', this.#onViewport);
    this.#go(index, 1, () => {});
  }

  /** Show the next step whose target is on the page, announcing skipped ones; on the last step, finish. */
  next() {
    this.#go(this.#shown + 1, 1, () => this.end(true));
  }

  /** Show the previous step whose target is on the page, announcing skipped ones. */
  back() {
    this.#go(this.#shown - 1, -1, () => {});
  }

  /**
   * End the tour: hide it, return focus to the opener, then fire `close`.
   * @param {boolean} [completed] whether the reader finished it (sets `completed`)
   */
  end(completed = false) {
    if (!this.#active) return;
    this.#active = false;
    this.#shown = -1;
    this.#stopWatching();

    for (const part of ['panel', 'spotlight']) {
      const el = this.#part(part);

      if (el?.matches(':popover-open')) el.hidePopover();
    }

    this.open = false;
    this.#completed = completed;
    const opener = this.#opener;

    this.#opener = null;

    // No focus move while the page is hidden or unloading.
    if (opener?.isConnected && document.visibilityState === 'visible') opener.focus();
    this.dispatchEvent(new Event('close'));
  }

  /**
   * @param {string} name
   * @returns {HTMLElement | null}
   */
  #part(name) {
    return this.renderRoot?.querySelector(`[part~="${name}"]`) ?? null;
  }

  /**
   * The first index from `from` (included) in direction `dir` whose target is on the page, or -1.
   * @param {number} from
   * @param {number} dir
   */
  #find(from, dir) {
    for (let i = from; i >= 0 && i < this.steps.length; i += dir) if (presentTarget(this.steps[i])) return i;

    return -1;
  }

  /**
   * Show the first step on the page from `from` in direction `dir`, announcing the ones skipped.
   * @param {number} from
   * @param {number} dir
   * @param {() => void} none what to do when there is no such step
   */
  #go(from, dir, none) {
    if (!this.#active) return;
    const to = this.#find(from, dir);

    if (to < 0) {
      none();

      return;
    }

    const skipped = [];

    for (let i = from; i !== to; i += dir) skipped.push(this.#skipped(i));

    if (skipped.length) this.#announce(skipped.join(' '));
    void this.#show(to);
  }

  /**
   * The announcement for a skipped step: by its title, or by its number when it has none.
   * @param {number} index
   */
  #skipped(index) {
    const title = this.steps[index]?.title;

    return title ? this.localize.term('stepSkippedTitled', title) : this.localize.term('stepSkipped', index + 1);
  }

  /** @param {string} message */
  #announce(message) {
    const region = this.renderRoot?.querySelector('[role="status"]');

    if (!region) return;
    region.textContent = '';
    cancelAnimationFrame(this.#announceFrame);
    this.#announceFrame = requestAnimationFrame(() => {
      region.textContent = message;
    });
  }

  /** @param {number} index */
  async #show(index) {
    this.#release();
    const target = /** @type {HTMLElement} */ (presentTarget(this.steps[index]));

    this.#shown = index;
    this.step = index;
    // `step` may already equal index (set from outside): the panel renders from #shown.
    this.requestUpdate();
    this.#target = target;
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    target.scrollIntoView({ block: 'center', behavior: reduce ? 'instant' : 'smooth' });
    this.#observer ??= new MutationObserver(() => this.#onMutation());
    this.#observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: HIDING });
    await this.updateComplete;

    // Ended (or moved to another step) while rendering: no reveal and no step change after `close`.
    if (!this.#active || this.#shown !== index) return;
    this.#reveal();
    /** @type {TourStepChangeDetail} */
    const detail = { step: index };

    this.dispatchEvent(new CustomEvent('focsd-step-change', { bubbles: true, detail }));
  }

  /** Open the spotlight and panel (in that order, so the panel sits above), place them and focus the heading. */
  #reveal() {
    const panel = this.#part('panel');
    const spotlight = this.#part('spotlight');

    if (!panel || !spotlight || !this.#active) return;

    if (!spotlight.matches(':popover-open')) spotlight.showPopover();

    if (!panel.matches(':popover-open')) panel.showPopover();
    this.#place();
    this.#part('title')?.focus();
  }

  /**
   * Move the spotlight onto the target and the panel next to it. CSS anchor names are tree-scoped,
   * so the panel in this shadow root cannot anchor to a target in the page; it is placed by script.
   */
  #place() {
    const target = this.#target;
    const panel = this.#part('panel');
    const spotlight = this.#part('spotlight');

    if (!target || !panel || !spotlight) return;
    const rect = target.getBoundingClientRect();

    spotlight.style.setProperty('inline-size', `${rect.width}px`);
    spotlight.style.setProperty('block-size', `${rect.height}px`);
    spotlight.style.setProperty('transform', `translate(${rect.left}px, ${rect.top}px)`);
    const { clientWidth: width, clientHeight: height } = document.documentElement;
    const rtl = getComputedStyle(target).direction === 'rtl';
    const pos = place(rect, panel.getBoundingClientRect(), { width, height, rtl }, this.steps[this.#shown]?.placement);

    panel.style.setProperty('top', `${pos.top}px`);
    panel.style.setProperty('left', `${pos.left}px`);
  }

  #onViewport = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#place());
  };

  /** The shown target left the page or was hidden: move on (ending, not completed, after the last). */
  #onMutation() {
    if (this.#active && this.#target && !isShown(this.#target)) this.#go(this.#shown + 1, 1, () => this.end(false));
  }

  /**
   * Bubble phase, after anything inside the page: an Escape a popup already handled (and canceled)
   * closes only that popup.
   * @param {KeyboardEvent} event
   */
  #onKeyDown = (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !this.#active || this.persistent) return;
    event.preventDefault();
    this.end(false);
  };

  /** Stop watching the shown target. */
  #release() {
    this.#observer?.disconnect();
    this.#target = null;
  }

  #stopWatching() {
    this.#release();
    cancelAnimationFrame(this.#frame);
    cancelAnimationFrame(this.#announceFrame);
    document.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('scroll', this.#onViewport, true);
    globalThis.removeEventListener('resize', this.#onViewport);
  }

  #renderPanel() {
    const step = this.steps[this.#shown];
    const n = this.#counted.indexOf(this.#shown) + 1;
    const last = this.#find(this.#shown + 1, 1) < 0;

    return html`<div
      part="panel"
      popover="manual"
      role="dialog"
      aria-modal="false"
      aria-labelledby=${this.#ids.title}
      aria-describedby=${this.#ids.body}
    >
      <p part="progress">${n ? this.localize.term('stepOf', n, this.#counted.length) : nothing}</p>
      <h2 part="title" id=${this.#ids.title} tabindex="-1">${step?.title ?? ''}</h2>
      <div part="body" id=${this.#ids.body}>${step?.body ?? ''}</div>
      <div part="actions">
        <button part="back" type="button" ?hidden=${this.#find(this.#shown - 1, -1) < 0} @click=${this.back}>${this.localize.term('back')}</button>
        <button part="next" type="button" @click=${this.next}>${this.localize.term(last ? 'finish' : 'next')}</button>
        <button part="skip" type="button" @click=${() => this.end(false)}>${this.localize.term('skipTour')}</button>
      </div>
    </div>`;
  }

  /** @override */
  render() {
    return html`<div part="spotlight" popover="manual" aria-hidden="true"></div>
      ${this.#renderPanel()}
      <span role="status" class="focsd-visually-hidden"></span>`;
  }
}
