// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FocsdNotificationCenterBase } from '../src/overlays/notification-center-base.js';
import { FocsdNotificationBase } from '../src/overlays/notification-base.js';
import { ARRIVAL_DELAY } from '../src/overlays/notification-model.js';

customElements.define('x-notification', FocsdNotificationBase);

customElements.define(
  'x-notification-center',
  class extends FocsdNotificationCenterBase {
    static buttonTag = 'button';
    static timeTag = 'time';
    static itemTag = 'x-notification';
  },
);

const DATA = [
  { id: 'a', title: 'Build done', body: 'main is green', time: '2026-11-25T10:00:00Z', read: false, href: '/builds/1' },
  { id: 'b', title: 'Comment', read: true },
  { id: 'c', title: 'Invite' },
];

/**
 * @param {string} [markup]
 * @param {object[]} [list]
 * @returns {Promise<any>}
 */
async function mount(markup = '<x-notification-center></x-notification-center>', list) {
  document.body.innerHTML = markup;
  const el = /** @type {any} */ (document.body.firstElementChild);

  if (list) el.notifications = list;
  await el.updateComplete;

  return el;
}

/** @param {any} el @param {string} selector */
const all = (el, selector) => [...el.shadowRoot.querySelectorAll(selector)];

/** @param {any} el @param {string} selector */
const one = (el, selector) => el.shadowRoot.querySelector(selector);

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
  document.querySelectorAll('[data-focsd-announcer]').forEach((r) => r.remove());
});

describe('notification center: trigger', () => {
  it('is named by its label with the unread count, and shows the count on the badge', async () => {
    const el = await mount(undefined, DATA);
    const trigger = one(el, '[part~="trigger"]');

    expect(trigger.getAttribute('label')).toBe('Notifications, 2 unread');
    expect(one(el, '[part~="badge"]').textContent.trim()).toBe('2');
    expect(one(el, '[part~="badge"]').getAttribute('aria-hidden')).toBe('true');
  });

  it('uses its own label, drops the badge at 0 and caps it at max', async () => {
    const el = await mount('<x-notification-center label="Alerts" max="1"></x-notification-center>', DATA);

    expect(one(el, '[part~="trigger"]').getAttribute('label')).toBe('Alerts, 2 unread');
    expect(one(el, '[part~="badge"]').textContent.trim()).toBe('1+');

    el.notifications = DATA.map((n) => ({ ...n, read: true }));
    await el.updateComplete;

    expect(one(el, '[part~="trigger"]').getAttribute('label')).toBe('Alerts');
    expect(one(el, '[part~="badge"]')).toBeNull();
  });
});

describe('notification center: panel', () => {
  it('is a dialog named by its heading, with a list of the notifications', async () => {
    const el = await mount(undefined, DATA);
    const panel = one(el, '[part~="panel"]');
    const heading = one(el, '[part~="heading"]');

    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.textContent.trim()).toBe('Notifications');
    expect(one(el, '[part~="list"]').getAttribute('role')).toBe('list');
    expect(all(el, '[part~="item"]')).toHaveLength(3);
    expect(all(el, '[part~="item-unread"]')).toHaveLength(2);
  });

  it('renders each item: title link, body, time, unread text and a named dismiss button', async () => {
    const el = await mount(undefined, DATA);
    const [first, second] = all(el, '[part~="item"]');

    expect(first.querySelector('a')?.getAttribute('href')).toBe('/builds/1');
    expect(first.textContent).toContain('main is green');
    expect(first.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-25T10:00:00.000Z');
    expect(first.querySelector('.focsd-visually-hidden')?.textContent).toContain('Unread');
    expect(first.querySelector('[part~="dismiss"]')?.getAttribute('aria-label')).toBe('Dismiss Build done');
    expect(second.querySelector('a')).toBeNull();
    expect(second.querySelector('.focsd-visually-hidden')).toBeNull();
  });

  it('shows the empty state and no mark-all button with nothing to show', async () => {
    const el = await mount();

    expect(one(el, '[part~="empty"]')?.textContent.trim()).toBe("You're all caught up");
    expect(one(el, '[part~="list"]')).toBeNull();
    expect(one(el, '[part~="mark-all"]')).toBeNull();
  });

  it('reads slotted notifications when the array is empty, and follows their changes', async () => {
    const el = await mount(
      `<x-notification-center>
        <x-notification id="n1" title="Deploy" body="Done" time="2026-11-25T09:00:00Z"></x-notification>
        <x-notification id="n2" title="Old" read></x-notification>
      </x-notification-center>`,
    );

    expect(all(el, '[part~="item"]')).toHaveLength(2);
    expect(one(el, '[part~="trigger"]').getAttribute('label')).toBe('Notifications, 1 unread');

    el.querySelector('#n1').setAttribute('read', '');
    await new Promise((r) => setTimeout(r));
    await el.updateComplete;

    expect(one(el, '[part~="trigger"]').getAttribute('label')).toBe('Notifications');
  });
});

