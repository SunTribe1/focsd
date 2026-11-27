// Events do not cross shadow roots (R6), so a message and a thread pass the events of the parts
// inside them on from their own host. This lives outside the element classes on purpose: the
// custom-elements manifest lists an element's events from the literal names in its own code, and
// the relayed names are already documented with `@fires`.

/**
 * Passes `event` on from `host`: same name and detail, bubbling and cancelable.
 * @param {HTMLElement} host
 * @param {Event} event
 * @returns {boolean} false when a listener canceled it
 */
export function relay(host, event) {
  const { detail } = /** @type {CustomEvent} */ (event);

  return host.dispatchEvent(new CustomEvent(event.type, { bubbles: true, cancelable: true, detail }));
}
