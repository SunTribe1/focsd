import { expect } from '@playwright/test';

/**
 * Records what a screen reader would announce from live regions: every new text of an element with
 * `aria-live` (not "off") or role status, alert or log, including inside shadow roots (attachShadow
 * is wrapped so each root, open or closed, is observed). Text is read from the flattened tree, so
 * slotted content counts. A region inserted already holding text is heard when it is assertive; text
 * in a hidden region is not heard until the region is shown; clearing a region lets the same text be
 * announced again; role and aria-live set on existing content start a region without announcing it,
 * except role alert. Call `recordAnnouncements(page)` before `page.goto`.
 */
export async function recordAnnouncements(page) {
  await page.addInitScript(() => {
    /** @type {{ text: string, politeness: string }[]} */
    const log = [];
    const last = new WeakMap();
    const roots = new WeakMap();
    const selector = '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"]';
    const watched = ['hidden', 'aria-hidden', 'role', 'aria-live'];

    const up = (node) => node.assignedSlot ?? node.parentNode ?? node.host ?? null;

    const liveRegionOf = (node) => {
      for (let current = node.nodeType === 1 ? node : up(node); current; current = up(current)) {
        if (current.nodeType === 1 && current.matches(selector)) return current;
      }

      return null;
    };

    const isHidden = (region) => {
      for (let current = region; current; current = up(current)) {
        if (current.nodeType === 1 && (current.hasAttribute('hidden') || current.getAttribute('aria-hidden') === 'true')) return true;
      }

      return false;
    };

    /** Rendered children in the flattened tree: a shadow root's, a slot's assigned nodes, or the light ones. */
    const flatChildren = (el) => {
      if (el.localName === 'slot') {
        const assigned = el.assignedNodes({ flatten: true });

        return assigned.length ? assigned : [...el.childNodes];
      }

      return [...(roots.get(el) ?? el.shadowRoot ?? el).childNodes];
    };

    const textOf = (node) => {
      if (node.nodeType === 3) return node.data;

      if (node.nodeType !== 1 || ['style', 'script', 'template'].includes(node.localName)) return '';

      if (node.hasAttribute('hidden') || node.getAttribute('aria-hidden') === 'true') return '';

      return flatChildren(node).map(textOf).join(' ');
    };

    const politenessOf = (region) => region.getAttribute('aria-live') ?? (region.getAttribute('role') === 'alert' ? 'assertive' : 'polite');

    /** Logs the region's text if it changed; `silent` only records it as the baseline. */
    const update = (region, silent = false) => {
      if (isHidden(region)) {
        last.delete(region);

        return;
      }

      const text = textOf(region).replaceAll(/\s+/g, ' ').trim();

      if (!text) last.delete(region);
      else if (last.get(region) !== text) {
        last.set(region, text);

        if (!silent) log.push({ text, politeness: politenessOf(region) });
      }
    };

    const regionsIn = (el) => [...(el.matches(selector) ? [el] : []), ...el.querySelectorAll(selector)];

    const onAttribute = (record) => {
      const el = record.target;
      const own = record.attributeName === 'role' || record.attributeName === 'aria-live';

      if (own && el.matches(selector)) update(el, el.getAttribute('role') !== 'alert');

      for (const region of regionsIn(el)) if (!own || region !== el) update(region);
    };

    const onRecord = (record) => {
      if (record.type === 'attributes') {
        onAttribute(record);

        return;
      }

      for (const node of record.addedNodes) {
        if (node.nodeType === 1) for (const region of regionsIn(node)) update(region, politenessOf(region) !== 'assertive');
      }

      // Slotted changes: the host is the target, so also look from the added nodes and in its shadow root.
      const shadow = roots.get(record.target);
      const hosted = shadow ? [...shadow.querySelectorAll(selector)] : [];
      const regions = new Set([...[...record.addedNodes, record.target].map(liveRegionOf), ...hosted]);

      for (const region of regions) if (region) update(region);
    };

    const observe = (root) =>
      new MutationObserver((records) => records.forEach(onRecord)).observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: watched,
      });

    const attach = Element.prototype.attachShadow;

    Element.prototype.attachShadow = function attachShadow(init) {
      const root = attach.call(this, init);

      roots.set(this, root);
      observe(root);

      return root;
    };

    observe(document);
    Object.defineProperty(window, '__focsdAnnouncements', { value: log });
  });
}

/** Everything announced so far. */
export const announcements = (page) => page.evaluate(() => [...window.__focsdAnnouncements]);

/** Wait until a matching announcement has been made. */
export const expectAnnounced = (page, pattern, politeness = 'polite') =>
  expect
    .poll(async () =>
      (await announcements(page)).some(
        (a) => a.politeness === politeness && (pattern instanceof RegExp ? pattern.test(a.text) : a.text.includes(pattern)),
      ),
    )
    .toBe(true);