describe('notification center: safety and tone', () => {
  it('renders an unsafe href as plain text, never as a link', async () => {
    const el = await mount(undefined, [
      { id: 'a', title: 'Bad', href: 'javascript:alert(1)' },
      { id: 'b', title: 'Worse', href: ' JaVa\tScRiPt:alert(1)' },
      { id: 'c', title: 'Good', href: 'https://example.com/x' },
      { id: 'd', title: '<img src=x onerror=alert(1)>' },
    ]);

    const links = all(el, 'a').map((a) => a.getAttribute('href'));

    expect(links).toEqual(['https://example.com/x']);
    expect(one(el, 'img')).toBeNull();
    expect(all(el, '[part~="title"]')[3].textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('says the tone with a shape and a hidden word, not only a color', async () => {
    const el = await mount(undefined, [
      { id: 'a', title: 'Failed', tone: 'critical', read: true },
      { id: 'b', title: 'Careful', tone: 'caution', read: true },
      { id: 'c', title: 'Done', tone: 'positive', read: true },
      { id: 'd', title: 'FYI', tone: 'info', read: true },
      { id: 'e', title: 'Plain', read: true },
    ]);

    const titles = all(el, '[part~="title"]');

    expect(titles[0].textContent).toContain('Error, Failed');
    expect(titles[1].textContent).toContain('Warning, Careful');
    expect(titles[2].textContent).toContain('Success, Done');
    expect(titles.slice(0, 3).every((t) => t.querySelector('[part~="tone"] svg'))).toBe(true);
    expect(titles[0].querySelector('[part~="tone"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(titles[3].querySelector('[part~="tone"]')).toBeNull();
    expect(titles[4].querySelector('[part~="tone"]')).toBeNull();
  });
});

describe('notification center: open at load', () => {
  /** happy-dom has no popover: record the calls instead. */
  /** @type {import('vitest').Mock} */
  let show;

  beforeEach(() => {
    show = vi.fn();
    Object.assign(HTMLElement.prototype, { showPopover: show, hidePopover: vi.fn() });
  });

  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
    Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
  });

  it('shows the panel when `open` is set in the markup', async () => {
    const el = await mount('<x-notification-center open></x-notification-center>', DATA);

    expect(show).toHaveBeenCalledTimes(1);
    expect(show.mock.contexts[0]).toBe(one(el, '[part~="panel"]'));
    expect(one(el, '[part~="trigger"]').getAttribute('aria-expanded')).toBe('true');
    expect(el.open).toBe(true);
  });

  it('shows the panel when `open` is set before the first render', async () => {
    document.body.innerHTML = '<x-notification-center></x-notification-center>';
    const el = /** @type {any} */ (document.body.firstElementChild);
    el.open = true;
    await el.updateComplete;

    expect(show).toHaveBeenCalledTimes(1);
  });

  it('stays closed without `open`', async () => {
    const el = await mount(undefined, DATA);

    expect(show).not.toHaveBeenCalled();
    expect(one(el, '[part~="trigger"]').getAttribute('aria-expanded')).toBe('false');
  });
});

describe('notification center: events', () => {
  it('mark all fires focsd-read with every unread id, and changes nothing itself', async () => {
    const el = await mount(undefined, DATA);
    const heard = vi.fn();
    document.addEventListener('focsd-read', heard);
    one(el, '[part~="mark-all"]').click();
    document.removeEventListener('focsd-read', heard);
    await el.updateComplete;

    expect(heard.mock.calls[0][0].detail).toEqual({ ids: ['a', 'c'] });
    expect(all(el, '[part~="item-unread"]')).toHaveLength(2);
  });

  it('following an unread title link fires focsd-read for it', async () => {
    const el = await mount(undefined, DATA);
    const heard = vi.fn();
    el.addEventListener('focsd-read', heard);
    const link = one(el, '[part~="item"] a');
    link.addEventListener('click', (/** @type {Event} */ e) => e.preventDefault());
    link.click();

    expect(heard.mock.calls[0][0].detail).toEqual({ ids: ['a'] });
  });

  it('dismiss fires focsd-dismiss with the id', async () => {
    const el = await mount(undefined, DATA);
    const heard = vi.fn();
    el.addEventListener('focsd-dismiss', heard);
    all(el, '[part~="dismiss"]')[1].click();

    expect(heard.mock.calls[0][0].detail).toEqual({ id: 'b' });
    expect(heard.mock.calls[0][0].bubbles).toBe(true);
  });
});

describe('notification center: arrivals', () => {
  it('announces rapid arrivals once, politely', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const el = await mount(undefined, DATA);

    for (const id of ['d', 'e', 'f']) {
      el.notifications = [...el.notifications, { id, title: id }];
      await el.updateComplete;
    }

    vi.advanceTimersByTime(ARRIVAL_DELAY);
    await new Promise((r) => requestAnimationFrame(r));

    const region = document.querySelector('[data-focsd-announcer="polite"]');
    expect(region?.textContent).toBe('3 new notifications');
  });

  it('does not announce the first load of an initially empty center as new', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const el = await mount();

    el.notifications = DATA;
    await el.updateComplete;
    vi.advanceTimersByTime(ARRIVAL_DELAY);
    await new Promise((r) => requestAnimationFrame(r));

    expect(document.querySelector('[data-focsd-announcer="polite"]')?.textContent ?? '').toBe('');
  });
});
