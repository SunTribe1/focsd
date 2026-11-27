// The text of a failed reply: the translated `ai.*` term when the message carries a known error
// code, else the transport's own (English) message, else the generic network term.

/** @typedef {import('./chat/types.js').Message} Message */

/**
 * @param {{ term: (key: string, ...args: any[]) => string }} localize
 * @param {Pick<Message, 'error' | 'errorCode'>} message
 * @returns {string}
 */
export function errorText(localize, { error, errorCode }) {
  if (errorCode === 'too-long') return localize.term('ai.errorTooLong');

  if (errorCode === 'too-large') return localize.term('ai.errorTooLarge');

  if (errorCode === 'http' && error) return localize.term('ai.errorHttp', error);

  return errorCode === 'network' || !error ? localize.term('ai.errorNetwork') : error;
}
