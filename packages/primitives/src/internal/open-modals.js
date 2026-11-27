/**
 * The Focsd modals that are open now (dialog, alert dialog, drawer, bottom sheet), wherever they are,
 * including inside another component's shadow root, where a document query cannot see them. Page
 * shortcuts stay quiet while one is open that does not contain them.
 * @type {Set<Element>}
 */
export const openModals = new Set();

/**
 * Records whether `el` is an open modal.
 * @param {Element} el
 * @param {boolean} open
 */
export function trackModal(el, open) {
  if (open) openModals.add(el);
  else openModals.delete(el);
}
