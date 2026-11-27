/** A submit button, native or custom (both carry a `value`). @typedef {HTMLElement & { value?: string }} Submitter */

/** Custom-element submit buttons cannot be passed to requestSubmit(); record them per form instead. */
/** @type {WeakMap<HTMLFormElement, Submitter>} */
const submitters = new WeakMap();

/** Temporary native submit buttons standing in for a custom element (form* overrides). */
/** @type {WeakMap<HTMLElement, Submitter>} */
const proxies = new WeakMap();

/**
 * @param {HTMLFormElement} form
 * @param {Submitter} element
 */
export const setSubmitter = (form, element) => submitters.set(form, element);

/** @param {HTMLFormElement} form */
export const clearSubmitter = (form) => submitters.delete(form);

/**
 * @param {HTMLElement} proxy
 * @param {Submitter} element
 */
export const setSubmitterProxy = (proxy, element) => proxies.set(proxy, element);

/**
 * The element that submitted `form`: the native submitter (or the element it stands in for), else the recorded one.
 * @param {SubmitEvent} event
 * @returns {Submitter | null}
 */
export const submitterOf = (event) => {
  const native = event.submitter;

  return (native && proxies.get(native)) ?? native ?? submitters.get(/** @type {HTMLFormElement} */ (event.target)) ?? null;
};
