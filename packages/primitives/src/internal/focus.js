/** The focused element, descending through open shadow roots; null on the server (no document). */
export const deepActiveElement = () => {
  if (typeof document === 'undefined') return null;

  let active = document.activeElement;

  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;

  return active instanceof HTMLElement ? active : null;
};

/**
 * True when `node` is `host` or inside it in the composed tree (crossing any number of shadow roots).
 * @param {Node} host
 * @param {EventTarget | null | undefined} node
 * @returns {boolean}
 */
export const composedContains = (host, node) => {
  for (let n = /** @type {Node | null | undefined} */ (node); n; n = n.parentNode ?? (n instanceof ShadowRoot ? n.host : null))
    if (n === host) return true;

  return false;
};

/**
 * After an overlay closes, moves focus back to `opener` when focus was lost: nowhere, on the body, or
 * still inside the closed host (light or shadow tree). Focus the user moved elsewhere stays put.
 * @param {HTMLElement & { renderRoot: ParentNode }} host The overlay that closed.
 * @param {HTMLElement | null} opener The element focused when it opened.
 */
export const restoreFocusAfterClose = (host, opener) => {
  const active = deepActiveElement();
  // Composed containment: focus can sit inside a slotted element's own shadow root (a Focsd button).
  const lost = !active || active === document.body || composedContains(host, active);

  if (lost && opener?.isConnected) opener.focus();
};
