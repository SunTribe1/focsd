import { html, nothing } from 'lit';
import { html as staticHtml, unsafeStatic } from 'lit/static-html.js';
import { repeat } from 'lit/directives/repeat.js';
import { FocsdElement } from '../internal/focsd-element.js';
import { iconSvg } from '../internal/icons.js';
import { announce } from '../internal/announce.js';
import { deepActiveElement } from '../internal/focus.js';
import { routeLinks } from '../internal/links.js';
import { uid } from '../internal/id.js';
import { FOCUSABLE, TriggerToggle, focusWithin, setTriggerState } from '../internal/popup.js';
import { ArrivalAnnouncer, badgeText, cleanNotifications, isoTime, unreadIds } from './notification-model.js';

/** @typedef {import('./notification-model.js').NotificationData} NotificationData */
/** @typedef {{ ids: string[] }} NotificationReadDetail */
/** @typedef {{ id: string }} NotificationDismissDetail */

/** The attributes a slotted notification is read from. */
const ITEM_ATTRIBUTES = ['id', 'title', 'body', 'time', 'read', 'href', 'tone'];

/** The "bell" icon, drawn inline: the default icon set has no bell. From Lucide icons, ISC License, Copyright (c) 2026 Lucide Icons and Contributors (some derived from Feather, MIT, Copyright (c) 2013-present Cole Bemis); full text in LICENSE-lucide.txt in this package. */
const BELL = html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" part="icon"><path d="M10.268 21a2 2 0 0 0 3.464 0M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path></svg>`;

/** The tones that say so with a shape and a word: the icon, and the term read before the title. */
const TONES = /** @type {const} */ ({
  critical: { icon: 'alert-circle', term: 'messageError' },
  caution: { icon: 'alert-triangle', term: 'messageWarning' },
  positive: { icon: 'check', term: 'messageSuccess' },
});

/**
 * @param {Element} el A slotted notification.
 * @returns {NotificationData}
 */
const fromElement = (el) => ({
  id: el.id,
  title: el.getAttribute('title') ?? '',
  body: el.getAttribute('body') ?? '',
  time: el.getAttribute('time') ?? '',
  read: el.hasAttribute('read'),
  href: el.getAttribute('href') ?? '',
  tone: /** @type {any} */ (el.getAttribute('tone') ?? 'neutral'),
});

/**
 * Notification center: a bell button named with the unread count ("Notifications, 3 unread") that
 * opens a non-modal dialog listing the app's notifications, with "Mark all as read" and a Dismiss
 * button on each. The app owns the data (owner ruling 75): set `notifications`, or write
 * `focsd-notification` children (used while the array is empty); the center only fires `focsd-read`
 * and `focsd-dismiss`, and the app updates the data. New unread notifications are announced politely,
 * at most once per 2 seconds ("2 new notifications"); focus never moves on arrival. Escape or a click
 * outside closes the panel and returns focus to the bell.
 *
 * @slot - `focsd-notification` elements, read as data.
 * @fires {Event} toggle - Fired when the panel opens or closes; read `open`. Does not bubble.
 * @fires {CustomEvent<NotificationReadDetail>} focsd-read - Fired by "Mark all as read" (every unread id) and by following an unread notification's link (its id).
 * @fires {CustomEvent<NotificationDismissDetail>} focsd-dismiss - Fired by a notification's Dismiss button.
 * @csspart trigger - The bell button.
 * @csspart icon - The bell icon.
 * @csspart badge - The unread count on the bell; hidden from assistive technology (the button's name has it).
 * @csspart panel - The dialog.
 * @csspart heading - The dialog's heading.
 * @csspart mark-all - The "Mark all as read" button, shown while any notification is unread.
 * @csspart list - The list of notifications.
 * @csspart item - One notification.
 * @csspart item-unread - An unread notification (with `item`).
 * @csspart dot - The unread mark of an unread notification.
 * @csspart tone - The icon that shows a critical, caution or positive notification's tone (a shape, so it is never only a color).
 * @csspart title - A notification's title (a link when it has `href`).
 * @csspart body - A notification's text.
 * @csspart time - A notification's relative time.
 * @csspart dismiss - A notification's Dismiss button.
 * @csspart empty - The text shown when there are no notifications.
 */
export class FocsdNotificationCenterBase extends FocsdElement {
  /** @override @type {import('lit').PropertyDeclarations} */
  static properties = {
    label: {},
    notifications: { attribute: false },
    open: { type: Boolean, reflect: true },
    max: { type: Number },
    loaded: { type: Boolean },
  };

  /** The tag of the bell button (a subclass sets its own). */
  static buttonTag = 'focsd-icon-button';

  /** The tag of each notification's time. */
  static timeTag = 'focsd-relative-time';

  /** The tag of slotted notifications read as data. */
  static itemTag = 'focsd-notification';

  #headingId = uid('focsd-notifications-heading');

  #toggle = new TriggerToggle(() => this.#panel?.matches(':popover-open') ?? false);

  #arrivals = new ArrivalAnnouncer((count) => announce(this.localize.term('notificationsNew', count), { from: this }));

  /** @type {NotificationData[]} The slotted notifications, as data. */
  #slotted = [];

  /** @type {MutationObserver | undefined} */
  #observer;

  /** Focus was in the panel when the update began. */
  #hadFocus = false;

  /** Where focus goes when the dismissed notification leaves: its index in the list. */
  #dismissedIndex = -1;
  /** A panel button removed itself (Dismiss, "Mark all as read"). Safari does not focus a clicked button, so focus is kept from this too. */
  #acted = false;

  constructor() {
    super();
    /** The name of the bell and the panel's heading; defaults to "Notifications". */
    this.label = '';
    /** @type {NotificationData[]} The notifications, newest first as the app orders them. */
    this.notifications = [];
    /** Whether the panel is open. */
    this.open = false;
    /** The largest count the badge shows; more shows as "99+". The name keeps the real count. */
    this.max = 99;
    /**
     * Set it once the first list is in (even an empty one). Notifications that arrive after that are
     * announced, including the first one in a center that started empty. Without it, the first
     * non-empty list is taken as already known and never announced.
     */
    this.loaded = false;
    routeLinks(this);
  }

  /** The notifications shown: the `notifications` array, or the slotted ones while it is empty. */
  get #list() {
    const own = cleanNotifications(this.notifications);

    return own.length ? own : cleanNotifications(this.#slotted);
  }

  get #panel() {
    return /** @type {HTMLElement | null} */ (this.renderRoot.querySelector?.('[part~="panel"]') ?? null);
  }

  get #trigger() {
    return /** @type {HTMLElement | null} */ (this.renderRoot.querySelector?.('[part~="trigger"]') ?? null);
  }

  get #heading() {
    return /** @type {HTMLElement | null} */ (this.renderRoot.querySelector?.('[part~="heading"]') ?? null);
  }

  /** @override */
  connectedCallback() {
    super.connectedCallback();
    this.#readSlotted();
    this.#observer = new MutationObserver(this.#readSlotted);
    this.#observer.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ITEM_ATTRIBUTES });
  }

  /** @override */
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#arrivals.stop();
    this.open = false;
  }

  #readSlotted = () => {
    const tag = /** @type {typeof FocsdNotificationCenterBase} */ (this.constructor).itemTag;
    this.#slotted = [...this.children].flatMap((el) => (el.localName === tag ? [fromElement(el)] : []));
    this.requestUpdate();
  };

  /** Open the panel and move focus to its heading. */
  show() {
    const panel = this.#panel;

    if (panel && !panel.matches(':popover-open')) panel.showPopover();
    this.open = true;
    this.#heading?.focus();
  }

  /** Close the panel. */
  hide() {
    const panel = this.#panel;

    if (panel?.matches(':popover-open')) panel.hidePopover();
    this.open = false;
  }

  #onTriggerDown = () => this.#toggle.press();

  #onTriggerClick = () => {
    if (this.#toggle.release()) this.hide();
    else this.show();
  };

  /** @param {ToggleEvent} event */
  #onBeforeToggle = (event) => {
    const trigger = this.#trigger;

    if (event.newState === 'closed' && focusWithin(this) && !(trigger && focusWithin(trigger))) trigger?.focus();
  };

  /** @param {ToggleEvent} event */
  #onToggle = (event) => {
    this.open = event.newState === 'open';
    this.dispatchEvent(new Event('toggle'));
  };

  /** @param {string[]} ids */
  #markAll(ids) {
    this.#acted = true;
    this.#read(ids);
  }

  /** @param {string[]} ids */
  #read(ids) {
    /** @type {NotificationReadDetail} */
    const detail = { ids };
    this.dispatchEvent(new CustomEvent('focsd-read', { bubbles: true, detail }));
  }

  /**
   * @param {NotificationData} n
   * @param {number} index
   */
  #dismiss(n, index) {
    this.#dismissedIndex = index;
    this.#acted = true;
    /** @type {NotificationDismissDetail} */
    const detail = { id: n.id };
    this.dispatchEvent(new CustomEvent('focsd-dismiss', { bubbles: true, detail }));
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  willUpdate(changed) {
    super.willUpdate(changed);
    this.#hadFocus = focusWithin(this) || this.#acted;
  }

  /** @override @param {import('lit').PropertyValues<this>} changed */
  updated(changed) {
    super.updated(changed);
    setTriggerState(this.#trigger, { expanded: this.open, haspopup: 'dialog' });
    this.#arrivals.observe(this.#list, this.loaded);
    this.#syncOpen(changed);
    this.#keepFocus();
  }

  /** @param {import('lit').PropertyValues<this>} changed */
  #syncOpen(changed) {
    if (!changed.has('open')) return;
    const showing = this.#panel?.matches(':popover-open');

    if (this.open && !showing) this.show();
    else if (!this.open && showing) this.hide();
  }

  /** Focus was in the panel and its element left (a dismissed notification, "Mark all as read"): keep it in the panel. */
  #keepFocus() {
    const index = this.#dismissedIndex;
    const active = deepActiveElement();
    const lost = this.#hadFocus && this.open && (!active || active === document.body || !focusWithin(this));

    // A button press counts for the one update that follows it.
    this.#acted = false;

    if (!lost) return;
    this.#dismissedIndex = -1;
    const item = index >= 0 ? this.renderRoot.querySelectorAll('[part~="item"]')[index] : undefined;
    const target = /** @type {HTMLElement | null} */ (item?.querySelector(FOCUSABLE) ?? this.#heading);
    target?.focus();
  }

  /**
   * The tone as a shape and as text, so it is never only a color (WCAG 1.4.1): an icon for sighted people
   * and a hidden "Error", "Warning" or "Success" for screen readers. `info` and `neutral` need neither.
   * @param {NotificationData['tone']} tone
   */
  #tone(tone) {
    const spec = TONES[/** @type {keyof typeof TONES} */ (tone ?? '')];

    if (!spec) return nothing;

    return html`<span part="tone" aria-hidden="true">${iconSvg(spec.icon)}</span><span class="focsd-visually-hidden">${this.localize.term(spec.term)}, </span>`;
  }

  /**
   * @param {NotificationData} n
   * @param {number} index
   */
  #item(n, index) {
    const time = isoTime(n.time);
    const timeTag = unsafeStatic(/** @type {typeof FocsdNotificationCenterBase} */ (this.constructor).timeTag);
    const title = n.href ? html`<a href=${n.href} @click=${() => !n.read && this.#read([n.id])}>${n.title}</a>` : n.title;
    const tone = this.#tone(n.tone);
    const unread = n.read ? nothing : html`<span class="focsd-visually-hidden">${this.localize.term('notificationUnread')}, </span>`;

    return staticHtml`<li part=${n.read ? 'item' : 'item item-unread'} data-tone=${n.tone ?? 'neutral'}>
      ${n.read ? nothing : html`<span part="dot" aria-hidden="true"></span>`}
      <p part="title">${unread}${tone}${title}</p>
      ${n.body ? html`<p part="body">${n.body}</p>` : nothing}
      ${time ? staticHtml`<${timeTag} part="time" datetime=${time}></${timeTag}>` : nothing}
      <button part="dismiss" type="button" aria-label=${this.localize.term('dismissNotificationNamed', n.title)} @click=${() => this.#dismiss(n, index)}>${iconSvg('x')}</button>
    </li>`;
  }

  /** @param {NotificationData[]} list */
  #content(list) {
    if (!list.length) return html`<p part="empty">${this.localize.term('notificationsEmpty')}</p>`;

    /* eslint-disable lit-a11y/no-redundant-role -- role="list" is not redundant: Safari drops list semantics from <ul> styled with list-style: none */
    return html`<ul part="list" role="list">
      ${repeat(
        list,
        (n) => n.id,
        (n, i) => this.#item(n, i),
      )}
    </ul>`;
    /* eslint-enable lit-a11y/no-redundant-role */
  }

  /** @override */
  render() {
    const list = this.#list;
    const unread = unreadIds(list);
    const label = this.label || this.localize.term('notifications');
    const name = unread.length ? this.localize.term('notificationsUnread', unread.length, label) : label;
    const badge = badgeText(unread.length, Number(this.max));
    const button = unsafeStatic(/** @type {typeof FocsdNotificationCenterBase} */ (this.constructor).buttonTag);

    return staticHtml`<${button} part="trigger" label=${name} @pointerdown=${this.#onTriggerDown} @click=${this.#onTriggerClick}
        >${BELL}${badge ? html`<span part="badge" aria-hidden="true">${badge}</span>` : nothing}</${button}>
      <div part="panel" role="dialog" aria-labelledby=${this.#headingId} popover="auto" @beforetoggle=${this.#onBeforeToggle} @toggle=${this.#onToggle}>
        <div class="head">
          <h2 part="heading" id=${this.#headingId} tabindex="-1">${label}</h2>
          ${unread.length ? html`<button part="mark-all" type="button" @click=${() => this.#markAll(unread)}>${this.localize.term('markAllRead')}</button>` : nothing}
        </div>
        ${this.#content(list)}
      </div>
      <slot hidden></slot>`;
  }
}
