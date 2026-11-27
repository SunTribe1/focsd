/**
 * Reading page state the specs share: the deeply focused element, boxes, and events the page
 * recorded into `window`.
 */

/** @typedef {import('@playwright/test').Page} Page */

/**
 * The focused element through open shadow roots, named by its id, its shadow host's id, or its tag.
 * @param {Page} page
 */
export const deepActiveId = (page) =>
  page.evaluate(() => {
    let a = document.activeElement;

    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;

    return a?.id || a?.getRootNode()?.host?.id || a?.localName;
  });

/**
 * Like `deepActiveId`, but named by the nearest ancestor with an id (inside the focused element's
 * own tree) before its shadow host.
 * @param {Page} page
 */
export const deepActive = (page) =>
  page.evaluate(() => {
    let a = document.activeElement;

    while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;

    return a?.closest?.('[id]')?.id ?? a?.getRootNode()?.host?.id ?? a?.localName;
  });

/**
 * The locator's bounding box; throws when it has none (not rendered).
 * @param {import('@playwright/test').Locator} locator
 */
export const boxOf = async (locator) => {
  const box = await locator.boundingBox();

  if (!box) throw new Error('no bounding box');

  return box;
};

/**
 * Start recording the `types` events that `selector` dispatches on itself (not bubbled from inside).
 * @param {Page} page
 * @param {string} selector
 * @param {string[]} types
 */
export const record = (page, selector, types) =>
  page.evaluate(
    ([s, t]) => {
      window.__stateEvents = [];
      const el = document.querySelector(s);

      for (const type of t) el.addEventListener(type, (e) => e.target === el && window.__stateEvents.push(type));
    },
    [selector, types],
  );

/**
 * The event types `record` saw, in order.
 * @param {Page} page
 */
export const recorded = (page) => page.evaluate(() => window.__stateEvents);

/**
 * The events a demo page logs into `window.__ev`.
 * @param {Page} page
 */
export const ev = (page) => page.evaluate(() => window.__ev);

/**
 * Set (or, for `null`, remove) attributes on `#id` and wait for its update.
 * @param {Page} page
 * @param {string} id
 * @param {Record<string, string | null>} attrs
 */
export const set = (page, id, attrs) =>
  page.locator(`#${id}`).evaluate(async (el, a) => {
    for (const [k, v] of Object.entries(a))
      if (v === null) el.removeAttribute(k);
      else el.setAttribute(k, v);
    await el.updateComplete;
  }, attrs);

/**
 * Click the centre of an element that is disabled on purpose, as a person would. Playwright's
 * actionability check rightly never sees a disabled (or aria-disabled) target as clickable, so this
 * scrolls it into view and sends a real pointer click there instead of forcing `locator.click()`.
 * @param {import('@playwright/test').Locator} locator
 */
export const clickInert = async (locator) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await boxOf(locator);

  await locator.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2);
};
