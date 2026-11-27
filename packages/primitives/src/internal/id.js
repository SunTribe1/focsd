let counter = 0;

/**
 * A document-unique id with the given prefix, for ID references inside one shadow root.
 * @param {string} prefix
 * @returns {string}
 */
export const uid = (prefix) => `${prefix}-${(counter += 1)}`;
